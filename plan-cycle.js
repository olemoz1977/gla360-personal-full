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
    lt:{
      subtitle:'Ciklo rezultatai įkeliami automatiškai. Pasirinkite iki 3 tobulinimo prioritetų ir generuokite 90 dienų planą.',
      direct:(cycle,n)=>`✓ C${cycle} duomenys įkelti tiesiai iš saugaus surinkimo sluoksnio · ${n} atsakymų. JSON kelti nereikia.`,
      auto:'Pagal kitų vertinimo balus automatiškai pažymėtos 3 žemiausiai įvertintos sritys. Galite pasirinkimą pakeisti.',
      tie:score=>`Visų gebėjimų kitų vertinimo balas vienodas (${score}). Sistema negali objektyviai išskirti 1–3 prioritetų, todėl pasirinkite juos rankiniu būdu.`,
      manual:'Pasirinkite iki 3 gebėjimų, kuriems generuoti planą.',
      error:'Nepavyko automatiškai įkelti ciklo. Galite pasirinkti sritis rankiniu būdu.'
    },
    en:{
      subtitle:'Cycle results are loaded automatically. Choose up to 3 development priorities and generate the 90-day plan.',
      direct:(cycle,n)=>`✓ C${cycle} data loaded directly from the secure collection layer · ${n} responses. No JSON upload is needed.`,
      auto:'The 3 lowest-rated competency areas were selected automatically from others’ ratings. You can change the selection.',
      tie:score=>`All competency areas have the same others rating (${score}). The system cannot objectively select 1–3 priorities, so choose them manually.`,
      manual:'Choose up to 3 competency areas for the plan.',
      error:'The cycle could not be loaded automatically. You can still choose areas manually.'
    }
  };

  const lang=()=>document.documentElement.lang==='en'?'en':'lt';
  const tx=()=>copy[lang()];
  const G=()=>typeof GLA!=='undefined'?GLA:null;

  function setText(){
    const header=document.querySelector('header.head p');
    if(header)header.textContent=tx().subtitle;

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

  async function apply(){
    setText();
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
        .sort((a,b)=>a.score-b.score || ((a.score-(a.self??a.score))-(b.score-(b.self??b.score))));
      if(!ranked.length)return;

      const min=ranked[0].score,max=ranked[ranked.length-1].score;
      if(Math.abs(max-min)<0.005){
        select([]);
        banner(tx().direct(bundle.cycle||auth.cycle||1,responses.length)+'<br><span class="muted">'+tx().tie(min.toFixed(2))+'</span>');
      }else{
        const chosen=ranked.slice(0,3).map(x=>x.name);
        select(chosen);
        banner(tx().direct(bundle.cycle||auth.cycle||1,responses.length)+'<br><span class="muted">'+tx().auto+'</span>');
      }
    }catch(e){
      banner(tx().error,'has-reflect');
    }
  }

  setTimeout(apply,500);
  setTimeout(apply,1200);
})();