(function(){
  const I=window.Leadership360I18n,C=window.Leadership360Collector,roster=document.getElementById('roster');
  const ROLE_ORDER=['boss','peer','report','other'];
  const COPY={
    lt:{
      head:'Naujas pseudoniminis vertinimo ciklas',checking:'Tikrinamas Collector ryšys…',online:'Collector pasiekiamas',offline:'Collector dar neaktyvuotas arba nepasiekiamas.',
      s1:'1. Vertinimas',leader:'Lyderio vardas',project:'Projekto pavadinimas (nebūtina)',selfEmail:'SELF el. paštas',selfLang:'SELF kalba',selfNote:'SELF yra atskiras savivertinimo kvietimas. El. paštas atsakymų lentelėje nesaugomas.',
      s2:'2. Vertintojų sudėtis',compositionNote:'Nurodykite tik tiek vertintojų, kiek realiai ketinate pakviesti. Kitame žingsnyje kiekvienam jų reikės įvesti el. pašto adresą.',countLabels:{boss:'Vadovai',peer:'Kolegos',report:'Pavaldiniai',other:'Kiti'},
      s3:'3. Vertintojų el. paštai',rosterNote:'Laukų skaičius sukuriamas pagal ankstesniame žingsnyje nurodytą sudėtį. Kiekvienam vertintojui pasirinkite ir apklausos kalbą.',
      roles:{boss:'Vadovas',peer:'Kolega',report:'Pavaldinys',other:'Kitas'},email:'El. paštas',lang:'Kalba',
      peerWarn:'Kolegų grupė < 3 – rolės lygmens anonimiškumas silpnas.',reportWarn:'Pavaldinių grupė < 3 – rolės lygmens anonimiškumas silpnas.',otherWarn:'„Kiti“ grupėje tik 1 žmogus – rekomenduojama bent 2.',thresholdOk:'✓ Grupės bus agreguojamos pagal anonimiškumo ribas.',tooMany:'Viename cikle galima nurodyti daugiausia 49 vertintojus, neskaičiuojant SELF.',
      s4:'4. Anonimiškumo sergėtojas',gName:'Vardas, pavardė',gEmail:'El. paštas',gNote:'Sergėtojas valdo kvietimų ciklą ir mato užpildymo skaičius. Vertintojų identitetai ir atsakymai saugomi atskirai.',
      s5:'5. Sukurti C1',ack:'Suprantu, kad tai pseudoniminis, o ne absoliučiai anoniminis procesas. Mažose grupėse ir iš laisvo teksto autoriaus tapatybė gali būti numanoma.',privacy:'Privatumo ir pseudonimiškumo paaiškinimas →',create:'Sukurti vertinimo ciklą',creating:'Kuriama…',
      needLeader:'Įveskite lyderio vardą.',needSelf:'Įveskite SELF el. paštą.',needGuardian:'Įveskite sergėtojo vardą ir galiojantį el. paštą.',needRater:'Nurodykite bent vieną vertintoją.',badEmails:'Įveskite galiojantį el. paštą kiekvienam suplanuotam vertintojui.',duplicate:'Tas pats el. paštas negali būti įrašytas du kartus tame pačiame cikle.',needAck:'Patvirtinkite pseudonimiškumo pastabą.',
      created:'Vertinimas sukurtas',manageNote:'Valdymo nuorodoje yra slaptas raktas URL fragmente. Jos nesiųskite vertintojams.',copy:'📋 Kopijuoti sergėtojo nuorodą',open:'Atidaryti ciklo valdymą →',copied:'Sergėtojo nuoroda nukopijuota.',fallback:'Kvietimų nuorodos – atsarginis rankinis kelias',fallbackNote:'Kai automatinis el. pašto siuntimas bus aktyvuotas, normaliai jų kopijuoti nereikės.',
      errors:{collector_unreachable:'Collector dar neaktyvuotas arba nepasiekiamas.',guardian_email_required:'Reikalingas sergėtojo el. paštas.',assessment_create_failed:'Nepavyko sukurti vertinimo duomenų bazėje.',exactly_one_self_required:'Cikle turi būti lygiai vienas SELF.',duplicate_email_in_cycle:'Tas pats el. paštas negali kartotis tame pačiame cikle.',roster_must_have_1_to_50_rows:'Patikrinkite vertintojų skaičių.'}
    },
    en:{
      head:'New pseudonymous assessment cycle',checking:'Checking Collector connection…',online:'Collector is reachable',offline:'Collector is not active or cannot be reached.',
      s1:'1. Assessment',leader:'Leader name',project:'Project name (optional)',selfEmail:'SELF email',selfLang:'SELF language',selfNote:'SELF is a separate self-assessment invitation. The email address is not stored with response data.',
      s2:'2. Evaluator composition',compositionNote:'Enter only the number of evaluators you actually plan to invite. In the next step you will enter one email address for each of them.',countLabels:{boss:'Managers',peer:'Peers',report:'Direct reports',other:'Others'},
      s3:'3. Evaluator email addresses',rosterNote:'The number of fields is generated from the composition above. Choose the survey language for each evaluator as well.',
      roles:{boss:'Manager',peer:'Peer',report:'Direct report',other:'Other'},email:'Email',lang:'Language',
      peerWarn:'Peer group < 3 – role-level anonymity is weak.',reportWarn:'Direct-report group < 3 – role-level anonymity is weak.',otherWarn:'The “Other” group has only 1 person – at least 2 is recommended.',thresholdOk:'✓ Groups will be aggregated using the anonymity thresholds.',tooMany:'A cycle can include at most 49 evaluators, excluding SELF.',
      s4:'4. Assessment guardian',gName:'Name',gEmail:'Email',gNote:'The guardian manages invitations and sees completion counts. Evaluator identities and responses are stored separately.',
      s5:'5. Create C1',ack:'I understand this is a pseudonymous, not absolutely anonymous, process. In small groups or free-text comments the author may sometimes be inferred.',privacy:'Privacy and pseudonymity explanation →',create:'Create assessment cycle',creating:'Creating…',
      needLeader:'Enter the leader name.',needSelf:'Enter the SELF email.',needGuardian:'Enter the guardian name and a valid email.',needRater:'Specify at least one evaluator.',badEmails:'Enter a valid email address for every planned evaluator.',duplicate:'The same email cannot be entered twice in one cycle.',needAck:'Confirm the pseudonymity notice.',
      created:'Assessment created',manageNote:'The management link contains a secret key in the URL fragment. Do not send it to evaluators.',copy:'📋 Copy guardian link',open:'Open cycle management →',copied:'Guardian link copied.',fallback:'Invitation links – manual fallback',fallbackNote:'Once automatic email sending is active, these links normally do not need to be copied.',
      errors:{collector_unreachable:'Collector is not active or cannot be reached.',guardian_email_required:'Guardian email is required.',assessment_create_failed:'Could not create the assessment in the database.',exactly_one_self_required:'Exactly one SELF invitation is required.',duplicate_email_in_cycle:'The same email cannot appear twice in one cycle.',roster_must_have_1_to_50_rows:'Check the evaluator count.'}
    }
  };

  let lang=I.set(I.current()),collectorState='checking';
  const tx=()=>COPY[lang];
  const countIds={boss:'countBoss',peer:'countPeer',report:'countReport',other:'countOther'};

  function collectorMessage(){
    const t=tx(),el=document.getElementById('collectorState');
    if(collectorState==='online')el.innerHTML='<span class="status-dot ok"></span>'+t.online;
    else if(collectorState==='offline')el.innerHTML='<span class="status-dot bad"></span>'+t.offline;
    else el.innerHTML='<span class="status-dot"></span>'+t.checking;
  }

  function countValue(role){
    const el=document.getElementById(countIds[role]);
    let n=Math.floor(Number(el.value));
    if(!Number.isFinite(n))n=0;
    n=Math.max(0,Math.min(20,n));
    if(String(n)!==el.value)el.value=String(n);
    return n;
  }

  function counts(){
    return Object.fromEntries(ROLE_ORDER.map(role=>[role,countValue(role)]));
  }

  function snapshotRows(){
    const out=new Map();
    [...roster.querySelectorAll('.roster-row')].forEach(el=>{
      out.set(el.dataset.key,{
        email:el.querySelector('.r-email').value.trim(),
        language:el.querySelector('.r-lang').value
      });
    });
    return out;
  }

  function escapeAttr(value){
    return String(value||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function rowTemplate(role,index,rowLang=lang,email=''){
    const t=tx(),div=document.createElement('div'),key=role+':'+index;
    div.className='roster-row';
    div.dataset.role=role;
    div.dataset.index=String(index);
    div.dataset.key=key;
    div.innerHTML=`<div class="r-role-label">${t.roles[role]} ${index}</div><label class="email">${t.email}<input class="r-email" type="email" autocomplete="off" placeholder="name@company.com" value="${escapeAttr(email)}"></label><label>${t.lang}<select class="r-lang"><option value="lt" ${rowLang==='lt'?'selected':''}>LT</option><option value="en" ${rowLang==='en'?'selected':''}>EN</option></select></label>`;
    roster.appendChild(div);
  }

  function rows(){
    return [...roster.querySelectorAll('.roster-row')].map(el=>({
      email:el.querySelector('.r-email').value.trim().toLowerCase(),
      role:el.dataset.role,
      language:el.querySelector('.r-lang').value
    }));
  }

  function updateSummary(){
    const t=tx(),c=counts(),total=ROLE_ORDER.reduce((sum,r)=>sum+c[r],0);
    document.getElementById('roleSummary').innerHTML=ROLE_ORDER.map(r=>`<span class="pill">${t.countLabels[r]}: <strong>${c[r]}</strong></span>`).join('');
    const w=[];
    if(total>49)w.push(t.tooMany);
    if(c.peer>0&&c.peer<3)w.push(t.peerWarn);
    if(c.report>0&&c.report<3)w.push(t.reportWarn);
    if(c.other===1)w.push(t.otherWarn);
    document.getElementById('anonymityWarning').textContent=w.length?'⚠️ '+w.join(' '):t.thresholdOk;
  }

  function renderRoster(preserve=true){
    const previous=preserve?snapshotRows():new Map(),c=counts();
    roster.innerHTML='';
    ROLE_ORDER.forEach(role=>{
      for(let i=1;i<=c[role];i++){
        const saved=previous.get(role+':'+i);
        rowTemplate(role,i,saved?.language||lang,saved?.email||'');
      }
    });
    updateSummary();
  }

  function render(){
    const t=tx();
    document.documentElement.lang=lang;
    document.title='Leadership 360° – '+(lang==='lt'?'Naujas vertinimas':'New assessment');
    document.getElementById('headSub').textContent=t.head;
    document.getElementById('s1Title').textContent=t.s1;
    document.getElementById('leaderLabel').textContent=t.leader;
    document.getElementById('projectLabel').textContent=t.project;
    document.getElementById('selfEmailLabel').textContent=t.selfEmail;
    document.getElementById('selfLangLabel').textContent=t.selfLang;
    document.getElementById('selfNote').textContent=t.selfNote;
    document.getElementById('s2Title').textContent=t.s2;
    document.getElementById('compositionNote').textContent=t.compositionNote;
    document.getElementById('bossCountLabel').textContent=t.countLabels.boss;
    document.getElementById('peerCountLabel').textContent=t.countLabels.peer;
    document.getElementById('reportCountLabel').textContent=t.countLabels.report;
    document.getElementById('otherCountLabel').textContent=t.countLabels.other;
    document.getElementById('s3Title').textContent=t.s3;
    document.getElementById('rosterNote').textContent=t.rosterNote;
    document.getElementById('s4Title').textContent=t.s4;
    document.getElementById('guardianNameLabel').textContent=t.gName;
    document.getElementById('guardianEmailLabel').textContent=t.gEmail;
    document.getElementById('guardianNote').textContent=t.gNote;
    document.getElementById('s5Title').textContent=t.s5;
    document.getElementById('privacyAckText').textContent=t.ack;
    document.getElementById('privacyLink').textContent=t.privacy;
    document.getElementById('privacyLink').href=C.privacyUrl(lang);
    document.getElementById('createBtn').textContent=t.create;
    document.getElementById('createdTitle').textContent=t.created;
    document.getElementById('manageNote').textContent=t.manageNote;
    document.getElementById('copyGuardian').textContent=t.copy;
    document.getElementById('openGuardian').textContent=t.open;
    document.getElementById('fallbackTitle').textContent=t.fallback;
    document.getElementById('fallbackNote').textContent=t.fallbackNote;
    collectorMessage();
    renderRoster(true);
  }

  I.bindToggle(document.getElementById('langToggle'),next=>{lang=next;render()});
  ROLE_ORDER.forEach(role=>document.getElementById(countIds[role]).addEventListener('input',()=>{
    renderRoster(true);
    document.getElementById('createStatus').textContent='';
  }));

  renderRoster(false);
  render();

  (async()=>{try{await C.health();collectorState='online'}catch{collectorState='offline'}collectorMessage()})();

  const valid=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  document.getElementById('createBtn').onclick=async()=>{
    const t=tx(),leaderName=document.getElementById('leaderName').value.trim(),projectName=document.getElementById('projectName').value.trim(),selfEmail=document.getElementById('selfEmail').value.trim().toLowerCase(),guardianName=document.getElementById('guardianName').value.trim(),guardianEmail=document.getElementById('guardianEmail').value.trim().toLowerCase(),status=document.getElementById('createStatus'),r=rows(),c=counts(),total=ROLE_ORDER.reduce((sum,role)=>sum+c[role],0);
    if(!leaderName){status.textContent=t.needLeader;return}
    if(!valid(selfEmail)){status.textContent=t.needSelf;return}
    if(total<1){status.textContent=t.needRater;return}
    if(total>49){status.textContent=t.tooMany;return}
    if(r.length!==total||r.some(x=>!valid(x.email))){status.textContent=t.badEmails;return}
    if(!guardianName||!valid(guardianEmail)){status.textContent=t.needGuardian;return}
    const emails=[selfEmail,...r.map(x=>x.email)];
    if(new Set(emails).size!==emails.length){status.textContent=t.duplicate;return}
    if(!document.getElementById('privacyAck').checked){status.textContent=t.needAck;return}
    const btn=document.getElementById('createBtn');btn.disabled=true;btn.textContent=t.creating;status.textContent='';
    try{
      const data=await C.createAssessment({leaderName,projectName,guardianName,guardianEmail,roster:[{email:selfEmail,role:'self',language:document.getElementById('selfLang').value},...r]});
      const auth={assessmentId:data.assessmentId,manageToken:data.manageToken,cycle:1,lang},gUrl=C.guardianUrl(auth);
      sessionStorage.setItem('leadership360_last_manage',JSON.stringify(auth));
      document.getElementById('assessmentId').textContent=data.assessmentId;
      document.getElementById('guardianLink').textContent=gUrl;
      document.getElementById('openGuardian').href=gUrl;
      document.getElementById('copyGuardian').onclick=()=>navigator.clipboard.writeText(gUrl).then(()=>alert(tx().copied));
      document.getElementById('inviteList').innerHTML=(data.invites||[]).map((inv,i)=>`<div class="invite-item"><strong>${i+1}. ${inv.role.toUpperCase()} · ${inv.language.toUpperCase()}</strong><div style="font-size:.8rem;word-break:break-all;margin-top:4px">${inv.url}</div></div>`).join('');
      document.getElementById('createdCard').style.display='block';
      document.getElementById('createdCard').scrollIntoView({behavior:'smooth'});
    }catch(e){
      status.textContent=(lang==='lt'?'Klaida: ':'Error: ')+(t.errors[e.message]||e.message);
    }finally{
      btn.disabled=false;btn.textContent=tx().create;
    }
  };
})();
