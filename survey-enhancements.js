(function(){
  'use strict';

  const C=window.Leadership360Collector;
  const token=new URLSearchParams(location.search).get('invite')||'';
  if(!C||!token)return;

  const COPY={
    lt:{
      na:'Neteko stebėti / negaliu įvertinti',
      selfNa:'Neturėjau tokios situacijos / negaliu įvertinti',
      rolePrefix:'Jūs pildote:',
      roles:{
        self:['SAVIVERTINIMĄ','Vertinate save'],
        boss:['VADOVO VERTINIMĄ','Vertinate savo pavaldinį'],
        peer:['KOLEGOS VERTINIMĄ','Vertinate savo kolegą'],
        report:['PAVALDINIO VERTINIMĄ','Vertinate savo vadovą'],
        other:['DARBO PARTNERIO VERTINIMĄ','Vertinate darbo partnerį']
      },
      note:'Jei konkretaus elgesio neteko stebėti, nespekuliuokite. Pasirinkite „Neteko stebėti / negaliu įvertinti“. Šis pasirinkimas į balo vidurkį neįtraukiamas.',
      selfNote:'Jei tokios situacijos neturėjote arba pagrįstai negalite savęs įvertinti, pasirinkite „Neturėjau tokios situacijos / negaliu įvertinti“. Šis pasirinkimas į balo vidurkį neįtraukiamas.'
    },
    en:{
      na:'Not observed / cannot assess',
      selfNa:'No such situation / cannot assess myself',
      rolePrefix:'You are completing:',
      roles:{
        self:['SELF-ASSESSMENT','You are rating yourself'],
        boss:['MANAGER ASSESSMENT','You are rating your direct report'],
        peer:['PEER ASSESSMENT','You are rating your colleague'],
        report:['DIRECT-REPORT ASSESSMENT','You are rating your manager'],
        other:['WORK-PARTNER ASSESSMENT','You are rating a work partner']
      },
      note:'If you have not observed a specific behaviour, do not guess. Choose “Not observed / cannot assess”. This choice is excluded from score averages.',
      selfNote:'If you have not encountered such a situation or cannot reasonably assess yourself, choose “No such situation / cannot assess myself”. This choice is excluded from score averages.'
    }
  };

  const SELF_LT={
    COMM_INT_1:'Laikausi pažadų ir susitarimų su komanda.',
    COMM_INT_2:'Vienodai taikau taisykles visiems darbuotojams.',
    COMM_INT_3:'Pripažįstu savo klaidas ir padedu jas ištaisyti.',
    COMM_INT_4:'Paaiškinu komandai, kodėl keičiasi planai ar prioritetai.',
    COMM_INT_5:'Informuoju komandą apie problemas ir darbo eigą.',
    COMM_DIA_1:'Leidžiu darbuotojams laisvai išsakyti problemas ir nuomonę.',
    COMM_DIA_2:'Išklausau ir tylesnius komandos narius.',
    COMM_DIA_3:'Sprendžiu problemas ramiai ir be asmeniškumų.',
    COMM_DIA_4:'Aiškiai susitariu, kas ir ką turi padaryti.',
    COMM_DIA_5:'Pamainos aptarimuose leidžiu pasisakyti kitiems.',
    COMM_VSN_1:'Paaiškinu komandai darbo tikslus ir prioritetus.',
    COMM_VSN_2:'Aiškiai parodau, kas laikoma geru rezultatu.',
    COMM_VSN_3:'Nuolat primenu svarbiausius pamainos tikslus.',
    COMM_VSN_4:'Įsitikinu, kad darbuotojai suprato užduotis.',
    COMM_VSN_5:'Kasdienius sprendimus sieju su gamybos tikslais.',
    ASS_TECH_1:'Domiuosi, kaip pagerinti darbą ar procesus.',
    ASS_TECH_2:'Greitai pritaikau naudingus darbo įrankius ar metodus.',
    ASS_TECH_3:'Dalijuosi praktiniais darbo patarimais su komanda.',
    ASS_TECH_4:'Prieš pokyčius įvertinu riziką kokybei ir gamybai.',
    ASS_TECH_5:'Išbandau naujus sprendimus ir mokausi iš rezultatų.',
    ASS_CUST_1:'Rūpinuosi, kad produktas atitiktų kokybės reikalavimus.',
    ASS_CUST_2:'Greitai reaguoju į kokybės ar klientų problemas.',
    ASS_CUST_3:'Atkreipiu dėmesį į klientų nusiskundimus ir broką.',
    ASS_CUST_4:'Po problemų imuosi veiksmų situacijai pagerinti.',
    ASS_CUST_5:'Rūpinuosi, kad klaidos nesikartotų ateityje.',
    ASS_COMP_1:'Ieškau būdų dirbti efektyviau ir stabiliau.',
    ASS_COMP_2:'Siūlau naujas idėjas darbui gerinti.',
    ASS_COMP_3:'Daugiausia dėmesio skiriu svarbiausiems darbams.',
    ASS_COMP_4:'Priimant sprendimus atsižvelgiu į rezultatą ir naudą.',
    ASS_COMP_5:'Pastebiu, kada reikia keisti darbo organizavimą.',
    ENG_DEV_1:'Padedu silpnesniems darbuotojams tobulėti.',
    ENG_DEV_2:'Duodu aiškų ir naudingą grįžtamąjį ryšį.',
    ENG_DEV_3:'Mokau darbuotojus praktiškai darbo vietoje.',
    ENG_DEV_4:'Pastebiu ir pagiriu progresą bei gerą darbą.',
    ENG_DEV_5:'Dalijuosi savo patirtimi ir žiniomis.',
    ENG_PAR_1:'Gerai bendradarbiauju su kitomis pamainomis ar skyriais.',
    ENG_PAR_2:'Aiškiai susitariu dėl bendrų darbų ir atsakomybių.',
    ENG_PAR_3:'Greitai sprendžiu nesutarimus tarp darbuotojų.',
    ENG_PAR_4:'Dalijuosi nuopelnais su komanda.',
    ENG_PAR_5:'Palaikau reguliarų bendravimą su kitais skyriais.',
    ENG_SLD_1:'Deleguoju užduotis aiškiai ir suprantamai.',
    ENG_SLD_2:'Pasitikiu darbuotojais, kad jie atliks savo darbą.',
    ENG_SLD_3:'Leidžiu darbuotojams parodyti savo stipriąsias puses.',
    ENG_SLD_4:'Klausau darbuotojų ir nekontroliuoju smulkmenų.',
    ENG_SLD_5:'Leidžiu komandai savarankiškai spręsti paprastas problemas.',
    CHG_MAS_1:'Išlaikau tvarkingą ir organizuotą darbo ritmą.',
    CHG_MAS_2:'Mokausi iš savo klaidų.',
    CHG_MAS_3:'Teisingai sudėlioju darbo prioritetus.',
    CHG_MAS_4:'Sudėtingose situacijose išlaikau ramybę.',
    CHG_MAS_5:'Piko metu išlaikau darbingumą net esant stresui.',
    CHG_ANT_1:'Anksti pastebiu galimas problemas ar rizikas.',
    CHG_ANT_2:'Iš anksto ruošiuosi sudėtingesnėms situacijoms.',
    CHG_ANT_3:'Imuosi veiksmų dar prieš problemai padidėjant.',
    CHG_ANT_4:'Matau, kaip mano sprendimai veikia kitus procesus.',
    CHG_ANT_5:'Naudoju turimą informaciją problemų prevencijai.',
    CHG_LEAD_1:'Aiškiai paaiškinu pokyčių tikslus komandai.',
    CHG_LEAD_2:'Padedu darbuotojams prisitaikyti prie pokyčių.',
    CHG_LEAD_3:'Greitai įvedu pagerinimus, kurie duoda rezultatą.',
    CHG_LEAD_4:'Užtikrinu, kad naujos tvarkos būtų laikomasi.',
    CHG_LEAD_5:'Išklausau abejojančius darbuotojus prieš pokyčius.',
    INC_EMP_1:'Aiškiai pasakau, už ką atsakingas kiekvienas darbuotojas.',
    INC_EMP_2:'Skatinu darbuotojus rodyti iniciatyvą.',
    INC_EMP_3:'Padedu pašalinti kliūtis darbui.',
    INC_EMP_4:'Pastebiu ir įvertinu darbuotojų pastangas.',
    INC_EMP_5:'Leidžiu mokytis iš klaidų be bereikalingos baimės.',
    INC_GLB_1:'Prieš priimant sprendimus įvertinu jų poveikį gamybai.',
    INC_GLB_2:'Stengiuosi suderinti kokybę, saugą ir našumą.',
    INC_GLB_3:'Gerbiu skirtingus darbuotojų požiūrius ir patirtis.',
    INC_GLB_4:'Sprendimus grindžiu faktais ir situacija.',
    INC_GLB_5:'Matau platesnį vaizdą už savo pamainos ribų.',
    INC_DIV_1:'Išklausau skirtingas darbuotojų nuomones.',
    INC_DIV_2:'Suteikiu visiems vienodas galimybes pasisakyti.',
    INC_DIV_3:'Vertinu skirtingą darbuotojų patirtį ir žinias.',
    INC_DIV_4:'Netoleruoju nepagarbaus elgesio komandoje.',
    INC_DIV_5:'Kuriu aplinką, kurioje darbuotojai jaučiasi gerbiami.'
  };

  let ctx=null;
  const lang=()=>ctx?.language==='en'?'en':'lt';
  const storageKey=()=> 'leadership360_survey_'+token.slice(-24);

  function injectStyle(){
    if(document.getElementById('surveyEnhancementStyle'))return;
    const style=document.createElement('style');
    style.id='surveyEnhancementStyle';
    style.textContent=`
      .q-opt.q-na{grid-column:1/-1;min-height:42px;flex-direction:row;gap:8px;padding:9px 12px}
      .q-opt.q-na .q-val{font-size:.82rem;font-weight:700}
      .role-guard{position:sticky;top:0;z-index:20;border:1px solid var(--border);background:var(--surface);box-shadow:0 5px 18px rgba(0,0,0,.08);padding:11px 14px;border-radius:12px;margin-bottom:12px}
      .role-guard strong{display:block;font-size:.9rem;letter-spacing:.02em}
      .role-guard .target{font-size:.8rem;color:var(--muted);margin-top:2px}
      .observe-note{font-size:.82rem;color:var(--muted);margin:8px 0 0;line-height:1.45}
    `;
    document.head.appendChild(style);
  }

  function saveSnapshot(){
    const out={};
    document.querySelectorAll('#questions input[type=radio]:checked').forEach(x=>out[x.name]=x.value);
    try{localStorage.setItem(storageKey(),JSON.stringify(out))}catch(_){}
  }

  function updateProgress(){
    const total=document.querySelectorAll('#questions .q[data-key]').length;
    const answered=document.querySelectorAll('#questions input[type=radio]:checked').length;
    const answeredEl=document.getElementById('answeredCount');
    const totalEl=document.getElementById('totalCount');
    const bar=document.getElementById('progressBar');
    if(answeredEl)answeredEl.textContent=answered;
    if(totalEl)totalEl.textContent=total;
    if(bar)bar.style.width=(total?answered/total*100:0)+'%';
  }

  function restoreNA(){
    let data={};
    try{data=JSON.parse(localStorage.getItem(storageKey())||'{}')}catch(_){}
    Object.entries(data).forEach(([key,value])=>{
      if(value!=='__NA__')return;
      const input=document.querySelector(`input[name="${CSS.escape(key)}"][value="__NA__"]`);
      if(!input)return;
      input.checked=true;
      input.closest('.q-scale')?.querySelectorAll('.q-opt').forEach(x=>x.classList.remove('selected'));
      input.closest('.q-opt')?.classList.add('selected');
    });
    updateProgress();
  }

  function applySelfWording(){
    if(ctx?.role!=='self'||lang()!=='lt')return;
    document.querySelectorAll('#questions .q[data-key]').forEach(q=>{
      const stem=SELF_LT[q.dataset.key];
      const el=q.querySelector('.q-stem');
      if(!stem||!el)return;
      const num=el.querySelector('.q-num')?.textContent||'';
      el.textContent='';
      if(num){
        const span=document.createElement('span');
        span.className='q-num';
        span.textContent=num;
        el.appendChild(span);
        el.appendChild(document.createTextNode(' '+stem));
      }else el.textContent=stem;
    });
  }

  function enhanceQuestions(){
    if(!ctx)return;
    const tx=COPY[lang()];
    applySelfWording();
    document.querySelectorAll('#questions .q-scale').forEach(scale=>{
      if(scale.querySelector('input[value="__NA__"]'))return;
      const first=scale.querySelector('input[type=radio]');
      if(!first)return;
      const label=document.createElement('label');
      label.className='q-opt q-na';
      const naLabel=ctx.role==='self'?tx.selfNa:tx.na;
      label.innerHTML=`<input type="radio" name="${first.name}" value="__NA__"><span class="q-val">${naLabel}</span>`;
      const input=label.querySelector('input');
      input.addEventListener('change',()=>{
        scale.querySelectorAll('.q-opt').forEach(x=>x.classList.remove('selected'));
        label.classList.add('selected');
        saveSnapshot();
        updateProgress();
      });
      scale.appendChild(label);
    });
    restoreNA();
  }

  function renderRoleGuard(){
    if(!ctx||document.getElementById('roleGuard'))return;
    const tx=COPY[lang()],role=tx.roles[ctx.role]||tx.roles.other;
    const main=document.querySelector('main.wrap');
    const context=document.getElementById('contextCard');
    if(!main||!context)return;
    const guard=document.createElement('div');
    guard.id='roleGuard';
    guard.className='role-guard';
    const target=ctx.leaderName?` · ${ctx.leaderName}`:'';
    const note=ctx.role==='self'?tx.selfNote:tx.note;
    guard.innerHTML=`<strong>${tx.rolePrefix} ${role[0]}</strong><div class="target">${role[1]}${target}</div><div class="observe-note">${note}</div>`;
    main.insertBefore(guard,context);
  }

  injectStyle();

  C.inviteContext(token).then(data=>{
    ctx=data;
    renderRoleGuard();
    enhanceQuestions();
    const questions=document.getElementById('questions');
    if(questions)new MutationObserver(enhanceQuestions).observe(questions,{childList:true,subtree:true});
    setTimeout(enhanceQuestions,300);
    setTimeout(enhanceQuestions,800);
  }).catch(()=>{});
})();
