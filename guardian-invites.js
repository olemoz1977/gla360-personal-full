(function(){
  'use strict';
  const C=window.Leadership360Collector;
  if(!C)return;

  let auth=C.parseManageHash();
  if(!auth.assessmentId||!auth.manageToken){
    try{auth=JSON.parse(sessionStorage.getItem('leadership360_last_manage')||'null')||auth}catch(_){}
  }
  if(!auth?.assessmentId||!auth?.manageToken)return;

  const COPY={
    lt:{
      title:'Kvietimų valdymas',
      note:'Čia visada galite grįžti prie šio ciklo kvietimų. Apklausos atidaromos naujame lange, todėl ciklo valdymas lieka atvertas.',
      open:'Atidaryti apklausą ↗',
      status:{pending:'neatidaryta',sent:'išsiųsta',opened:'atidaryta',submitting:'pateikiama',completed:'užpildyta',revoked:'atšaukta'},
      roles:{self:'SELF · Savivertinimas',boss:'VADOVAS · Vertina pavaldinį',peer:'KOLEGA · Vertina kolegą',report:'PAVALDINYS · Vertina vadovą',other:'KITAS · Darbo partneris'},
      load:'Kraunami kvietimai…',error:'Nepavyko įkelti kvietimų.'
    },
    en:{
      title:'Invitation management',
      note:'You can always return here to access this cycle’s invitations. Surveys open in a new tab, so cycle management stays open.',
      open:'Open survey ↗',
      status:{pending:'not opened',sent:'sent',opened:'opened',submitting:'submitting',completed:'completed',revoked:'revoked'},
      roles:{self:'SELF · Self-assessment',boss:'MANAGER · Rates direct report',peer:'PEER · Rates colleague',report:'DIRECT REPORT · Rates manager',other:'OTHER · Work partner'},
      load:'Loading invitations…',error:'Could not load invitations.'
    }
  };

  function lang(){return document.documentElement.lang==='en'?'en':'lt'}
  function tx(){return COPY[lang()]}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  function ensureCard(){
    let card=document.getElementById('guardianInvitesCard');
    if(card)return card;
    const cards=[...document.querySelectorAll('main.wrap > section.card')];
    const anchor=cards[1]||cards[0];
    if(!anchor)return null;
    card=document.createElement('section');
    card.className='card';
    card.id='guardianInvitesCard';
    card.innerHTML='<h2 id="guardianInvitesTitle"></h2><p id="guardianInvitesNote" class="muted"></p><div id="guardianInvitesList" style="margin-top:12px"></div>';
    anchor.insertAdjacentElement('afterend',card);
    return card;
  }

  function renderRows(invites){
    const t=tx();
    const list=document.getElementById('guardianInvitesList');
    if(!list)return;
    const order={self:0,boss:1,peer:2,report:3,other:4};
    const rows=[...(invites||[])].sort((a,b)=>(order[a.role]??9)-(order[b.role]??9));
    list.innerHTML=rows.map(inv=>{
      const role=t.roles[inv.role]||String(inv.role||'').toUpperCase();
      const state=t.status[inv.status]||inv.status||'';
      return `<div style="padding:12px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap">
          <div><strong>${esc(role)}</strong><div class="muted" style="font-size:.78rem;margin-top:3px">${esc(String(inv.language||'').toUpperCase())} · ${esc(state)}</div></div>
          <a class="btn secondary" href="${esc(inv.url)}" target="_blank" rel="noopener">${esc(t.open)}</a>
        </div>
      </div>`;
    }).join('');
  }

  async function load(){
    const card=ensureCard();
    if(!card)return;
    const t=tx();
    document.getElementById('guardianInvitesTitle').textContent=t.title;
    document.getElementById('guardianInvitesNote').textContent=t.note;
    document.getElementById('guardianInvitesList').innerHTML=`<p class="muted">${t.load}</p>`;
    try{
      const data=await C.recoverInvites(auth.assessmentId,auth.cycle||1,auth.manageToken);
      renderRows(data.invites||[]);
    }catch(_){
      document.getElementById('guardianInvitesList').innerHTML=`<p class="muted">${t.error}</p>`;
    }
  }

  load();
  const langBtn=document.getElementById('langToggle');
  if(langBtn)langBtn.addEventListener('click',()=>setTimeout(load,50));
})();
