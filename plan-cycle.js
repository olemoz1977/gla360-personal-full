(function(){
  'use strict';

  const C=window.Leadership360Collector;
  if(!C)return;

  function valid(x){return x&&x.assessmentId&&x.manageToken}
  function resolveAuth(){
    let auth=C.parseManageHash();
    if(valid(auth))return auth;
    try{
      const x=JSON.parse(sessionStorage.getItem('leadership360_last_manage')||'null');
      if(valid(x))return x;
    }catch(_){}
    try{
      const items=JSON.parse(localStorage.getItem('leadership360_guardian_workspace_v1')||'[]');
      if(Array.isArray(items)&&items.length===1&&valid(items[0]))return items[0];
    }catch(_){}
    return null;
  }

  const auth=resolveAuth();
  let recommendedNames=[];
  let recommendationWired=false;

  const copy={
    lt:{
      subtitle:'Ciklo rezultatai įkeliami automatiškai. Pasirinkite iki 3 tobulinimo prioritetų ir generuokite 90 dienų planą.',
      direct:(cycle,n)=>`✓ C${cycle} duomenys įkelti tiesiai iš saugaus surinkimo sluoksnio · ${n} atsakymų. JSON kelti nereikia.`,
      auto:'Automatiškai pažymėtos iki 3 aiškiai žemiausiai kitų įvertintos sritys. Galite pasirinkimą pakeisti.',
      tie:score=>`Visų gebėjimų kitų vertinimo balas vienodas (${score}). Sistema negali objektyviai išskirti 1–3 prioritetų, todėl pasirinkite juos rankiniu būdu.`,
      cutoff:(score,count,slots,selected)=>`${selected?`Automatiškai pažymėta ${selected} aiškiai žemiau įvertinta sritis. `:''}${count} sritys turi vienodą kitų vertinimo balą ${score} ir pretenduoja į likusias ${slots} vietas. Sistema jų savavališkai neparenka – pasirinkite pagal kontekstą ir komentarus.`,
      manual:'Pasirinkite iki 3 gebėjimų, kuriems generuoti planą.',
      override:'⚠️ Neįtraukėte bent vienos aiškiai žemiausiai įvertintos srities. Galite tęsti, bet 90 d. planas sąmoningai nukryps nuo stipriausio 360° signalo.',
      missing:'Šis puslapis neturi aktyvaus ciklo konteksto. Grįžkite į ciklo ataskaitą ir 90 dienų planą atidarykite iš jos.',
      error:'Nepavyko automatiškai įkelti ciklo. Galite pasirinkti sritis rankiniu būdu.'
    },
    en:{
      subtitle:'Cycle results are loaded automatically. Choose up to 3 development priorities and generate the 90-day plan.',
      direct:(cycle,n)=>`✓ C${cycle} data loaded directly from the secure collection layer · ${n} responses. No JSON upload is needed.`,
      auto:'Up to 3 clearly lowest-rated competency areas were selected automatically from others’ ratings. You can change the selection.',
      tie:score=>`All competency areas have the same others rating (${score}). The system cannot objectively select 1–3 priorities, so choose them manually.`,
      cutoff:(score,count,slots,selected)=>`${selected?`${selected} clearly lower-rated area was selected automatically. `:''}${count} areas share the same others rating of ${score} and compete for the remaining ${slots} slots. The system does not choose arbitrarily among them – use context and comments to decide.`,
      manual:'Choose up to 3 competency areas for the plan.',
      override:'⚠️ You excluded at least one clearly lowest-rated area. You may continue, but the 90-day plan will intentionally diverge from the strongest 360° signal.',
      missing:'This page has no active cycle context. Return to the cycle report and open the 90-day plan from there.',
      error:'The cycle could not be loaded automatically. You can still choose areas manually.'
    }
  };

  const lang=()=>document.documentElement.lang==='en'?'en':'lt';
  const tx=()=>copy[lang()];
  const G=()=>typeof GLA!=='undefined'?GLA:null;

  function setText(){
    const header=document.querySelector('header.head p');
    if(header&&auth)header.textContent=tx().subtitle;

    if(!auth)return;
    const grid=document.querySelector('.source-grid');
    const drop=document.getElementById('aggDrop');
    if(drop){
      const left=drop.closest('div');
      if(left)left.style.display='none';
    }
    if(grid)grid.style.gridTemplateColumns='1fr';

    const picker=document.getElementById('manualPicker');
    if(picker){
      const holder=picker.parentElement;
      const title=holder?.querySelector('p[style*="font-weight:700"]');
      const note=holder?.querySelector('p.muted');
      if(title)title.textContent=lang()==='en'?'Development priorities':'Tobulinimo prioritetai';
      if(note)note.textContent=tx().manual;
    }
    updateRecommendationWarning();
  }

  function banner(message,kind='first-time'){
    const el=document.getElementById('cycleBanner');
    if(!el)return;
    el.style.display='flex';
    el.className='cycle-banner '+kind;
    el.innerHTML=`<div class="icon">★</div><div>${message}</div>`;
  }

  function select(names){
    document.querySelectorAll('.manual-comp').forEach(cb=>{cb.checked=names.includes(cb.value)});
  }

  function updateRecommendationWarning(){
    const picker=document.getElementById('manualPicker');
    if(!picker)return;
    let warning=document.getElementById('priorityOverrideWarning');
    if(!warning){
      warning=document.createElement('p');
      warning.id='priorityOverrideWarning';
      warning.style.cssText='display:none;margin:12px 0 0;padding:10px 12px;border-radius:10px;background:rgba(180,83,9,.08);border:1px solid rgba(180,83,9,.25);font-size:.82rem;line-height:1.5;color:var(--muted)';
      picker.insertAdjacentElement('afterend',warning);
    }
    if(!recommendedNames.length){warning.style.display='none';return}
    const checked=new Set(Array.from(document.querySelectorAll('.manual-comp:checked')).map(cb=>cb.value));
    const omitted=recommendedNames.some(name=>!checked.has(name));
    warning.textContent=omitted?tx().override:'';
    warning.style.display=omitted?'block':'none';
  }

  function markRecommendations(names){
    recommendedNames=Array.from(new Set(names||[]));
    document.querySelectorAll('.manual-comp').forEach(cb=>{
      const row=cb.closest('label')||cb.parentElement;
      if(!row)return;
      const old=row.querySelector?.('.data-recommendation-badge');
      if(old)old.remove();
      if(recommendedNames.includes(cb.value)){
        const badge=document.createElement('span');
        badge.className='data-recommendation-badge';
        badge.textContent=lang()==='en'?'data recommendation':'duomenų rekomendacija';
        badge.style.cssText='display:inline-block;margin-left:8px;padding:1px 7px;border-radius:999px;background:rgba(26,86,219,.09);color:var(--brand);font-size:.68rem;font-weight:700;vertical-align:middle';
        row.appendChild(badge);
      }
    });
    if(!recommendationWired){
      const picker=document.getElementById('manualPicker');
      if(picker){picker.addEventListener('change',updateRecommendationWarning);recommendationWired=true}
    }
    updateRecommendationWarning();
  }

  async function apply(){
    setText();
    if(!document.getElementById('cycleBanner'))return setTimeout(apply,250);
    if(!auth){banner(tx().missing,'has-reflect');return}
    try{sessionStorage.setItem('leadership360_last_manage',JSON.stringify(auth))}catch(_){}

    const core=G();
    if(!core?.loadBank||!core?.aggregate)return setTimeout(apply,250);
    if(!document.querySelector('.manual-comp'))return setTimeout(apply,250);

    try{
      const [bundle,bank]=await Promise.all([
        C.exportCycle(auth.assessmentId,auth.cycle||1,auth.manageToken),
        core.loadBank()
      ]);
      const responses=bundle.responses||[];
      banner(tx().direct(bundle.cycle||auth.cycle||1,responses.length));
      if(!responses.length)return;

      const packs=responses.map(r=>({
        schema:'leadership360-response@3',
        aid:bundle.assessment_id,
        role:String(r.role||'other').toUpperCase(),
        answers:r.answers||{},
        open:r.open||{}
      }));
      const agg=core.aggregate(bank,packs,{boss:.30,peer:.30,report:.30,other:.10});
      const ranked=(bank.competencies||[]).map((comp,i)=>({name:comp.name,score:agg.others?.[i],self:agg.means?.self?.[i]}))
        .filter(x=>Number.isFinite(x.score))
        .sort((a,b)=>a.score-b.score);
      if(!ranked.length)return;

      const min=ranked[0].score,max=ranked[ranked.length-1].score;
      const base=tx().direct(bundle.cycle||auth.cycle||1,responses.length);
      if(Math.abs(max-min)<0.005){
        select([]);
        markRecommendations([]);
        banner(base+'<br><span class="muted">'+tx().tie(min.toFixed(2))+'</span>');
        return;
      }

      const targetCount=Math.min(3,ranked.length);
      const cutoff=ranked[targetCount-1].score;
      const below=ranked.filter(x=>x.score<cutoff-0.005);
      const tied=ranked.filter(x=>Math.abs(x.score-cutoff)<0.005);
      const slots=targetCount-below.length;

      if(tied.length>slots){
        const names=below.map(x=>x.name);
        select(names);
        markRecommendations(names);
        banner(base+'<br><span class="muted">'+tx().cutoff(cutoff.toFixed(2),tied.length,slots,below.length)+'</span>');
      }else{
        const names=ranked.slice(0,targetCount).map(x=>x.name);
        select(names);
        markRecommendations(names);
        banner(base+'<br><span class="muted">'+tx().auto+'</span>');
      }
    }catch(e){
      banner(tx().error,'has-reflect');
    }
  }

  setTimeout(apply,350);
  setTimeout(apply,900);
  setTimeout(apply,1800);
})();