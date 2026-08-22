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
  function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim())}

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

  function deliveryText(data){
    const guardian=data?.guardianDelivery||'not_configured';
    const invitations=data?.invitationDelivery||'unknown';
    const sent=Number(data?.invitationsSent||0);
    const failed=Number(data?.invitationsFailed||0);
    if(lang()==='en'){
      if(guardian==='sent'&&invitations==='sent')return `Guardian access was sent directly to the provided email. Initial SELF/evaluator invitations were also sent automatically (${sent} sent, ${failed} failed). The assessed leader does not receive or see the Guardian management link.`;
      if(guardian==='sent'&&invitations==='partial')return `Guardian access was sent. Initial invitations were started automatically, but some deliveries failed (${sent} sent, ${failed} failed). The Guardian can resend failed invitations from the administration workspace.`;
      if(guardian==='sent'&&invitations==='failed')return 'Guardian access was sent, but initial SELF/evaluator invitation delivery failed. The Guardian can resend invitations from the administration workspace.';
      if(guardian==='sent')return 'Guardian access was sent directly to the email address you provided. The assessed leader does not receive or see the Guardian management link.';
      if(guardian==='failed')return 'The assessment was created, but the Guardian access email could not be delivered. Do not use this assessment for a live process until email delivery is restored.';
      return 'The assessment was created, but automatic Guardian email delivery is not configured yet. Do not use this assessment for a live process until email sending is enabled.';
    }
    if(guardian==='sent'&&invitations==='sent')return `Sergėtojo prieiga išsiųsta tiesiai į nurodytą el. paštą. SELF ir vertintojų pirminiai kvietimai taip pat išsiųsti automatiškai (${sent} išsiųsta, ${failed} nepavyko). Vertinamasis Sergėtojo valdymo nuorodos negauna ir nemato.`;
    if(guardian==='sent'&&invitations==='partial')return `Sergėtojo prieiga išsiųsta. Pirminiai kvietimai pradėti siųsti automatiškai, tačiau dalies pristatyti nepavyko (${sent} išsiųsta, ${failed} nepavyko). Sergėtojas gali pakartoti kvietimus administravimo stale.`;
    if(guardian==='sent'&&invitations==='failed')return 'Sergėtojo prieiga išsiųsta, tačiau SELF ir vertintojų pirminių kvietimų automatiškai išsiųsti nepavyko. Sergėtojas gali juos pakartoti administravimo stale.';
    if(guardian==='sent')return 'Sergėtojo prieigos nuoroda išsiųsta tiesiai į nurodytą el. paštą. Vertinamasis Sergėtojo valdymo nuorodos negauna ir nemato.';
    if(guardian==='failed')return 'Vertinimas sukurtas, tačiau Sergėtojo prieigos laiško pristatyti nepavyko. Nenaudokite šio vertinimo realiam procesui, kol el. pašto siuntimas neatstatytas.';
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
    if(manageNote)manageNote.textContent=deliveryText(lastCreateResult||{});
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

  function installGuardianV4Create(){
    if(isQa())return;
    const btn=document.getElementById('createBtn');
    const status=document.getElementById('createStatus');
    if(!btn||!status)return;

    btn.onclick=async()=>{
      const en=lang()==='en';
      const leaderName=document.getElementById('leaderName')?.value.trim()||'';
      const projectName=document.getElementById('projectName')?.value.trim()||'';
      const selfEmail=(document.getElementById('selfEmail')?.value||'').trim().toLowerCase();
      const guardianName=document.getElementById('guardianName')?.value.trim()||'';
      const guardianEmail=(document.getElementById('guardianEmail')?.value||'').trim().toLowerCase();
      const selfLanguage=document.getElementById('selfLang')?.value||'lt';
      const raters=[...document.querySelectorAll('#roster .roster-row')].map(row=>({
        email:(row.querySelector('.r-email')?.value||'').trim().toLowerCase(),
        role:row.dataset.role||'other',
        language:row.querySelector('.r-lang')?.value||'lt'
      }));

      if(!leaderName){status.textContent=en?'Enter the leader name.':'Įveskite lyderio vardą.';return}
      if(!validEmail(selfEmail)){status.textContent=en?'Enter the SELF email.':'Įveskite SELF el. paštą.';return}
      if(raters.length<1){status.textContent=en?'Specify at least one evaluator.':'Nurodykite bent vieną vertintoją.';return}
      if(raters.length>49){status.textContent=en?'A cycle can include at most 49 evaluators, excluding SELF.':'Viename cikle galima nurodyti daugiausia 49 vertintojus, neskaičiuojant SELF.';return}
      if(raters.some(r=>!validEmail(r.email))){status.textContent=en?'Enter a valid email address for every planned evaluator.':'Įveskite galiojantį el. paštą kiekvienam suplanuotam vertintojui.';return}
      if(!guardianName||!validEmail(guardianEmail)){status.textContent=en?'Enter the guardian name and a valid email.':'Įveskite sergėtojo vardą ir galiojantį el. paštą.';return}
      const participantEmails=[selfEmail,...raters.map(r=>r.email)];
      if(new Set(participantEmails).size!==participantEmails.length){status.textContent=en?'The same email cannot be entered twice in one cycle.':'Tas pats el. paštas negali būti įrašytas du kartus tame pačiame cikle.';return}
      if(!document.getElementById('privacyAck')?.checked){status.textContent=en?'Confirm the pseudonymity notice.':'Patvirtinkite pseudonimiškumo pastabą.';return}

      btn.disabled=true;
      btn.textContent=en?'Creating…':'Kuriama…';
      status.textContent='';
      try{
        const data=await C.createAssessment({
          leaderName,
          projectName,
          guardianName,
          guardianEmail,
          roster:[{email:selfEmail,role:'self',language:selfLanguage},...raters]
        });
        lastCreateResult=data||null;
        document.getElementById('assessmentId').textContent=data?.assessmentId||'';
        document.getElementById('createdTitle').textContent=en?'Assessment created':'Vertinimas sukurtas';
        document.getElementById('manageNote').textContent=deliveryText(data||{});
        card.style.display='block';
        apply();
        card.scrollIntoView({behavior:'smooth',block:'start'});
      }catch(e){
        const map={
          guardian_cannot_be_leader:en?'The Guardian cannot be the assessed leader in the same assessment.':'Sergėtojas negali būti vertinamasis tame pačiame vertinime.',
          guardian_delivery_not_configured:en?'Guardian email delivery is not configured.':'Sergėtojo el. pašto siuntimas nesukonfigūruotas.',
          guardian_delivery_failed:en?'Guardian email delivery failed.':'Nepavyko išsiųsti Sergėtojo prieigos laiško.',
          guardian_delivery_failed_cleanup_failed:en?'Guardian email delivery failed and the failed assessment could not be cleaned up automatically.':'Nepavyko išsiųsti Sergėtojo laiško ir automatiškai pašalinti nepavykusio vertinimo.',
          collector_unreachable:en?'Collector is not reachable.':'Collector nepasiekiamas.',
          duplicate_email_in_cycle:en?'The same email cannot appear twice in one cycle.':'Tas pats el. paštas negali kartotis tame pačiame cikle.'
        };
        status.textContent=(en?'Error: ':'Klaida: ')+(map[e?.message]||e?.message||'unknown_error');
      }finally{
        btn.disabled=false;
        btn.textContent=en?'Create assessment cycle':'Sukurti vertinimo ciklą';
      }
    };
  }

  installGuardianV4Create();
  const observer=new MutationObserver(apply);
  observer.observe(card,{attributes:true,attributeFilter:['style','class']});
  document.getElementById('langToggle')?.addEventListener('click',()=>setTimeout(apply,60));
  setTimeout(apply,350);
  setTimeout(apply,900);
})();
