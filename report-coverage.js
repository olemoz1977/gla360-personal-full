(function(){
  'use strict';
  const C=window.Leadership360Collector;
  if(!C)return;

  let auth=C.parseManageHash();
  if(!auth.assessmentId||!auth.manageToken){
    try{auth=JSON.parse(sessionStorage.getItem('leadership360_last_manage')||'null')||auth}catch(_){}
  }
  if(!auth?.assessmentId||!auth?.manageToken)return;

  const copy={
    lt:{label:'Įvertinta',note:p=>`Stebėjimo aprėptis: ${p} % teiginių turėjo 1–5 įvertinimą. „Neteko stebėti / negaliu įvertinti“ atsakymai į vidurkius neįtraukiami.`},
    en:{label:'Rated',note:p=>`Observation coverage: ${p}% of statements received a 1–5 rating. “Not observed / cannot assess” choices are excluded from averages.`}
  };

  async function loadCoverage(){
    try{
      const [bundle,bank]=await Promise.all([
        C.exportCycle(auth.assessmentId,auth.cycle||1,auth.manageToken),
        window.GLA?.loadBank ? GLA.loadBank() : fetch('bank/questions.json?v='+Date.now(),{cache:'no-store'}).then(r=>r.json())
      ]);
      const totalItems=(bank.competencies||[]).reduce((n,c)=>n+(c.items||[]).length,0);
      const responses=bundle.responses||[];
      const expected=totalItems*responses.length;
      const rated=responses.reduce((sum,r)=>sum+Object.values(r.answers||{}).filter(v=>Number.isFinite(Number(v))&&Number(v)>=1&&Number(v)<=5).length,0);
      const pct=expected?Math.round(rated/expected*100):0;
      render(pct);
    }catch(_){}
  }

  function render(pct){
    const lang=document.documentElement.lang==='en'?'en':'lt',tx=copy[lang];
    const stats=document.getElementById('stats');
    if(stats&&stats.children.length){
      let card=document.getElementById('coverageStat');
      if(!card){card=document.createElement('div');card.id='coverageStat';card.className='stat-card';stats.appendChild(card)}
      card.innerHTML=`<div class="stat-val">${pct}%</div><div class="stat-lbl">${tx.label}</div>`;
    }
    const privacy=document.getElementById('privacyWarnings');
    if(privacy){
      let note=document.getElementById('coverageNote');
      if(!note){note=document.createElement('p');note.id='coverageNote';note.className='muted';privacy.appendChild(note)}
      note.textContent=tx.note(pct);
    }
  }

  const stats=document.getElementById('stats');
  if(stats)new MutationObserver(()=>loadCoverage()).observe(stats,{childList:true});
  setTimeout(loadCoverage,500);
})();
