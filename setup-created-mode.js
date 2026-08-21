(function(){
  'use strict';
  const card=document.getElementById('createdCard');
  const C=window.Leadership360Collector;
  if(!card||!C)return;

  let lastCreateResult=null;
  const originalCreate=C.createAssessment?.bind(C);
  if(originalCreate){
    C.createAssessment=async function(payload){
      const data=await originalCreate(payload);
      lastCreateResult=data||null;
      return data;
    };
  }

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

  function deliveryText(status){
    if(lang()==='en'){
      if(status==='sent')return 'Guardian access was sent directly to the email address you provided. The assessed leader does not receive or see the Guardian management link.';
      if(status==='failed')return 'The assessment was created, but the Guardian access email could not be delivered. Do not use this assessment for a live process until email delivery is restored.';
      return 'The assessment was created, but automatic Guardian email delivery is not configured yet. Do not use this assessment for a live process until email sending is enabled.';
    }
    if(status==='sent')return 'Sergėtojo prieigos nuoroda išsiųsta tiesiai į nurodytą el. paštą. Vertinamasis Sergėtojo valdymo nuorodos negauna ir nemato.';
    if(status==='failed')return 'Vertinimas sukurtas, tačiau Sergėtojo prieigos laiško pristatyti nepavyko. Nenaudokite šio vertinimo realiam procesui, kol el. pašto siuntimas neatstatytas.';
    return 'Vertinimas sukurtas, tačiau automatinis Sergėtojo laiškas dar nesukonfigūruotas. Nenaudokite šio vertinimo realiam procesui, kol el. pašto siuntimas neaktyvuotas.';
  }

  function applyGuardianAccessPolicy(){
    if(isQa())return;
    const link=document.getElementById('guardianLink');
    const copy=document.getElementById('copyGuardian');
    const open=document.getElementById('openGuardian');
    const manageNote=document.getElementById('manageNote');
    const openWorkspace=document.getElementById('openWorkspaceFromSetup');
    const topWorkspace=document.getElementById('guardianWorkspaceLink');
    [link,copy,open,openWorkspace,topWorkspace].filter(Boolean).forEach(el=>el.style.display='none');
    try{sessionStorage.removeItem('leadership360_last_manage')}catch(_){}
    if(manageNote)manageNote.textContent=deliveryText(lastCreateResult?.guardianDelivery||'not_configured');
  }

  function ensureNewButton(){
    if(document.getElementById('newAssessmentBtn'))return;
    const actions=document.getElementById('openGuardian')?.parentElement;
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
      applyGuardianAccessPolicy();
      if(location.hash===''&&card.getBoundingClientRect().top<0){card.scrollIntoView({block:'start'})}
    }
  }

  const observer=new MutationObserver(apply);
  observer.observe(card,{attributes:true,attributeFilter:['style','class']});
  document.getElementById('langToggle')?.addEventListener('click',()=>setTimeout(apply,60));
  setTimeout(apply,350);
  setTimeout(apply,900);
})();
