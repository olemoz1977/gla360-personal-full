(() => {
  const WORKER_URL = 'https://omesg360bot.olemoz1977.workers.dev';
  const MAX_ITEMS = 3;

  function isEn(){ return document.documentElement.lang === 'en'; }
  function tx(){
    return isEn() ? {
      once:'Once',
      select:'First check 1–3 plan actions below. Telegram receives only the checked actions.',
      max:'Choose no more than 3 priority plan actions for Telegram.',
      preparing:'⏳ Preparing transfer…',
      connecting:'Connecting selected actions to @OMESG360Bot…',
      generic:'Could not prepare the transfer.',
      ready:'Ready. Opening @OMESG360Bot…',
      opening:'✅ Opening Telegram…',
      failed:'Could not send the plan to Telegram: '
    } : {
      once:'Vieną kartą',
      select:'Pirma pažymėkite 1–3 plano veiksmus varnelėmis žemiau. Telegram perduoda tik pažymėtus veiksmus.',
      max:'Telegram pasirinkite ne daugiau kaip 3 svarbiausius plano veiksmus.',
      preparing:'⏳ Ruošiamas perdavimas…',
      connecting:'Jungiu pasirinktus veiksmus su @OMESG360Bot…',
      generic:'Nepavyko paruošti perdavimo.',
      ready:'Paruošta. Atidarau @OMESG360Bot…',
      opening:'✅ Atidaromas Telegram…',
      failed:'Nepavyko perduoti plano į Telegram: '
    };
  }

  function pad(n){ return String(n).padStart(2, '0'); }
  function isoDate(date){ return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }
  function addDays(base, days){ const d = new Date(base); d.setHours(12,0,0,0); d.setDate(d.getDate()+days); return d; }
  function phaseOffset(phase){ if(phase === 'p2') return 30; if(phase === 'p3') return 60; return 0; }

  function itemDayOffset(freq, phase){
    const base = phaseOffset(phase);
    const f = String(freq || '').toLowerCase();
    if(
      f.includes('kas savaitę') || f.includes('kas susitikimas') || f.includes('kas 2 sav') ||
      f.includes('kas mėnesį') || f.includes('kas pirmadienį') || f.includes('kas penktadienį') || f.includes('kasdien') ||
      f.includes('weekly') || f.includes('every meeting') || f.includes('every 2 weeks') ||
      f.includes('monthly') || f.includes('every monday') || f.includes('every friday') || f.includes('daily')
    ) return base;
    const dayMatch = f.match(/(?:day\s*)?(\d+)/);
    if(dayMatch) return Math.max(0, parseInt(dayMatch[1],10)-1);
    return base;
  }

  function selectedItems(startDate){
    const t = tx();
    return Array.from(document.querySelectorAll('.cal-cb:checked')).map(cb => {
      const row = cb.closest('.action-item');
      if(!row) return null;
      const frequency = row.dataset.freq || t.once;
      const phase = row.dataset.phase || 'p1';
      const dueDate = isoDate(addDays(startDate, itemDayOffset(frequency, phase)));
      return { text:row.dataset.text||'', frequency, phase, competency:row.dataset.comp||'', dueDate };
    }).filter(Boolean);
  }

  function inlineStatus(){
    const button = document.getElementById('botSyncBtn');
    if(!button) return null;
    let el = document.getElementById('botSyncInlineStatus');
    if(el) return el;
    el = document.createElement('div'); el.id='botSyncInlineStatus'; el.style.width='100%'; el.style.fontSize='.82rem'; el.style.marginTop='2px'; el.style.color='var(--muted)';
    button.parentElement?.appendChild(el); return el;
  }
  function setStatus(text,isError=false){
    const color=isError?'var(--danger, #c0392b)':'var(--muted)',top=inlineStatus();
    if(top){top.textContent=text;top.style.color=color}
    const el=document.getElementById('botSyncStatus'); if(el){el.textContent=text;el.style.color=color}
  }
  function showProblem(text){setStatus(text,true);window.alert(text)}

  function wire({startDate}={}){
    const button=document.getElementById('botSyncBtn'); if(!button||button.dataset.wired==='1')return;
    button.dataset.wired='1'; inlineStatus(); const planStart=startDate instanceof Date?startDate:new Date();
    button.addEventListener('click',async()=>{
      const t=tx(),items=selectedItems(planStart);
      if(!items.length){showProblem(t.select);return}
      if(items.length>MAX_ITEMS){showProblem(t.max);return}
      const originalLabel=button.textContent;button.disabled=true;button.textContent=t.preparing;setStatus(t.connecting);
      try{
        const response=await fetch(`${WORKER_URL}/plan/import`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({version:1,source:'leadership360',lang:isEn()?'en':'lt',startDate:isoDate(planStart),items})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok||!data.telegramUrl)throw new Error(data.error||`HTTP ${response.status}`||t.generic);
        setStatus(t.ready);button.textContent=t.opening;window.location.href=data.telegramUrl;
      }catch(error){showProblem(t.failed+(error?.message||error));button.disabled=false;button.textContent=originalLabel}
    });
  }
  window.Leadership360BotSync={wire};
})();
