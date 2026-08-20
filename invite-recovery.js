(function(){
  'use strict';
  const C=window.Leadership360Collector;
  const card=document.getElementById('createdCard');
  if(!C||!card)return;

  let auth=null;
  try{auth=JSON.parse(sessionStorage.getItem('leadership360_last_manage')||'null')}catch(_){}
  if(!auth?.assessmentId||!auth?.manageToken)return;

  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function recover(){
    const base=C.apiBase().replace(/\/+$/,'');
    const path='/api/manage/'+encodeURIComponent(auth.assessmentId)+'/cycles/'+Number(auth.cycle||1)+'/invites';
    let response;
    try{
      response=await fetch(base+path,{
        headers:{authorization:'Bearer '+auth.manageToken},
        cache:'no-store'
      });
    }catch(_){return}
    if(!response.ok)return;

    let data;
    try{data=await response.json()}catch(_){return}
    const gUrl=C.guardianUrl(auth);
    document.getElementById('assessmentId').textContent=auth.assessmentId;
    document.getElementById('guardianLink').textContent=gUrl;
    document.getElementById('openGuardian').href=gUrl;
    document.getElementById('copyGuardian').onclick=()=>navigator.clipboard.writeText(gUrl);
    document.getElementById('inviteList').innerHTML=(data.invites||[]).map((inv,i)=>
      `<div class="invite-item"><strong>${i+1}. ${escapeHtml(String(inv.role||'').toUpperCase())} · ${escapeHtml(String(inv.language||'').toUpperCase())}</strong><div style="font-size:.8rem;word-break:break-all;margin-top:4px"><a href="${escapeHtml(inv.url)}">${escapeHtml(inv.url)}</a></div></div>`
    ).join('');
    card.style.display='block';
  }

  setTimeout(recover,300);
})();
