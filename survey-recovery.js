(function(){
  'use strict';
  const C=window.Leadership360Collector;
  const token=new URLSearchParams(location.search).get('invite')||'';
  if(!C||!token)return;

  const COPY={
    lt:{sub:'Konfidencialus lyderystės vertinimas',progress:'Pažanga',submit:'Pateikti atsakymus',backup:'⬇ Atsarginė JSON kopija',privacyLink:'🔒 Privatumas',privacy:'Atsakymas pateikiamas į pseudoniminį Leadership 360° surinkimą. Vertintojo el. paštas nėra įrašomas į atsakymo duomenis.',scale:['Beveik niekada','Retai','Kartais','Dažnai','Beveik visada'],openTitle:'Atviri klausimai',optional:'Neprivaloma',str:'Stiprybės – kuo šis žmogus išsiskiria?',strPh:'Konkretūs pavyzdžiai…',dev:'Ką rekomenduotumėte tobulinti per artimiausius 90 dienų?',devPh:'Konkretūs elgesiai ir situacijos…',real:'Vertinkite realų elgesį – ne kaip turėtų būti, o kaip iš tikrųjų yra.',guardian:'Sergėtojas',roles:{self:['Savivertinimas','Jūs vertinate save.'],boss:['Pavaldinio vertinimas','Jūs vertinate savo pavaldinį.'],peer:['Kolegos vertinimas','Jūs vertinate savo kolegą.'],report:['Vadovo vertinimas','Jūs vertinate savo tiesioginį vadovą.'],other:['Darbo partnerio vertinimas','Jūs vertinate darbo partnerį.']}},
    en:{sub:'Confidential leadership assessment',progress:'Progress',submit:'Submit responses',backup:'⬇ Backup JSON copy',privacyLink:'🔒 Privacy',privacy:'Your response is submitted to the pseudonymous Leadership 360° collector. Your evaluator email address is not stored with the response.',scale:['Almost never','Rarely','Sometimes','Often','Almost always'],openTitle:'Open questions',optional:'Optional',str:'What strengths does this person demonstrate?',strPh:'Specific examples…',dev:'What would you recommend improving over the next 90 days?',devPh:'Specific behaviours and situations…',real:'Rate observed behaviour – what actually happens, not what ideally should happen.',guardian:'Guardian',roles:{self:['Self assessment','You are rating yourself.'],boss:['Direct report assessment','You are rating your direct report.'],peer:['Peer assessment','You are rating a colleague.'],report:['Manager assessment','You are rating your direct manager.'],other:['Work partner assessment','You are rating a work partner.']}}
  };

  function updateProgress(){
    const total=document.querySelectorAll('#questions .q[data-key]').length;
    const answered=document.querySelectorAll('#questions input[type=radio]:checked').length;
    const a=document.getElementById('answeredCount'),t=document.getElementById('totalCount'),b=document.getElementById('progressBar');
    if(a)a.textContent=answered;if(t)t.textContent=total;if(b)b.style.width=(total?answered/total*100:0)+'%';
  }

  function translate(key,lang){
    try{return lang==='lt'&&typeof GLA!=='undefined'&&GLA.lt?GLA.lt(key):key}catch(_){return key}
  }

  async function recover(){
    if(document.querySelector('#questions .q[data-key]'))return;
    const context=document.getElementById('contextCard');
    if(!context)return;
    try{
      const ctx=await C.inviteContext(token);
      if(document.querySelector('#questions .q[data-key]'))return;
      const lang=ctx.language==='en'?'en':'lt',tx=COPY[lang],role=tx.roles[ctx.role]||tx.roles.other;
      document.documentElement.lang=lang;
      if(ctx.completed){context.innerHTML='<div class="alert info">'+(lang==='lt'?'Šis kvietimas jau panaudotas.':'This invitation has already been used.')+'</div>';return;}
      const path=lang==='en'?'bank/questions.en.json':'bank/questions.json';
      const r=await fetch(path+'?recovery='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error('bank_'+r.status);
      const bank=await r.json();
      window.__leadership360RecoveryBank=bank;
      const head=document.getElementById('headSub');if(head)head.textContent=tx.sub;
      const progress=document.getElementById('progressLabel');if(progress)progress.textContent=tx.progress;
      const submit=document.getElementById('submitBtn');if(submit)submit.textContent=tx.submit;
      const backup=document.getElementById('backupBtn');if(backup)backup.textContent=tx.backup;
      const privacyLink=document.getElementById('privacyLink');if(privacyLink){privacyLink.textContent=tx.privacyLink;privacyLink.href=C.privacyUrl(lang)}
      const privacyNote=document.getElementById('privacyNote');if(privacyNote)privacyNote.textContent=tx.privacy;
      context.innerHTML=`<span class="role-badge">${role[0]}</span><h2 style="margin-top:10px">${ctx.leaderName||'Leadership 360°'}</h2>${ctx.projectName?`<p class="muted">${ctx.projectName} · C${ctx.cycle}</p>`:''}<p style="margin-top:8px">${role[1]} ${tx.real}</p><p class="muted" style="font-size:.82rem;margin-top:8px">${tx.guardian}: ${ctx.guardian?.name||'—'}${ctx.guardian?.email?' · '+ctx.guardian.email:''}</p>`;

      let html='',q=0;
      (bank.competencies||[]).forEach(comp=>{
        html+=`<div class="comp-block"><div class="comp-header"><span class="comp-cluster">${translate(comp.cluster,lang)}</span><span class="comp-name">${translate(comp.name,lang)}</span></div>`;
        (comp.items||[]).forEach(item=>{
          q++;
          html+=`<div class="q" data-key="${item.key}"><div class="q-stem"><span class="q-num">${q}.</span> ${item.stem}</div><div class="q-scale">${[1,2,3,4,5].map((n,i)=>`<label class="q-opt"><input type="radio" name="${item.key}" value="${n}"><span class="q-val">${n}</span><span class="q-label">${tx.scale[i]}</span></label>`).join('')}</div></div>`;
        });
        html+='</div>';
      });
      html+=`<div class="comp-block open-block"><div class="comp-header"><span class="comp-cluster">${tx.openTitle}</span><span class="comp-name">${tx.optional}</span></div><div class="open-q"><label>${tx.str}<textarea id="open_str" rows="3" placeholder="${tx.strPh}"></textarea></label></div><div class="open-q"><label>${tx.dev}<textarea id="open_dev" rows="3" placeholder="${tx.devPh}"></textarea></label></div></div>`;
      const host=document.getElementById('questions');host.innerHTML=html;
      document.getElementById('progressCard').style.display='block';
      document.getElementById('actions').style.display='block';
      document.querySelectorAll('.q-opt input').forEach(el=>el.addEventListener('change',()=>{el.closest('.q-scale').querySelectorAll('.q-opt').forEach(x=>x.classList.remove('selected'));el.closest('.q-opt').classList.add('selected');updateProgress();}));
      updateProgress();
    }catch(e){
      if(!document.querySelector('#questions .q[data-key]')) context.innerHTML='<div class="alert">'+(document.documentElement.lang==='en'?'Could not load the survey. Please reload the page.':'Nepavyko įkelti apklausos. Perkraukite puslapį.')+'</div>';
    }
  }

  setTimeout(recover,900);
  setTimeout(recover,2200);
})();