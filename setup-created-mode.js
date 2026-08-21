(function(){
  'use strict';
  const card=document.getElementById('createdCard');
  const C=window.Leadership360Collector;
  if(!card)return;

  const setupSections=['s1Title','s2Title','s3Title','s4Title','s5Title']
    .map(id=>document.getElementById(id)?.closest('section.card'))
    .filter(Boolean);

  function lang(){return document.documentElement.lang==='en'?'en':'lt'}
  function isQa(){return !!C?.qaMode?.()}

  function applyFallbackPolicy(){
    const title=document.getElementById('fallbackTitle');
    const note=document.getElementById('fallbackNote');
    const list=document.getElementById('inviteList');
    const hr=title?.previousElementSibling?.tagName==='HR'?title.previousElementSibling:null;
    const show=isQa();
    [hr,title,note,list].filter(Boolean).forEach(el=>el.style.display=show?'':'none');
    if(show&&title){title.textContent=lang()==='en'?'🧪 QA invitation links':'🧪 QA testavimo kvietimų nuorodos'}
    if(show&&note){note.textContent=lang()==='en'?'Test environment only. These survey links are never part of the normal Guardian flow.':'Tik testavimo aplinkai. Šios apklausų nuorodos nėra normalios Sergėtojo darbo eigos dalis.'}
  }

  function ensureNewButton(){
    if(document.getElementById('newAssessmentBtn'))return;
    const actions=card.querySelector('#openGuardian')?.parentElement;
    if(!actions)return;
    const btn=document.createElement('button');
    btn.id='newAssessmentBtn';
    btn.type='button';
    btn.className='secondary';
    btn.textContent=lang()==='en'?'Start a new assessment':'Pradėti naują vertinimą';
    btn.onclick=()=>{sessionStorage.removeItem('leadership360_last_manage');location.reload()};
    actions.appendChild(btn);
  }

  function apply(){
    const visible=getComputedStyle(card).display!=='none';
    setupSections.forEach(section=>section.style.display=visible?'none':'');
    applyFallbackPolicy();
    if(visible){
      ensureNewButton();
      if(location.hash===''&&card.getBoundingClientRect().top<0){card.scrollIntoView({block:'start'})}
    }
  }

  const observer=new MutationObserver(apply);
  observer.observe(card,{attributes:true,attributeFilter:['style','class']});
  document.getElementById('langToggle')?.addEventListener('click',()=>setTimeout(apply,60));
  setTimeout(apply,350);
  setTimeout(apply,900);
})();
