import app from './bootstrap.js';

const POLICY_VERSION='guardian-v6';
const ALLOWED_ORIGINS=new Set([
  'https://olemoz1977.github.io',
  'https://2rasi.lt',
  'https://www.2rasi.lt',
  'https://2rasi.com',
  'https://www.2rasi.com',
  'https://omesg360.eu',
  'https://www.omesg360.eu'
]);

function isTestOrigin(request){
  const origin=String(request.headers.get('origin')||'');
  return origin==='https://olemoz1977.github.io' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function explicitQa(request){
  const url=new URL(request.url);
  return isTestOrigin(request) && url.searchParams.get('qa')==='1';
}

function allowedOrigin(request){
  const origin=String(request.headers.get('origin')||'');
  if(ALLOWED_ORIGINS.has(origin))return origin;
  if(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))return origin;
  return '';
}

function policyJson(request,data,status=200){
  const headers={
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store'
  };
  const origin=allowedOrigin(request);
  if(origin){
    headers['access-control-allow-origin']=origin;
    headers['vary']='Origin';
  }
  return new Response(JSON.stringify(data),{status,headers});
}

function mayContainInviteSecrets(pathname,method){
  if(pathname==='/api/assessments'&&method==='POST')return true;
  if(/^\/api\/manage\/[^/]+\/cycles\/\d+\/invites$/.test(pathname)&&method==='GET')return true;
  if(/^\/api\/manage\/[^/]+\/cycles$/.test(pathname)&&method==='POST')return true;
  return false;
}

function normaliseEmail(value){
  return String(value||'').trim().toLowerCase();
}

function createGuardianUrl(env,data,input){
  const base=String(env.PUBLIC_GUARDIAN_BASE||'https://olemoz1977.github.io/gla360-personal-full/guardian.html').trim();
  const u=new URL(base);
  u.search='';
  const q=new URLSearchParams();
  q.set('aid',String(data.assessmentId||''));
  q.set('key',String(data.manageToken||''));
  q.set('cycle',String(data.cycle||1));
  const preferred=String(input?.guardianLanguage||input?.guardian_language||input?.language||'lt').toLowerCase().startsWith('en')?'en':'lt';
  q.set('lang',preferred);
  u.hash=q.toString();
  return u.toString();
}

function guardianMailCopy(input,url){
  const leader=String(input?.leaderName||input?.leader_name||'').trim();
  const project=String(input?.projectName||input?.project_name||'').trim();
  const context=[leader?`Vertinamasis / Leader: ${leader}`:'',project?`Projektas / Project: ${project}`:''].filter(Boolean).join('\n');
  return {
    subject:'Leadership 360° | Sergėtojo prieiga / Guardian access',
    text:`Jums priskirtas Leadership 360° Sergėtojo vaidmuo.\n\n${context}\n\nAtidaryti administravimo erdvę:\n${url}\n\nŠioje nuorodoje yra asmeninis valdymo raktas. Nepersiųskite jos vertinamajam ar vertintojams. Sergėtojas administruoja tik procesą ir nemato individualių atsakymų ar vertinamojo ataskaitos.\n\n---\n\nYou have been assigned the Guardian role for a Leadership 360° assessment.\n\nOpen the administration workspace:\n${url}\n\nThis link contains your personal management key. Do not forward it to the assessed leader or evaluators. The Guardian administers the process only and cannot view individual responses or the leader report.`
  };
}

function emailProvider(env){
  if(env?.EMAIL&&env?.MAIL_FROM)return 'cloudflare';
  if(env?.RESEND_API_KEY&&env?.MAIL_FROM)return 'resend';
  return 'none';
}

async function sendViaResend(env,to,copy){
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{
      'authorization':`Bearer ${env.RESEND_API_KEY}`,
      'content-type':'application/json'
    },
    body:JSON.stringify({
      from:env.MAIL_FROM,
      to:[to],
      subject:copy.subject,
      text:copy.text
    })
  });
  if(response.ok)return;
  let detail='';
  try{detail=await response.text()}catch(_){}
  throw new Error(`resend_${response.status}${detail?':'+detail.slice(0,500):''}`);
}

