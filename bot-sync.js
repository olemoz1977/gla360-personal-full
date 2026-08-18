(() => {
  // Leadership 360° → OMESG360Bot handoff client.
  const WORKER_URL = 'https://omesg360bot.olemoz1977.workers.dev';
  const MAX_ITEMS = 3;

  function pad(n){ return String(n).padStart(2, '0'); }

  function isoDate(date){
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  }

  function addDays(base, days){
    const d = new Date(base);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d;
  }

  function phaseOffset(phase){
    if(phase === 'p2') return 30;
    if(phase === 'p3') return 60;
    return 0;
  }

  function itemDayOffset(freq, phase){
    const base = phaseOffset(phase);
    const f = String(freq || '').toLowerCase();
    if(f.includes('kas savaitę') || f.includes('kas susitikimas')) return base;
    if(f.includes('kas 2 sav')) return base;
    if(f.includes('kas mėnesį')) return base;
    if(f.includes('kas pirmadienį')) return base;
    if(f.includes('kas penktadienį')) return base;
    if(f.includes('kasdien')) return base;
    const dayMatch = f.match(/(\d+)/);
    if(dayMatch) return Math.max(0, parseInt(dayMatch[1], 10) - 1);
    return base;
  }

  function selectedItems(startDate){
    return Array.from(document.querySelectorAll('.cal-cb:checked')).map(cb => {
      const row = cb.closest('.action-item');
      if(!row) return null;
      const frequency = row.dataset.freq || 'Vieną kartą';
      const phase = row.dataset.phase || 'p1';
      const dueDate = isoDate(addDays(startDate, itemDayOffset(frequency, phase)));
      return {
        text: row.dataset.text || '',
        frequency,
        phase,
        competency: row.dataset.comp || '',
        dueDate
      };
    }).filter(Boolean);
  }

  function inlineStatus(){
    const button = document.getElementById('botSyncBtn');
    if(!button) return null;
    let el = document.getElementById('botSyncInlineStatus');
    if(el) return el;
    el = document.createElement('div');
    el.id = 'botSyncInlineStatus';
    el.style.width = '100%';
    el.style.fontSize = '.82rem';
    el.style.marginTop = '2px';
    el.style.color = 'var(--muted)';
    button.parentElement?.appendChild(el);
    return el;
  }

  function setStatus(text, isError = false){
    const color = isError ? 'var(--danger, #c0392b)' : 'var(--muted)';
    const top = inlineStatus();
    if(top){
      top.textContent = text;
      top.style.color = color;
    }
    const el = document.getElementById('botSyncStatus');
    if(el){
      el.textContent = text;
      el.style.color = color;
    }
  }

  function showProblem(text){
    setStatus(text, true);
    window.alert(text);
  }

  function wire({ startDate } = {}){
    const button = document.getElementById('botSyncBtn');
    if(!button || button.dataset.wired === '1') return;
    button.dataset.wired = '1';
    inlineStatus();

    const planStart = startDate instanceof Date ? startDate : new Date();

    button.addEventListener('click', async () => {
      const items = selectedItems(planStart);
      if(!items.length){
        showProblem('Pirma pažymėkite 1–3 plano veiksmus varnelėmis žemiau. Telegram perduoda tik pažymėtus veiksmus.');
        return;
      }
      if(items.length > MAX_ITEMS){
        showProblem('Telegram pasirinkite ne daugiau kaip 3 svarbiausius plano veiksmus.');
        return;
      }

      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = '⏳ Ruošiamas perdavimas…';
      setStatus('Jungiu pasirinktus veiksmus su @OMESG360Bot…');

      try {
        const response = await fetch(`${WORKER_URL}/plan/import`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            version: 1,
            source: 'leadership360',
            lang: document.documentElement.lang === 'en' ? 'en' : 'lt',
            startDate: isoDate(planStart),
            items
          })
        });

        const data = await response.json().catch(() => ({}));
        if(!response.ok || !data.telegramUrl){
          throw new Error(data.error || `HTTP ${response.status}` || 'Nepavyko paruošti perdavimo.');
        }

        setStatus('Paruošta. Atidarau @OMESG360Bot…');
        button.textContent = '✅ Atidaromas Telegram…';
        window.location.href = data.telegramUrl;
      } catch(error){
        const message = `Nepavyko perduoti plano į Telegram: ${error?.message || error}`;
        showProblem(message);
        button.disabled = false;
        button.textContent = originalLabel;
      }
    });
  }

  window.Leadership360BotSync = { wire };
})();
