(function(){
  'use strict';

  const C=window.Leadership360Collector;
  const token=new URLSearchParams(location.search).get('invite')||'';
  if(!C||!token)return;

  const COPY={
    lt:{
      na:'Neteko stebėti / negaliu įvertinti',
      rolePrefix:'Jūs pildote:',
      roles:{
        self:['SAVIVERTINIMĄ','Vertinate save'],
        boss:['VADOVO VERTINIMĄ','Vertinate savo pavaldinį'],
        peer:['KOLEGOS VERTINIMĄ','Vertinate savo kolegą'],
        report:['PAVALDINIO VERTINIMĄ','Vertinate savo vadovą'],
        other:['DARBO PARTNERIO VERTINIMĄ','Vertinate darbo partnerį']
      },
      note:'Jei konkretaus elgesio neteko stebėti, nespekuliuokite. Pasirinkite „Neteko stebėti / negaliu įvertinti“. Šis pasirinkimas į balo vidurkį neįtraukiamas.'
    },
    en:{
      na:'Not observed / cannot assess',
      rolePrefix:'You are completing:',
      roles:{
        self:['SELF-ASSESSMENT','You are rating yourself'],
        boss:['MANAGER ASSESSMENT','You are rating your direct report'],
        peer:['PEER ASSESSMENT','You are rating your colleague'],
        report:['DIRECT-REPORT ASSESSMENT','You are rating your manager'],
        other:['WORK-PARTNER ASSESSMENT','You are rating a work partner']
      },
      note:'If you have not observed a specific behaviour, do not guess. Choose “Not observed / cannot assess”. This choice is excluded from score averages.'
    }
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

  function enhanceQuestions(){
    if(!ctx)return;
    const tx=COPY[lang()];
    document.querySelectorAll('#questions .q-scale').forEach(scale=>{
      if(scale.querySelector('input[value="__NA__"]'))return;
      const first=scale.querySelector('input[type=radio]');
      if(!first)return;
      const label=document.createElement('label');
      label.className='q-opt q-na';
      label.innerHTML=`<input type="radio" name="${first.name}" value="__NA__"><span class="q-val">${tx.na}</span>`;
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
    guard.innerHTML=`<strong>${tx.rolePrefix} ${role[0]}</strong><div class="target">${role[1]}${target}</div><div class="observe-note">${tx.note}</div>`;
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
