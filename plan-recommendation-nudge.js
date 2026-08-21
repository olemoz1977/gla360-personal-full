(function(){
  'use strict';

  const C=window.Leadership360Collector;
  if(!C)return;

  let userTouched=false;
  let recommendationNames=[];
  let applied=false;

  const copy={
    lt:{
      title:'Duomenų rekomendacija',
      intro:'Sistema nesiūlo tiesiog lengviausio ar pažįstamiausio pasirinkimo. Ji žiūri į kelis signalus kartu. Tai orientyras, ne automatinis sprendimas.',
      include:'Rekomenduojame bent vieną iš šių sričių įtraukti į planą. Likusias galite pasirinkti pagal savo darbo kontekstą.',
      weakEvidence:'Šiame cikle „kitų“ signalą sudaro tik vieno vertintojo grupė, todėl rekomendaciją vertinkite kaip kryptį, o ne tvirtą konsensusą.',
      multiEvidence:n=>`Šiame cikle „kitų“ signalą sudaro ${n} vertintojų grupės. Kai kelių grupių signalai sutampa, rekomendacija stipresnė.`,
      low:'🧭 Žemas kitų vertinimas',
      blind:'👁 Galima akloji zona',
      shared:'🤝 Bendras tobulinimo signalas',
      regressed:'↓ Pablogėjo nuo ankstesnio ciklo',
      stalled:'↔ Pokytis stringa',
      consensus:'◎ Kelių vertintojų grupių sutapimas',
      improving:'↑ Aiškiai gerėja',
      suggested:'siūloma',
      noStrong:'Šiame cikle nėra trijų aiškiai išsiskiriančių signalų. Rinkitės pagal kontekstą ir atvirus komentarus.',
      familiarity:'Pasirinkote prioritetus, bet nė vienas nėra tarp duomenų siūlomų sričių. Tai galima. Tik trumpai pasitikrinkite: ar renkatės svarbiausią, ar pažįstamiausią ir lengviausią?',
      values:(o,s,g,d)=>`Kiti ${o} · Savivertinimas ${s} · Skirtumas ${g}${d!==null?` · C1→C2 ${d}`:''}`
    },
    en:{
      title:'Data recommendation',
      intro:'The system does not simply suggest the easiest or most familiar option. It combines several signals. This is guidance, not an automatic decision.',
      include:'We recommend including at least one of these areas in the plan. You can choose the remaining priorities based on your work context.',
      weakEvidence:'In this cycle the “others” signal comes from only one rater group, so treat the recommendation as directional rather than a strong consensus.',
      multiEvidence:n=>`In this cycle the “others” signal comes from ${n} rater groups. Agreement across groups strengthens the recommendation.`,
      low:'🧭 Low others rating',
      blind:'👁 Possible blind spot',
      shared:'🤝 Shared development signal',
      regressed:'↓ Regressed since the previous cycle',
      stalled:'↔ Change is stalled',
      consensus:'◎ Agreement across rater groups',
      improving:'↑ Clearly improving',
      suggested:'suggested',
      noStrong:'This cycle does not contain three clearly distinct signals. Use your work context and open comments to decide.',
      familiarity:'You selected priorities, but none are among the data-suggested areas. That is allowed. Just check briefly: are you choosing what matters most, or what feels most familiar and easiest?',
      values:(o,s,g,d)=>`Others ${o} · Self ${s} · Gap ${g}${d!==null?` · C1→C2 ${d}`:''}`
    }
  };

  const lang=()=>document.documentElement.lang==='en'?'en':'lt';
  const t=()=>copy[lang()];
  const G=()=>window.GLA;
  const fmt=v=>Number.isFinite(v)?Number(v).toFixed(2):'—';
  const signed=v=>Number.isFinite(v)?`${v>=0?'+':''}${Number(v).toFixed(2)}`:'—';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function auth(){
    let a=C.parseManageHash?.();
    if(a?.assessmentId&&a?.manageToken)return a;
    try{
      const x=JSON.parse(sessionStorage.getItem('leadership360_last_manage')||'null');
      if(x?.assessmentId&&x?.manageToken)return x;
    }catch(_){}
    return null;
  }

  function deltaMap(){
    try{
      const d=JSON.parse(sessionStorage.getItem('gla360_delta')||'null');
      return new Map((d?.items||[]).map(x=>[x.name,x]));
    }catch(_){return new Map()}
  }

  function roleGroups(agg,ci){
    const roles=['boss','peer','report','other'];
    const visible=roles.filter(r=>Number.isFinite(agg?.means?.[r]?.[ci]));
    const low=visible.filter(r=>agg.means[r][ci]<=3.20);
    return {visible,low};
  }

  function buildSignals(item){
    const s=[];
    if(item.groupVisible>=2&&item.groupLow>=2)s.push('consensus');
    if(item.others<=3.20&&Number.isFinite(item.self)&&item.self<=3.20)s.push('shared');
    else if(item.others<=3.20)s.push('low');
    if(Number.isFinite(item.delta)&&item.delta<-0.10)s.push('regressed');
    if(Number.isFinite(item.gap)&&item.gap>=0.70&&item.others<=3.80)s.push('blind');
    if(Number.isFinite(item.delta)&&item.delta>=-0.05&&item.delta<=0.10&&item.others<=3.60)s.push('stalled');
    if(Number.isFinite(item.delta)&&item.delta>=0.30)s.push('improving');
    return s;
  }

  // Heuristic ordering only; this is intentionally not presented as a psychometric score.
  function priority(item){
    let p=(5-item.others)*10;
    if(item.signals.includes('consensus'))p+=10;
    if(item.signals.includes('shared'))p+=12;
    else if(item.signals.includes('low'))p+=6;
    if(item.signals.includes('regressed'))p+=8;
    if(item.signals.includes('blind'))p+=Math.min(1.5,Math.max(0,item.gap))*4;
    if(item.signals.includes('stalled'))p+=3;
    if(item.signals.includes('improving')&&item.others>3.20)p-=2;
    return p;
  }

  function meaningful(item,lowest){
    if(item.signals.some(x=>['consensus','shared','low','regressed','blind','stalled'].includes(x)))return true;
    return item.others<=lowest+0.15;
  }

  function title(name){
    return lang()==='en'?name:(G()?.lt?G().lt(name):name);
  }

  function reasonLabels(signals){
    const tx=t();
    const order=['shared','low','blind','consensus','regressed','stalled','improving'];
    return order.filter(x=>signals.includes(x)).map(x=>tx[x]);
  }

  function removeOldRecommendationUi(){
    document.querySelectorAll('.data-recommendation-badge').forEach(el=>el.remove());
    const old=document.getElementById('priorityOverrideWarning');
    if(old)old.style.display='none';
  }

  function addCheckboxBadges(){
    removeOldRecommendationUi();
    document.querySelectorAll('.manual-comp').forEach(cb=>{
      const row=cb.closest('label')||cb.parentElement;
      if(!row)return;
      row.querySelectorAll('.signal-recommendation-badge').forEach(x=>x.remove());
      if(!recommendationNames.includes(cb.value))return;
      const badge=document.createElement('span');
      badge.className='signal-recommendation-badge';
      badge.textContent='★ '+t().suggested;
      badge.style.cssText='display:inline-block;margin-left:8px;padding:1px 7px;border-radius:999px;background:rgba(26,86,219,.10);color:var(--brand);font-size:.68rem;font-weight:700;vertical-align:middle';
      row.appendChild(badge);
    });
  }

  function selected(){
    return Array.from(document.querySelectorAll('.manual-comp:checked')).map(cb=>cb.value);
  }

  function updateSoftNudge(){
    const picker=document.getElementById('manualPicker');
    if(!picker)return;
    let el=document.getElementById('familiarityNudge');
    if(!el){
      el=document.createElement('p');
      el.id='familiarityNudge';
      el.style.cssText='display:none;margin:12px 0 0;padding:10px 12px;border-radius:10px;background:rgba(180,83,9,.06);border:1px solid rgba(180,83,9,.20);font-size:.80rem;line-height:1.5;color:var(--muted)';
      picker.insertAdjacentElement('afterend',el);
    }
    const chosen=selected();
    const noneSuggested=chosen.length>0&&recommendationNames.length>0&&!chosen.some(x=>recommendationNames.includes(x));
    el.textContent=noneSuggested?t().familiarity:'';
    el.style.display=noneSuggested?'block':'none';
  }

  function renderBox(items,groupCount){
    const picker=document.getElementById('manualPicker');
    if(!picker)return;
    let box=document.getElementById('prioritySignalRecommendations');
    if(!box){
      box=document.createElement('section');
      box.id='prioritySignalRecommendations';
      box.style.cssText='margin:18px 0 10px;padding:16px;border:1px solid rgba(26,86,219,.24);border-radius:14px;background:rgba(26,86,219,.045)';
      const context=document.getElementById('priorityDecisionContext');
      (context||picker).insertAdjacentElement('beforebegin',box);
    }
    const tx=t();
    const evidence=groupCount<=1?tx.weakEvidence:tx.multiEvidence(groupCount);
    const rows=items.length?items.map(item=>{
      const reasons=reasonLabels(item.signals).filter(x=>!x.startsWith('↑'));
      const improving=item.signals.includes('improving')?`<div class="muted" style="font-size:.74rem;margin-top:4px">${esc(tx.improving)} — tai mažina skubumą, jei dabartinis balas nebėra žemas.</div>`:'';
      return `<div style="padding:11px 0;border-bottom:1px solid var(--border)">
        <div style="font-weight:750">${esc(title(item.name))}</div>
        <div style="margin-top:5px;display:flex;gap:5px;flex-wrap:wrap">${reasons.map(r=>`<span style="padding:2px 7px;border-radius:999px;background:var(--surface);font-size:.72rem">${esc(r)}</span>`).join('')}</div>
        <div class="muted" style="font-size:.76rem;line-height:1.5;margin-top:5px">${esc(tx.values(fmt(item.others),fmt(item.self),signed(item.gap),Number.isFinite(item.delta)?signed(item.delta):null))}</div>
        ${improving}
      </div>`;
    }).join(''):`<p class="muted" style="font-size:.82rem">${esc(tx.noStrong)}</p>`;
    box.innerHTML=`<h3 style="margin:0 0 8px;font-size:1rem">★ ${esc(tx.title)}</h3>
      <p class="muted" style="font-size:.82rem;line-height:1.55;margin:0 0 8px">${esc(tx.intro)}</p>
      <p class="muted" style="font-size:.76rem;line-height:1.45;margin:0 0 10px">${esc(evidence)}</p>
      ${rows}
      <p style="font-size:.80rem;line-height:1.5;margin:12px 0 0"><strong>${esc(tx.include)}</strong></p>`;
  }

  async function apply(){
    if(applied)return;
    const a=auth(),core=G();
    if(!a||!core?.loadBank||!core?.aggregate||!document.querySelector('.manual-comp'))return;
    try{
      const [bundle,bank]=await Promise.all([
        C.exportCycle(a.assessmentId,a.cycle||1,a.manageToken),
        core.loadBank()
      ]);
      const packs=(bundle.responses||[]).map(r=>({
        schema:'leadership360-response@3',aid:bundle.assessment_id,
        role:String(r.role||'other').toUpperCase(),answers:r.answers||{},open:r.open||{}
      }));
      if(!packs.length)return;
      const agg=core.aggregate(bank,packs,{boss:.30,peer:.30,report:.30,other:.10});
      const dm=deltaMap();
      const items=(bank.competencies||[]).map((comp,i)=>{
        const others=agg.others?.[i],self=agg.means?.self?.[i];
        if(!Number.isFinite(others))return null;
        const d=dm.get(comp.name);
        const rg=roleGroups(agg,i);
        const item={name:comp.name,others,self,gap:Number.isFinite(self)?self-others:null,delta:Number.isFinite(d?.delta_others)?d.delta_others:null,groupVisible:rg.visible.length,groupLow:rg.low.length};
        item.signals=buildSignals(item);
        item.priority=priority(item);
        return item;
      }).filter(Boolean);
      if(!items.length)return;
      const lowest=Math.min(...items.map(x=>x.others));
      const candidates=items.filter(x=>meaningful(x,lowest)).sort((a,b)=>b.priority-a.priority||a.others-b.others||((b.gap||0)-(a.gap||0)));
      const recommendations=candidates.slice(0,3);
      recommendationNames=recommendations.map(x=>x.name);
      const groupCount=new Set(packs.filter(p=>p.role!=='SELF').map(p=>p.role)).size;

      // Remove base auto-selection only if the user has not touched the picker.
      // The user remains fully authoritative after the first interaction.
      if(!userTouched){document.querySelectorAll('.manual-comp').forEach(cb=>{cb.checked=false})}
      renderBox(recommendations,groupCount);
      addCheckboxBadges();
      updateSoftNudge();
      applied=true;
    }catch(error){
      console.warn('Leadership360 recommendation nudge:',error);
    }
  }

  document.addEventListener('change',event=>{
    if(event.target?.classList?.contains('manual-comp')){
      userTouched=true;
      updateSoftNudge();
    }
  },true);

  setTimeout(apply,1200);
  setTimeout(apply,2100);
  setTimeout(apply,2800);
})();
