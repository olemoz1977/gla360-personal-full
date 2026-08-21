(function(){
  'use strict';

  const copy={
    lt:{
      zero:'Nė viena iš 3 pasirinktų sričių nesutampa su duomenų rekomendacija. Tai galima, tačiau prieš generuojant planą pasitikrinkite, ar pasirinkimą lemia realus darbo kontekstas, o ne vien pažįstamumas ar lengvumas.',
      one:'1 iš 3 pasirinktų sričių sutampa su duomenų rekomendacija. Kitos dvi gali būti visiškai pagrįstos jūsų darbo kontekstu. Prieš tęsdami tik pasitikrinkite, ar jos pasirinktos sąmoningai.',
      two:'2 iš 3 pasirinktų sričių sutampa su duomenų rekomendacija.'
    },
    en:{
      zero:'None of the 3 selected areas matches the data recommendation. That is allowed, but before generating the plan, check whether your choice is driven by real work context rather than familiarity or ease.',
      one:'1 of the 3 selected areas matches the data recommendation. The other two may be fully justified by your work context. Just check that they were chosen deliberately.',
      two:'2 of the 3 selected areas match the data recommendation.'
    }
  };

  function lang(){return document.documentElement.lang==='en'?'en':'lt'}

  function suggested(){
    return Array.from(document.querySelectorAll('.manual-comp')).filter(cb=>{
      const row=cb.closest('label')||cb.parentElement;
      return !!row?.querySelector('.signal-recommendation-badge');
    }).map(cb=>cb.value);
  }

  function selected(){return Array.from(document.querySelectorAll('.manual-comp:checked')).map(cb=>cb.value)}

  function ensure(){
    const picker=document.getElementById('manualPicker');
    if(!picker)return null;
    let el=document.getElementById('selectionRecommendationCheck');
    if(!el){
      el=document.createElement('p');
      el.id='selectionRecommendationCheck';
      el.style.cssText='display:none;margin:12px 0 0;padding:11px 13px;border-radius:10px;border:1px solid rgba(180,83,9,.22);background:rgba(180,83,9,.055);font-size:.80rem;line-height:1.5;color:var(--muted)';
      picker.insertAdjacentElement('afterend',el);
    }
    return el;
  }

  function update(){
    const el=ensure();
    if(!el)return;
    const rec=suggested();
    const chosen=selected();
    if(rec.length===0||chosen.length!==3){el.style.display='none';return}
    const matches=chosen.filter(x=>rec.includes(x)).length;
    const tx=copy[lang()];
    if(matches===0){el.textContent=tx.zero;el.style.display='block'}
    else if(matches===1){el.textContent=tx.one;el.style.display='block'}
    else {el.style.display='none'}
  }

  document.addEventListener('change',e=>{if(e.target?.classList?.contains('manual-comp'))update()},true);
  setTimeout(update,1500);
  setTimeout(update,2500);
})();
