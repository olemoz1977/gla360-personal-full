(function(){
  'use strict';
  const C=window.Leadership360Collector;
  if(!C)return;

  let auth=C.parseManageHash();
  if(!auth.assessmentId||!auth.manageToken){
    try{auth=JSON.parse(sessionStorage.getItem('leadership360_last_manage')||'null')||auth}catch(_){}
  }
  if(!auth?.assessmentId||!auth?.manageToken)return;

  function apply(){
    const link=document.getElementById('planLink');
    if(!link)return;
    const url=new URL('plan.html',location.href);
    url.search='';
    url.hash=C.manageHash(auth);
    link.href=url.toString();
  }

  apply();
  setTimeout(apply,400);
  setTimeout(apply,1200);
})();