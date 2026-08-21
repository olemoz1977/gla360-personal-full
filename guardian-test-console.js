(function(){
  'use strict';
  const C=window.Leadership360Collector;
  if(!C?.qaMode?.())return;

  let auth=C.parseManageHash();
  if(!auth.assessmentId||!auth.manageToken){
    try{auth=JSON.parse(sessionStorage.getItem('leadership360_last_manage')||'null')||auth}catch(_){}
  }
  if(!auth?.assessmentId||!auth?.manageToken)return;

  const roleLt={self:'SELF',boss:'VADOVAS',peer:'KOLEGA',report:'PAVALDINYS',other:'KITAS'};
  const roleEn={self:'SELF',boss:'MANAGER',peer:'PEER',report:'DIRECT REPORT',other:'OTHER'};
  const lang=()=>document.documentElement.lang==='en'?'en':'lt';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function ensure(){
    let card=document.getElementById('qaInviteConsole');
    if(card)return card;
    const main=document.querySelector('main.wrap');
    if(!main)return null;
    card=document.createElement('section');
    card.id='qaInviteConsole';card.className='card no-print';card.style.border='1px dashed var(--warn,#b45309)';main.appendChild(card);return card;
  }

  async function render(){
    const card=ensure();if(!card)return;
    const en=lang()==='en';
    card.innerHTML=`<h2>${en?'🧪 QA test console':'🧪 QA testavimo konsolė'}</h2><p class="muted" style="font-size:.82rem">${en?'Explicit ?qa=1 test mode only. This is not a Guardian product permission and must not exist on production domains.':'Tik aiškiai įjungus ?qa=1 testavimo režimą. Tai nėra Sergėtojo produkto teisė ir produkciniuose domenuose šios funkcijos būti negali.'}</p><div id="qaInviteRows"><p class="muted">${en?'Loading test links…':'Kraunamos testavimo nuorodos…'}</p></div>`;
    try{
      const data=await C.recoverInvitesQa(auth.assessmentId,auth.cycle||1,auth.manageToken);
      const rows=(data.invites||[]).filter(x=>x.url);
      const holder=document.getElementById('qaInviteRows');
      if(!rows.length){holder.innerHTML=`<p class="muted">${en?'No manual URLs returned. The server QA policy may not be deployed yet.':'Rankinių URL serveris negrąžino. Gali būti dar neįdiegtas serverio QA režimas.'}</p>`;return}
      const roles=en?roleEn:roleLt;
      holder.innerHTML=rows.map((inv,i)=>`<div style="padding:10px 0;border-bottom:1px solid var(--border)"><div style="font-weight:700">${esc(roles[inv.role]||inv.role)} ${rows.length>1?i+1:''}</div><div class="muted" style="font-size:.78rem;margin:3px 0">${esc(inv.email||'')} · ${esc(String(inv.status||''))}</div><a class="btn secondary" href="${esc(inv.url)}" target="_blank" rel="noopener">${en?'Open QA survey ↗':'Atidaryti QA apklausą ↗'}</a></div>`).join('');
    }catch(_){const holder=document.getElementById('qaInviteRows');if(holder)holder.innerHTML=`<p class="muted">${en?'Could not load QA links.':'Nepavyko įkelti QA nuorodų.'}</p>`}
  }

  render();
  document.getElementById('langToggle')?.addEventListener('click',()=>setTimeout(render,80));
})();