function appEnvWithEmailTransport(env){
  if(env?.EMAIL || emailProvider(env)!=='resend')return env;
  return {
    ...env,
    EMAIL:{
      async send(message){
        const recipient=Array.isArray(message?.to)?message.to[0]:message?.to;
        if(!recipient)throw new Error('resend_recipient_missing');
        await sendViaResend(env,String(recipient),{
          subject:String(message?.subject||''),
          text:String(message?.text||'')
        });
      }
    }
  };
}

async function sendGuardianAccess(env,data,input){
  const guardianEmail=normaliseEmail(input?.guardianEmail||input?.guardian_email);
  if(!guardianEmail||!data?.manageToken||!data?.assessmentId){
    return {status:'invalid',provider:'none'};
  }
  const provider=emailProvider(env);
  if(provider==='none')return {status:'not_configured',provider};

  const url=createGuardianUrl(env,data,input);
  const copy=guardianMailCopy(input,url);
  try{
    if(provider==='cloudflare'){
      await env.EMAIL.send({
        from:env.MAIL_FROM,
        to:guardianEmail,
        subject:copy.subject,
        text:copy.text
      });
    }else{
      await sendViaResend(env,guardianEmail,copy);
    }
    return {status:'sent',provider};
  }catch(error){
    console.error('guardian_access_email_failed',provider,error);
    return {status:'failed',provider};
  }
}

async function sendInitialInvitations(request,env,ctx,data){
  if(!data?.assessmentId||!data?.manageToken)return {status:'invalid',sent:0,failed:0};
  try{
    const u=new URL(`/api/manage/${encodeURIComponent(data.assessmentId)}/cycles/${Number(data.cycle||1)}/send`,request.url);
    const headers=new Headers({'content-type':'application/json'});
    headers.set('authorization','Bearer '+data.manageToken);
    const origin=request.headers.get('origin');
    if(origin)headers.set('origin',origin);
    const sendRequest=new Request(u.toString(),{method:'POST',headers,body:'{}'});
    const sendResponse=await app.fetch(sendRequest,appEnvWithEmailTransport(env),ctx);
    let result={};
    try{result=await sendResponse.clone().json()}catch(_){}
    if(!sendResponse.ok){
      console.error('initial_invitation_send_failed',sendResponse.status,result);
      return {status:'failed',sent:Number(result?.sent||0),failed:Number(result?.failed||0),error:result?.error||`http_${sendResponse.status}`};
    }
    return {status:Number(result?.failed||0)>0?'partial':'sent',sent:Number(result?.sent||0),failed:Number(result?.failed||0)};
  }catch(error){
    console.error('initial_invitation_send_failed',error);
    return {status:'failed',sent:0,failed:0,error:error instanceof Error?error.message:String(error)};
  }
}

async function cleanupFailedAssessment(request,env,ctx,data){
  if(!data?.assessmentId||!data?.manageToken)return false;
  try{
    const u=new URL('/api/manage/'+encodeURIComponent(data.assessmentId),request.url);
    const headers=new Headers();
    headers.set('authorization','Bearer '+data.manageToken);
    const origin=request.headers.get('origin');
    if(origin)headers.set('origin',origin);
    const cleanupRequest=new Request(u.toString(),{method:'DELETE',headers});
    const cleanupResponse=await app.fetch(cleanupRequest,appEnvWithEmailTransport(env),ctx);
    return cleanupResponse.ok;
  }catch(error){
    console.error('guardian_delivery_cleanup_failed',error);
    return false;
  }
}

