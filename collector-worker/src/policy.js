import app from './bootstrap.js';

const POLICY_VERSION='guardian-v1';

function isTestOrigin(request){
  const origin=String(request.headers.get('origin')||'');
  return origin==='https://olemoz1977.github.io' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function explicitQa(request){
  const url=new URL(request.url);
  return isTestOrigin(request) && url.searchParams.get('qa')==='1';
}

function mayContainInviteSecrets(pathname,method){
  if(pathname==='/api/assessments'&&method==='POST')return true;
  if(/^\/api\/manage\/[^/]+\/cycles\/\d+\/invites$/.test(pathname)&&method==='GET')return true;
  if(/^\/api\/manage\/[^/]+\/cycles$/.test(pathname)&&method==='POST')return true;
  return false;
}

async function withPolicyMarker(response){
  if(!response?.ok)return response;
  let data;
  try{data=await response.clone().json()}catch(_){return response}
  data={...data,policy:POLICY_VERSION};
  const headers=new Headers(response.headers);
  headers.set('content-type','application/json; charset=utf-8');
  headers.set('cache-control','no-store');
  return new Response(JSON.stringify(data),{status:response.status,headers});
}

async function stripInviteSecrets(response){
  if(!response?.ok)return response;
  let data;
  try{data=await response.clone().json()}catch(_){return response}
  if(!Array.isArray(data?.invites))return response;
  data.invites=data.invites.map(inv=>{
    const safe={...(inv||{})};
    delete safe.url;
    delete safe.token;
    return safe;
  });
  data.testMode=false;
  const headers=new Headers(response.headers);
  headers.set('content-type','application/json; charset=utf-8');
  headers.set('cache-control','no-store');
  return new Response(JSON.stringify(data),{status:response.status,headers});
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    let response=await app.fetch(request,env,ctx);
    if(url.pathname==='/health'&&request.method==='GET'){
      response=await withPolicyMarker(response);
    }
    if(!mayContainInviteSecrets(url.pathname,request.method))return response;
    if(explicitQa(request))return response;
    return stripInviteSecrets(response);
  }
};
