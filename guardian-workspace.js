(function(){
  'use strict';
  const C=window.Leadership360Collector;
  if(!C)return;

  const KEY='leadership360_guardian_workspace_v1';

  function cleanText(value,max=180){return String(value??'').trim().slice(0,max)}
  function read(){
    try{
      const data=JSON.parse(localStorage.getItem(KEY)||'[]');
      if(!Array.isArray(data))return [];
      return data.filter(x=>x&&x.assessmentId&&x.manageToken);
    }catch(_){return []}
  }
  function write(items){
    try{localStorage.setItem(KEY,JSON.stringify(items))}catch(_){}
    return items;
  }
  function register(auth,meta={}){
    if(!auth?.assessmentId||!auth?.manageToken)return null;
    const items=read();
    const i=items.findIndex(x=>x.assessmentId===auth.assessmentId);
    const previous=i>=0?items[i]:{};
    const next={
      ...previous,
      assessmentId:auth.assessmentId,
      manageToken:auth.manageToken,
      cycle:Math.max(1,Number(auth.cycle||previous.cycle||1)||1),
      lang:C.normaliseLang(auth.lang||previous.lang||'lt'),
      leaderName:cleanText(meta.leaderName||previous.leaderName||''),
      projectName:cleanText(meta.projectName||previous.projectName||''),
      guardianName:cleanText(meta.guardianName||previous.guardianName||''),
      createdAt:meta.createdAt||previous.createdAt||'',
      updatedAt:new Date().toISOString()
    };
    if(i>=0)items[i]=next;else items.unshift(next);
    write(items);
    return next;
  }
  function remove(assessmentId){return write(read().filter(x=>x.assessmentId!==assessmentId))}
  function clear(){try{localStorage.removeItem(KEY)}catch(_){} return []}
  function currentAuth(){
    let auth=C.parseManageHash();
    if(auth?.assessmentId&&auth?.manageToken)return auth;
    try{
      const x=JSON.parse(sessionStorage.getItem('leadership360_last_manage')||'null');
      if(x?.assessmentId&&x?.manageToken)return x;
    }catch(_){}
    return null;
  }
  function dashboardUrl(){return new URL('guardian-dashboard.html',location.href).toString()}

  window.Leadership360Workspace={key:KEY,list:read,register,remove,clear,currentAuth,dashboardUrl};

  function addTopLink(){
    if(document.getElementById('guardianWorkspaceLink'))return;
    const top=document.querySelector('.topbar');
    if(!top)return;
    const a=document.createElement('a');
    a.id='guardianWorkspaceLink';
    a.className='btn secondary';
    a.href=dashboardUrl();
    a.textContent=document.documentElement.lang==='en'?'Workspace':'Darbo stalas';
    a.style.marginRight='8px';
    top.insertBefore(a,top.firstChild);
  }

  async function enrichGuardian(auth){
    if(!auth?.assessmentId||!auth?.manageToken)return;
    register(auth);
    try{
      const data=await C.recoverInvites(auth.assessmentId,auth.cycle||1,auth.manageToken);
      register(auth,{
        leaderName:data.leaderName||'',
        projectName:data.projectName||'',
        guardianName:data.guardianName||'',
        createdAt:data.createdAt||''
      });
    }catch(_){}
  }

  function setupRegistration(){
    addTopLink();
    const card=document.getElementById('createdCard');
    if(!card)return;
    const apply=()=>{
      if(getComputedStyle(card).display==='none')return;
      const auth=currentAuth();
      if(!auth)return;
      register(auth,{
        leaderName:document.getElementById('leaderName')?.value||'',
        projectName:document.getElementById('projectName')?.value||'',
        guardianName:document.getElementById('guardianName')?.value||''
      });
      const actions=document.getElementById('openGuardian')?.parentElement;
      if(actions&&!document.getElementById('openWorkspaceFromSetup')){
        const a=document.createElement('a');
        a.id='openWorkspaceFromSetup';
        a.className='btn secondary';
        a.href=dashboardUrl();
        a.textContent=document.documentElement.lang==='en'?'Open workspace →':'Atidaryti darbo stalą →';
        actions.appendChild(a);
      }
    };
    new MutationObserver(apply).observe(card,{attributes:true,attributeFilter:['style','class']});
    setTimeout(apply,400);setTimeout(apply,1000);
  }

  function guardianRegistration(){
    addTopLink();
    const sync=()=>{
      const auth=currentAuth();
      if(auth){
        try{sessionStorage.setItem('leadership360_last_manage',JSON.stringify(auth))}catch(_){}
        enrichGuardian(auth);
      }
    };
    sync();
    window.addEventListener('hashchange',()=>setTimeout(sync,50));
  }

  function fixDashboardMobile(){
    if(document.getElementById('workspaceMobileFix'))return;
    const style=document.createElement('style');
    style.id='workspaceMobileFix';
    style.textContent=`
      .controls label{min-width:0;display:block}
      .controls input,.controls select{box-sizing:border-box;width:100%;max-width:100%;min-width:0;display:block;margin-top:6px}
      @media(max-width:700px){.controls{grid-template-columns:minmax(0,1fr)!important}.controls input,.controls select{width:100%!important}}
    `;
    document.head.appendChild(style);
  }

  if(/\/setup-v2\.html$/i.test(location.pathname))setupRegistration();
  if(/\/guardian\.html$/i.test(location.pathname))guardianRegistration();
  if(/\/guardian-dashboard\.html$/i.test(location.pathname)){
    const auth=currentAuth();
    if(auth)register(auth);
    fixDashboardMobile();
  }
})();