async function withPolicyMarker(response,env){
  if(!response?.ok)return response;
  let data;
  try{data=await response.clone().json()}catch(_){return response}
  const provider=emailProvider(env);
  data={
    ...data,
    policy:POLICY_VERSION,
    guardianEmailReady:provider!=='none',
    guardianEmailProvider:provider,
    invitationEmailReady:provider!=='none',
    invitationEmailProvider:provider
  };
  const headers=new Headers(response.headers);
  headers.set('content-type','application/json; charset=utf-8');
  headers.set('cache-control','no-store');
  return new Response(JSON.stringify(data),{status:response.status,headers});
}

async function withCreateDelivery(response,guardianDelivery,invitationDelivery){
  if(!response?.ok)return response;
  let data;
  try{data=await response.clone().json()}catch(_){return response}
  data={
    ...data,
    guardianDelivery:guardianDelivery?.status||'unknown',
    guardianEmailProvider:guardianDelivery?.provider||'none',
    invitationDelivery:invitationDelivery?.status||'unknown',
    invitationsSent:Number(invitationDelivery?.sent||0),
    invitationsFailed:Number(invitationDelivery?.failed||0)
  };
  const headers=new Headers(response.headers);
  headers.set('content-type','application/json; charset=utf-8');
  headers.set('cache-control','no-store');
  return new Response(JSON.stringify(data),{status:response.status,headers});
}

async function stripSecrets(response,{stripManageToken=false}={}){
  if(!response?.ok)return response;
  let data;
  try{data=await response.clone().json()}catch(_){return response}
  if(Array.isArray(data?.invites)){
    data.invites=data.invites.map(inv=>{
      const safe={...(inv||{})};
      delete safe.url;
      delete safe.token;
      return safe;
    });
  }
  if(stripManageToken)delete data.manageToken;
  data.testMode=false;
  const headers=new Headers(response.headers);
  headers.set('content-type','application/json; charset=utf-8');
  headers.set('cache-control','no-store');
  return new Response(JSON.stringify(data),{status:response.status,headers});
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const isCreate=url.pathname==='/api/assessments'&&request.method==='POST';
    let createInput=null;

    if(isCreate){
      try{createInput=await request.clone().json()}catch(_){}
      const guardianEmail=normaliseEmail(createInput?.guardianEmail||createInput?.guardian_email);
      const selfEmail=normaliseEmail((createInput?.roster||[]).find(row=>String(row?.role||'').toLowerCase()==='self')?.email);
      if(guardianEmail&&selfEmail&&guardianEmail===selfEmail){
        return policyJson(request,{ok:false,error:'guardian_cannot_be_leader'},400);
      }
      if(!explicitQa(request)&&emailProvider(env)==='none'){
        return policyJson(request,{ok:false,error:'guardian_delivery_not_configured'},503);
      }
    }

    const appEnv=appEnvWithEmailTransport(env);
    let response=await app.fetch(request,appEnv,ctx);

    if(url.pathname==='/health'&&request.method==='GET'){
      response=await withPolicyMarker(response,env);
    }

    if(isCreate&&response.ok){
      let raw;
      try{raw=await response.clone().json()}catch(_){}
      const guardianDelivery=await sendGuardianAccess(env,raw,createInput);
      if(!explicitQa(request)&&guardianDelivery.status!=='sent'){
        const cleaned=await cleanupFailedAssessment(request,env,ctx,raw);
        return policyJson(request,{
          ok:false,
          error:cleaned?'guardian_delivery_failed':'guardian_delivery_failed_cleanup_failed',
          guardianEmailProvider:guardianDelivery.provider||emailProvider(env)
        },cleaned?502:500);
      }
      const invitationDelivery=await sendInitialInvitations(request,env,ctx,raw);
      response=await withCreateDelivery(response,guardianDelivery,invitationDelivery);
    }

    if(!mayContainInviteSecrets(url.pathname,request.method))return response;
    if(explicitQa(request))return response;
    return stripSecrets(response,{stripManageToken:isCreate});
  }
};
