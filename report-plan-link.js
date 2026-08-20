(function(){
  'use strict';
  const C=window.Leadership360Collector;
  if(!C)return;

  let auth=C.parseManageHash();
  if(!auth.assessmentId||!auth.manageToken){
    try{auth=JSON.parse(sessionStorage.getItem('leadership360_last_manage')||'null')||auth}catch(_){}
  }
  if(!auth?.assessmentId||!auth?.manageToken)return;

  function persist(){
    try{sessionStorage.setItem('leadership360_last_manage',JSON.stringify(auth))}catch(_){}
  }

  function apply(){
    persist();
    const link=document.getElementById('planLink');
    if(!link)return;
    const url=new URL('plan.html',location.href);
    url.search='';
    url.hash=C.manageHash(auth);
    link.href=url.toString();
    if(!link.dataset.contextWired){
      link.dataset.contextWired='1';
      link.addEventListener('click',persist,{capture:true});
    }
  }

  apply();
  setTimeout(apply,250);
  setTimeout(apply,700);
  setTimeout(apply,1500);
})();