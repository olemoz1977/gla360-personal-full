(function(){
  'use strict';
  const card=document.getElementById('createdCard');
  if(!card)return;

  const setupSections=['s1Title','s2Title','s3Title','s4Title','s5Title']
    .map(id=>document.getElementById(id)?.closest('section.card'))
    .filter(Boolean);

  function lang(){return document.documentElement.lang==='en'?'en':'lt'}

  function ensureNewButton(){
    if(document.getElementById('newAssessmentBtn'))return;
    const actions=card.querySelector('#openGuardian')?.parentElement;
    if(!actions)return;
    const btn=document.createElement('button');
    btn.id='newAssessmentBtn';
    btn.type='button';
    btn.className='secondary';
    btn.textContent=lang()==='en'?'Start a new assessment':'Pradėti naują vertinimą';
    btn.onclick=()=>{
      sessionStorage.removeItem('leadership360_last_manage');
      location.reload();
    };
    actions.appendChild(btn);
  }

  function apply(){
    const visible=getComputedStyle(card).display!=='none';
    setupSections.forEach(section=>section.style.display=visible?'none':'');
    if(visible){
      ensureNewButton();
      if(location.hash===''&&card.getBoundingClientRect().top<0){card.scrollIntoView({block:'start'});}
    }
  }

  const observer=new MutationObserver(apply);
  observer.observe(card,{attributes:true,attributeFilter:['style','class']});
  setTimeout(apply,350);
  setTimeout(apply,900);
})();
