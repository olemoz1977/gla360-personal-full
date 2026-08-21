(function(){
  'use strict';
  const C=window.Leadership360Collector;
  const card=document.getElementById('createdCard');
  if(!C||!card||!C.qaMode?.())return;

  let auth=null;
  try{auth=JSON.parse(sessionStorage.getItem('leadership360_last_manage')||'null')}catch(_){}
  if(!auth?.assessmentId||!auth?.manageToken)return;

  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ORDER={self:0,boss:1,peer:2,report:3,other:4};
  const ROLE_COPY={
    lt:{self:{title:'SELF',desc:'Savivertinimas – lyderis vertina save',open:'Atidaryti savivertinimą ↗'},boss:{title:'VADOVAS',desc:'Vadovas vertina savo pavaldinį',open:'Atidaryti vadovo vertinimą ↗'},peer:{title:'KOLEGA',desc:'Kolega vertina kolegą',open:'Atidaryti kolegos vertinimą ↗'},report:{title:'PAVALDINYS',desc:'Pavaldinys vertina savo vadovą',open:'Atidaryti pavaldinio vertinimą ↗'},other:{title:'KITAS',desc:'Darbo partneris vertina lyderį',open:'Atidaryti vertinimą ↗'}},
    en:{self:{title:'SELF',desc:'Self-assessment – the leader rates themselves',open:'Open self-assessment ↗'},boss:{title:'MANAGER',desc:'The manager rates their direct report',open:'Open manager assessment ↗'},peer:{title:'PEER',desc:'A peer rates their colleague',open:'Open peer assessment ↗'},report:{title:'DIRECT REPORT',desc:'A direct report rates their manager',open:'Open direct-report assessment ↗'},other:{title:'OTHER',desc:'A work partner rates the leader',open:'Open assessment ↗'}}
  };

  function currentLang(){return document.documentElement.lang==='en'?'en':'lt'}

  async function recover(){
    let data;
    try{data=await C.recoverInvitesQa(auth.assessmentId,auth.cycle||1,auth.manageToken)}catch(_){return}
    const gUrl=C.guardianUrl(auth);
    document.getElementById('assessmentId').textContent=auth.assessmentId;
    document.getElementById('guardianLink').textContent=gUrl;
    document.getElementById('openGuardian').href=gUrl;
    document.getElementById('copyGuardian').onclick=()=>navigator.clipboard.writeText(gUrl);

    const lang=currentLang(),copy=ROLE_COPY[lang];
    const invites=[...(data.invites||[])].filter(inv=>inv.url).sort((a,b)=>(ORDER[a.role]??99)-(ORDER[b.role]??99));
    document.getElementById('inviteList').innerHTML=invites.map((inv,i)=>{
      const role=copy[inv.role]||{title:String(inv.role||'').toUpperCase(),desc:'',open:lang==='lt'?'Atidaryti vertinimą ↗':'Open assessment ↗'};
      return `<div class="invite-item"><strong>${i+1}. ${escapeHtml(role.title)} · ${escapeHtml(String(inv.language||'').toUpperCase())}</strong><div class="muted" style="font-size:.78rem;margin-top:3px">${escapeHtml(role.desc)}</div><div style="margin-top:8px"><a class="btn secondary" target="_blank" rel="noopener" href="${escapeHtml(inv.url)}">${escapeHtml(role.open)}</a></div><details style="margin-top:8px"><summary class="muted" style="font-size:.75rem;cursor:pointer">${lang==='lt'?'Rodyti techninę nuorodą':'Show technical link'}</summary><div style="font-size:.72rem;word-break:break-all;margin-top:4px"><a target="_blank" rel="noopener" href="${escapeHtml(inv.url)}">${escapeHtml(inv.url)}</a></div></details></div>`;
    }).join('');
    card.style.display='block';
  }

  setTimeout(recover,300);
})();
