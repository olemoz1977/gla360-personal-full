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
      how:'Kaip skaityti rezultatą',
      howText:'Balo lygis rodo, kaip dažnai elgesys pastebimas. Savivertinimo ir kitų vertinimo skirtumas rodo tik suvokimo sutapimą arba neatitikimą. Nulinis skirtumas savaime nereiškia gero rezultato.',
      scale:'1 Beveik niekada · 2 Retai · 3 Kartais · 4 Dažnai · 5 Beveik visada',
      high:'💪 Aukščiausi kitų vertinimai',
      low:'🎯 Žemiausi kitų vertinimai',
      level:'Vertinimo lygis',
      tied:(score,label)=>`Visų 15 gebėjimų sričių kitų vertinimas vienodas: ${score} (${label}). Nė viena sritis neišsiskiria kaip aukštesnė ar žemesnė.`,
      self:'Savivertinimas',others:'Kiti',gap:'skirtumas',
      anchors:['Beveik niekada','Retai','Kartais','Dažnai','Beveik visada']
    },
    en:{
      how:'How to read the result',
      howText:'The score level shows how often the behaviour is observed. The difference between self-assessment and others shows only perception alignment or misalignment. A zero gap does not by itself mean a strong result.',
      scale:'1 Almost never · 2 Rarely · 3 Sometimes · 4 Often · 5 Almost always',
      high:'💪 Highest ratings from others',
      low:'🎯 Lowest ratings from others',
      level:'Rating level',
      tied:(score,label)=>`All 15 competency areas have the same rating from others: ${score} (${label}). No area stands out as higher or lower.`,
      self:'Self-assessment',others:'Others',gap:'gap',
      anchors:['Almost never','Rarely','Sometimes','Often','Almost always']
    }
  };

  const lang=()=>document.documentElement.lang==='en'?'en':'lt';
  const tx=()=>COPY[lang()];
  const core=()=>typeof GLA!=='undefined'?GLA:null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const name=k=>lang()==='lt'&&core()?.lt?core().lt(k):k;
  const anchor=v=>{
    const n=Math.max(1,Math.min(5,Math.round(Number(v)||0)));
    return tx().anchors[n-1];
  };
  const fmt=v=>Number.isFinite(v)?v.toFixed(2):'—';

  function weights(){
    return {
      boss:Number(document.getElementById('wBoss')?.value)||0,
      peer:Number(document.getElementById('wPeers')?.value)||0,
      report:Number(document.getElementById('wReports')?.value)||0,
      other:Number(document.getElementById('wOthers')?.value)||0
    };
  }

  function addReadingGuide(){
    const grid=document.getElementById('strengthsTitle')?.closest('.grid2');
    if(!grid)return;
    let card=document.getElementById('scoreReadingGuide');
    if(!card){
      card=document.createElement('section');
      card.id='scoreReadingGuide';
      card.className='card';
      grid.parentElement.insertBefore(card,grid);
    }
    const t=tx();
    card.innerHTML=`<h2>${esc(t.how)}</h2><p>${esc(t.howText)}</p><p class="muted" style="font-size:.86rem">${esc(t.scale)}</p>`;
  }

  function renderRankings(agg){
    if(!agg)return;
    const t=tx(),rows=(agg.others||[]).map((o,i)=>({i,o,self:agg.means?.self?.[i],name:agg.bank?.competencies?.[i]?.name})).filter(r=>Number.isFinite(r.o));
    if(!rows.length)return;
    const vals=rows.map(r=>r.o),min=Math.min(...vals),max=Math.max(...vals);
    const s=document.getElementById('strengths'),g=document.getElementById('gaps');
    const st=document.getElementById('strengthsTitle'),gt=document.getElementById('gapsTitle');
    const sCard=st?.closest('section.card'),gCard=gt?.closest('section.card');
    if(max-min<0.01){
      if(st)st.textContent=t.level;
      if(s)s.innerHTML=`<li class="muted" style="list-style:none;margin-left:-1.2em">${esc(t.tied(fmt(max),anchor(max)))}</li>`;
      if(gCard)gCard.style.display='none';
      return;
    }
    if(gCard)gCard.style.display='';
    if(st)st.textContent=t.high;
    if(gt)gt.textContent=t.low;
    const render=r=>{
      const diff=Number.isFinite(r.self)?r.o-r.self:null;
      const d=diff===null?'':` · ${esc(t.gap)} ${diff>=0?'+':''}${diff.toFixed(2)}`;
      return `<li><strong>${esc(name(r.name))}</strong><div class="muted">${esc(t.others)} ${fmt(r.o)} (${esc(anchor(r.o))}) · ${esc(t.self)} ${fmt(r.self)}${d}</div></li>`;
    };
    const high=[...rows].sort((a,b)=>b.o-a.o).slice(0,3);
    const low=[...rows].sort((a,b)=>a.o-b.o).slice(0,3);
    if(s)s.innerHTML=high.map(render).join('');
    if(g)g.innerHTML=low.map(render).join('');
  }

  function renderAreas(agg,bank){
    const host=document.getElementById('compBars');
    if(!host||!agg)return;
    const t=tx();
    host.innerHTML=(bank.competencies||[]).map((comp,i)=>{
      const s=agg.means?.self?.[i],o=agg.others?.[i];
      const level=Number.isFinite(o)?` · ${esc(anchor(o))}`:'';
      return `<div class="bar-row"><div class="bar-label"><strong>${esc(name(comp.name))}</strong><span>${esc(t.self)} ${fmt(s)} · ${esc(t.others)} ${fmt(o)}${level}</span></div><div class="track"><div class="fill" style="width:${Number.isFinite(o)?o/5*100:0}%"></div></div></div>`;
    }).join('');
  }

  function renderClusters(agg){
    const host=document.getElementById('clusters');
    if(!host||!agg)return;
    const t=tx();
    host.innerHTML=(agg.clusterNames||[]).map((cluster,i)=>{
      const s=agg.clusterMeans?.self?.[i],o=agg.clusterMeans?.others?.[i];
      const level=Number.isFinite(o)?` · ${esc(anchor(o))}`:'';
      return `<div class="bar-row"><div class="bar-label"><strong>${esc(name(cluster))}</strong><span>${esc(t.self)} ${fmt(s)} · ${esc(t.others)} ${fmt(o)}${level}</span></div></div>`;
    }).join('');
  }

  async function apply(){
    try{
      const G=core();
      if(!G?.aggregate)return;
      const [bundle,bank]=await Promise.all([C.exportCycle(auth.assessmentId,auth.cycle||1,auth.manageToken),G.loadBank()]);
      const packs=(bundle.responses||[]).map(r=>({schema:'leadership360-response@3',aid:bundle.assessment_id,role:String(r.role||'other').toUpperCase(),answers:r.answers||{},open:r.open||{}}));
      const agg=G.aggregate(bank,packs,weights());
      addReadingGuide();
      renderRankings(agg);
      renderClusters(agg);
      renderAreas(agg,bank);
    }catch(_){}
  }

  ['loadBtn','langToggle','wBoss','wPeers','wReports','wOthers'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>setTimeout(apply,350)));
  ['wBoss','wPeers','wReports','wOthers'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(apply,350)));
  setTimeout(apply,900);
  setTimeout(apply,1800);
  setTimeout(apply,3000);
})();