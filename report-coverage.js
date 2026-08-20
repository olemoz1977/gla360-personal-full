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
      rated:'Įvertinta',
      self:'Savivertinimas',
      others:'Kiti',
      radar:'Radaras: savivertinimas ir kitų vertinimas',
      radarMobile:'Mobiliajame ekrane ašių pavadinimai paslėpti, kad diagrama būtų įskaitoma. Visos gebėjimų sritys pateiktos žemiau.',
      clusters:'5 lyderystės sričių vidurkiai',
      areas:'15 gebėjimų sričių',
      strengths:'💪 Kiti vertina aukščiau',
      gaps:'🎯 Kiti vertina žemiau',
      noPositive:'Nėra sričių, kuriose kitų vertinimas būtų aukštesnis už savivertinimą.',
      noNegative:'Nėra sričių, kuriose kitų vertinimas būtų žemesnis už savivertinimą.',
      coverage:p=>`Stebėjimo aprėptis: ${p} % teiginių turėjo 1–5 įvertinimą. Pasirinkimai „negaliu įvertinti“ į vidurkius neįtraukiami.`,
      noSelf:'⚠️ Nėra savivertinimo atsakymo, todėl palyginimas nepilnas.',
      peerWarn:'⚠️ Kolegų grupėje mažiau nei 3 atsakymai. Ji per maža atskiram anoniminiam interpretavimui.',
      reportWarn:'⚠️ Pavaldinių grupėje mažiau nei 3 atsakymai. Ji per maža atskiram anoniminiam interpretavimui.',
      otherWarn:'⚠️ Grupėje „Kiti“ yra tik 1 atsakymas. Ji per maža atskiram anoniminiam interpretavimui.',
      bossInfo:'ℹ️ Vadovo vertinimas yra individualus ir savaime nėra anoniminė grupė.',
      noAnon:'ℹ️ Šiame cikle nėra anoniminės vertintojų grupės, kuriai būtų taikoma minimalaus dydžio riba.',
      anonOk:'✓ Esamos anoniminės vertintojų grupės atitinka minimalaus dydžio ribas.',
      transition:'Apibendrintas JSON lieka atsarginiu / perėjimo formatu. Įprastai ataskaita ciklą skaito tiesiai iš saugaus surinkimo sluoksnio.',
      weights:{boss:'Vadovas',peer:'Kolegos',report:'Pavaldiniai',other:'Kiti'},
      safe:{self:'Savivertinimas',boss:'Vadovas',peer:'Kolegos',report:'Pavaldiniai',other:'Kiti',merged:'Kiti'},
      strengthType:'Stiprybės',developType:'Tobulinti',noComments:'Atvirų komentarų nėra.'
    },
    en:{
      rated:'Rated',
      self:'Self-assessment',
      others:'Others',
      radar:'Radar: self-assessment vs others',
      radarMobile:'Axis labels are hidden on mobile to keep the chart readable. All competency areas are listed below.',
      clusters:'5 leadership cluster averages',
      areas:'15 competency areas',
      strengths:'💪 Others rate higher',
      gaps:'🎯 Others rate lower',
      noPositive:'There are no areas where others rate higher than the self-assessment.',
      noNegative:'There are no areas where others rate lower than the self-assessment.',
      coverage:p=>`Observation coverage: ${p}% of statements received a 1–5 rating. “Cannot assess” choices are excluded from averages.`,
      noSelf:'⚠️ The self-assessment response is missing, so the comparison is incomplete.',
      peerWarn:'⚠️ The peer group has fewer than 3 responses and is too small for separate anonymous interpretation.',
      reportWarn:'⚠️ The direct-report group has fewer than 3 responses and is too small for separate anonymous interpretation.',
      otherWarn:'⚠️ The “Other” group has only 1 response and is too small for separate anonymous interpretation.',
      bossInfo:'ℹ️ A manager rating is individual and is not an anonymous group by nature.',
      noAnon:'ℹ️ This cycle contains no anonymous rater group to which a minimum group-size threshold applies.',
      anonOk:'✓ Existing anonymous rater groups meet the minimum group-size thresholds.',
      transition:'Aggregate JSON remains a fallback / transition format. Normally the report reads the cycle directly from the secure collection layer.',
      weights:{boss:'Manager',peer:'Peers',report:'Direct reports',other:'Others'},
      safe:{self:'Self-assessment',boss:'Manager',peer:'Peers',report:'Direct reports',other:'Others',merged:'Others'},
      strengthType:'Strength',developType:'Develop',noComments:'No open comments.'
    }
  };

  let timer=0;
  let busy=false;
  const lang=()=>document.documentElement.lang==='en'?'en':'lt';
  const tx=()=>COPY[lang()];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const core=()=>typeof GLA!=='undefined'?GLA:null;
  const name=key=>lang()==='lt'&&core()?.lt?core().lt(key):key;

  function currentWeights(){
    return {
      boss:Number(document.getElementById('wBoss')?.value)||0,
      peer:Number(document.getElementById('wPeers')?.value)||0,
      report:Number(document.getElementById('wReports')?.value)||0,
      other:Number(document.getElementById('wOthers')?.value)||0
    };
  }

  function counts(bundle){
    const out={self:0,boss:0,peer:0,report:0,other:0};
    (bundle.responses||[]).forEach(r=>{if(out[r.role]!==undefined)out[r.role]++});
    return out;
  }

  function aggregate(bundle,bank){
    const G=core();
    if(!G?.aggregate)return null;
    const packs=(bundle.responses||[]).map(r=>({
      schema:'leadership360-response@3',
      aid:bundle.assessment_id,
      role:String(r.role||'other').toUpperCase(),
      answers:r.answers||{},
      open:r.open||{}
    }));
    return G.aggregate(bank,packs,currentWeights());
  }

  function coverage(bundle,bank){
    const totalItems=(bank.competencies||[]).reduce((n,c)=>n+(c.items||[]).length,0);
    const responses=bundle.responses||[];
    const expected=totalItems*responses.length;
    const rated=responses.reduce((sum,r)=>sum+Object.values(r.answers||{}).filter(v=>Number.isFinite(Number(v))&&Number(v)>=1&&Number(v)<=5).length,0);
    return expected?Math.round(rated/expected*100):0;
  }

  function renderStats(pct){
    const stats=document.getElementById('stats');
    if(!stats||!stats.children.length)return;
    const t=tx();
    if(stats.children[1]?.querySelector('.stat-lbl'))stats.children[1].querySelector('.stat-lbl').textContent=t.self;
    if(stats.children[2]?.querySelector('.stat-lbl'))stats.children[2].querySelector('.stat-lbl').textContent=t.others;
    let card=document.getElementById('coverageStat');
    if(!card){card=document.createElement('div');card.id='coverageStat';card.className='stat-card';stats.appendChild(card)}
    card.innerHTML=`<div class="stat-val">${pct}%</div><div class="stat-lbl">${esc(t.rated)}</div>`;
  }

  function renderPrivacy(c,pct){
    const t=tx(),privacy=document.getElementById('privacyWarnings');
    if(!privacy)return;
    const notes=[];
    if(c.self<1)notes.push(t.noSelf);
    if(c.peer>0&&c.peer<3)notes.push(t.peerWarn);
    if(c.report>0&&c.report<3)notes.push(t.reportWarn);
    if(c.other===1)notes.push(t.otherWarn);
    const anonPresent=c.peer>0||c.report>0||c.other>0;
    const anonWarnings=(c.peer>0&&c.peer<3)||(c.report>0&&c.report<3)||c.other===1;
    if(anonPresent&&!anonWarnings)notes.push(t.anonOk);
    if(!anonPresent)notes.push(t.noAnon);
    if(c.boss>0)notes.push(t.bossInfo);
    notes.push(t.coverage(pct));
    privacy.innerHTML=notes.map((n,i)=>`<p${i===notes.length-1?' class="muted"':''}>${esc(n)}</p>`).join('');
  }

  function renderWeights(c){
    const t=tx();
    [['boss','wBoss','wBossLabel'],['peer','wPeers','wPeersLabel'],['report','wReports','wReportsLabel'],['other','wOthers','wOthersLabel']].forEach(([role,inputId,labelId])=>{
      const input=document.getElementById(inputId),label=document.getElementById(labelId);
      if(label)label.textContent=`${t.weights[role]} (n=${c[role]})`;
      if(input){
        input.disabled=c[role]===0;
        const holder=input.closest('label');
        if(holder)holder.style.opacity=c[role]===0?'.55':'1';
      }
    });
  }

  function renderClusters(agg){
    const host=document.getElementById('clusters');
    if(!host||!agg)return;
    const t=tx();
    const title=document.getElementById('clustersTitle');
    if(title)title.textContent=t.clusters;
    host.innerHTML=(agg.clusterNames||[]).map((cluster,i)=>{
      const s=agg.clusterMeans?.self?.[i],o=agg.clusterMeans?.others?.[i];
      return `<div class="bar-row"><div class="bar-label"><strong>${esc(name(cluster))}</strong><span>${esc(t.self)} ${s!==null&&s!==undefined?s.toFixed(2):'—'} · ${esc(t.others)} ${o!==null&&o!==undefined?o.toFixed(2):'—'}</span></div></div>`;
    }).join('');
  }

  function renderDifferences(agg){
    if(!agg)return;
    const t=tx(),eps=.005;
    const diffs=(agg.diffs||[]).filter(v=>Number.isFinite(v.diff));
    const higher=[...diffs].filter(v=>v.diff>eps).sort((a,b)=>b.diff-a.diff).slice(0,3);
    const lower=[...diffs].filter(v=>v.diff<-eps).sort((a,b)=>a.diff-b.diff).slice(0,3);
    const s=document.getElementById('strengths'),g=document.getElementById('gaps');
    const st=document.getElementById('strengthsTitle'),gt=document.getElementById('gapsTitle');
    if(st)st.textContent=t.strengths;if(gt)gt.textContent=t.gaps;
    if(s)s.innerHTML=higher.length?higher.map(v=>`<li><strong>${esc(name(v.name))}</strong> <span class="muted">+${v.diff.toFixed(2)}</span></li>`).join(''):`<li class="muted" style="list-style:none;margin-left:-1.2em">${esc(t.noPositive)}</li>`;
    if(g)g.innerHTML=lower.length?lower.map(v=>`<li><strong>${esc(name(v.name))}</strong> <span class="muted">${v.diff.toFixed(2)}</span></li>`).join(''):`<li class="muted" style="list-style:none;margin-left:-1.2em">${esc(t.noNegative)}</li>`;
  }

  function renderBars(agg,bank){
    const host=document.getElementById('compBars');
    if(!host||!agg)return;
    const t=tx();
    const title=document.getElementById('areasTitle');
    if(title)title.textContent=t.areas;
    host.innerHTML=(bank.competencies||[]).map((comp,i)=>{
      const s=agg.means.self[i],o=agg.others[i];
      return `<div class="bar-row"><div class="bar-label"><strong>${esc(name(comp.name))}</strong><span>${esc(t.self)} ${s!==null?s.toFixed(2):'—'} · ${esc(t.others)} ${o!==null?o.toFixed(2):'—'}</span></div><div class="track"><div class="fill" style="width:${o!==null?o/5*100:0}%"></div></div></div>`;
    }).join('');
  }

  function renderComments(agg,c){
    const host=document.getElementById('comments');
    if(!host||!agg)return;
    const t=tx();
    const safe=r=>r==='self'?t.safe.self:r==='boss'?t.safe.boss:(r==='peer'&&c.peer>=3)?t.safe.peer:(r==='report'&&c.report>=3)?t.safe.report:(r==='other'&&c.other>=2)?t.safe.other:t.safe.merged;
    const items=agg.comments||[];
    host.innerHTML=items.length?items.map(v=>`<div class="comment"><strong>${esc(safe(v.role))}</strong> · <span class="muted">${esc(v.type==='strengths'?t.strengthType:t.developType)}</span><div style="margin-top:4px">${esc(v.text)}</div></div>`).join(''):`<p class="muted">${esc(t.noComments)}</p>`;
  }

  function renderRadar(){
    const t=tx(),title=document.getElementById('radarTitle');
    if(title)title.textContent=t.radar;
    const chart=window.Chart?.getChart?.('radar');
    if(!chart)return;
    if(chart.data?.datasets?.[0])chart.data.datasets[0].label=t.self;
    if(chart.data?.datasets?.[1])chart.data.datasets[1].label=t.others;
    chart.options.scales=chart.options.scales||{};
    chart.options.scales.r=chart.options.scales.r||{};
    chart.options.scales.r.pointLabels={...(chart.options.scales.r.pointLabels||{}),display:window.innerWidth>700,font:{size:11}};
    chart.update('none');
    const canvas=document.getElementById('radar');
    if(canvas?.parentElement){
      let note=document.getElementById('radarMobileNote');
      if(!note){note=document.createElement('p');note.id='radarMobileNote';note.className='muted';note.style.cssText='font-size:.78rem;line-height:1.4;margin-top:8px';canvas.parentElement.appendChild(note)}
      note.textContent=window.innerWidth<=700?t.radarMobile:'';
      note.style.display=window.innerWidth<=700?'block':'none';
    }
  }

  function renderTransition(){
    const el=document.getElementById('transitionNote');
    if(el)el.textContent=tx().transition;
  }

  async function apply(){
    if(busy)return;
    busy=true;
    try{
      const G=core();
      const [bundle,bank]=await Promise.all([
        C.exportCycle(auth.assessmentId,auth.cycle||1,auth.manageToken),
        G?.loadBank?G.loadBank():fetch('bank/questions.json?v='+Date.now(),{cache:'no-store'}).then(r=>r.json())
      ]);
      if(!(bundle.responses||[]).length)return;
      const c=counts(bundle),pct=coverage(bundle,bank),agg=aggregate(bundle,bank);
      const safeRun=fn=>{try{fn()}catch(e){console.warn('report enhancement',e)}};
      safeRun(()=>renderStats(pct));
      safeRun(()=>renderPrivacy(c,pct));
      safeRun(()=>renderWeights(c));
      safeRun(()=>renderClusters(agg));
      safeRun(()=>renderDifferences(agg));
      safeRun(()=>renderBars(agg,bank));
      safeRun(()=>renderComments(agg,c));
      safeRun(()=>renderRadar());
      safeRun(()=>renderTransition());
    }catch(e){console.warn('report enhancement load',e)}finally{busy=false}
  }

  function schedule(delay=60){
    clearTimeout(timer);
    timer=setTimeout(apply,delay);
  }

  const stats=document.getElementById('stats');
  if(stats)new MutationObserver(()=>schedule(80)).observe(stats,{childList:true});
  ['wBoss','wPeers','wReports','wOthers','langToggle','loadBtn'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>schedule(140)));
  ['wBoss','wPeers','wReports','wOthers'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>schedule(140)));
  window.addEventListener('resize',()=>schedule(120));
  [450,900,1600,2800].forEach(ms=>setTimeout(apply,ms));
})();