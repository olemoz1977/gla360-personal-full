(() => {
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

  function setStatus(text, isError = false){
    const el = document.getElementById('botSyncStatus');
    if(!el) return;
    el.textContent = text;
    el.style.color = isError ? 'var(--danger)' : 'var(--muted)';
  }

  function wire({ startDate } = {}){
    const button = document.getElementById('botSyncBtn');
    if(!button || button.dataset.wired === '1') return;
    button.dataset.wired = '1';

    const planStart = startDate instanceof Date ? startDate : new Date();

    button.addEventListener('click', async () => {
      const items = selectedItems(planStart);
      if(!items.length){
        setStatus('Pažymėk 1–3 plano veiksmus varnelėmis.', true);
        return;
      }
      if(items.length > MAX_ITEMS){
        setStatus('Botui pasirink ne daugiau kaip 3 svarbiausius veiksmus.', true);
        return;
      }

      button.disabled = true;
      setStatus('Ruošiu saugų perdavimą į Telegram…');

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
          throw new Error(data.error || 'Nepavyko paruošti perdavimo.');
        }

        setStatus('Paruošta. Atidarau @OMESG360Bot…');
        window.location.assign(data.telegramUrl);
      } catch(error){
        setStatus(`Nepavyko perduoti plano: ${error.message || error}`, true);
        button.disabled = false;
      }
    });
  }

  window.Leadership360BotSync = { wire };
})();
