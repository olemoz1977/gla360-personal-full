(() => {
  function isEn(){ return document.documentElement.lang === 'en'; }

  function text(){
    return isEn() ? {
      title:'Finish and export',
      intro:'Choose 1–3 actions you really want to follow. Calendar and Telegram receive only those selected actions; PDF keeps the full plan.',
      noSelection:'Choose 1–3 plan actions to enable Calendar and Telegram.',
      selected:n => `${n} action${n===1?'':'s'} selected for Calendar and Telegram.`,
      tooMany:n => `${n} actions selected. Keep no more than 3 for Calendar and Telegram.`,
      calendar:'📅 Export selected to calendar (.ics)',
      telegram:'📲 Send selected to Telegram',
      print:'🖨️ Print full plan / PDF'
    } : {
      title:'Plano užbaigimas ir eksportas',
      intro:'Pažymėkite 1–3 veiksmus, kurių iš tikrųjų norite laikytis. Į kalendorių ir Telegram perduodami tik pasirinkti veiksmai, o PDF išsaugo visą planą.',
      noSelection:'Pažymėkite 1–3 plano veiksmus, kad suaktyvėtų Kalendorius ir Telegram.',
      selected:n => `Kalendoriui ir Telegram pasirinkta veiksmų: ${n}.`,
      tooMany:n => `Pažymėta ${n} veiksmų. Kalendoriui ir Telegram palikite ne daugiau kaip 3.`,
      calendar:'📅 Pasirinktus į kalendorių (.ics)',
      telegram:'📲 Pasirinktus į Telegram',
      print:'🖨️ Visas planas / PDF'
    };
  }

  function installLanguageToggle(){
    if(!/plan-direct\.html$/i.test(location.pathname) || document.getElementById('planDirectLangToggle')) return;
    const navInner = document.querySelector('nav > div');
    if(!navInner) return;
    const link = document.createElement('a');
    link.id = 'planDirectLangToggle';
    link.href = isEn() ? 'plan-direct.html?lang=lt' : 'plan-direct.html?lang=en';
    link.textContent = isEn() ? 'LT' : 'EN';
    link.setAttribute('aria-label', isEn() ? 'Perjungti į lietuvių kalbą' : 'Switch to English');
    link.style.cssText = 'margin-left:auto;border:1px solid var(--border);background:var(--surface);color:var(--brand);border-radius:9px;padding:5px 10px;text-decoration:none;font-size:.82rem;font-weight:700;';
    navInner.appendChild(link);
  }

  function selectedCount(){
    return document.querySelectorAll('.cal-cb:checked').length;
  }

  function updateActionState(){
    const calendar = document.getElementById('exportIcs');
    const telegram = document.getElementById('botSyncBtn');
    const helper = document.getElementById('planExportTelegramHelp');
    if(!calendar || !telegram || !helper) return;
    const t = text();
    const count = selectedCount();
    const valid = count >= 1 && count <= 3;

    [calendar, telegram].forEach(button => {
      button.disabled = !valid;
      button.setAttribute('aria-disabled', valid ? 'false' : 'true');
    });

    helper.textContent = count === 0 ? t.noSelection : count > 3 ? t.tooMany(count) : t.selected(count);
    helper.style.color = count > 3 ? 'var(--danger, #c0392b)' : 'var(--muted)';
  }

  function install(){
    installLanguageToggle();
    if(document.getElementById('planExportCard')) return;
    const output = document.getElementById('planOutput');
    const calendar = document.getElementById('exportIcs');
    const telegram = document.getElementById('botSyncBtn');
    const print = output?.querySelector('button[onclick*="window.print"]');
    if(!output || !calendar || !telegram || !print) return;

    const anchor = document.getElementById('botCard') || output.lastElementChild;
    const card = document.createElement('section');
    card.className = 'card no-print';
    card.id = 'planExportCard';
    const t = text();
    card.innerHTML = `
      <h2>${t.title}</h2>
      <p class="muted" style="margin-bottom:14px;">${t.intro}</p>
      <div id="planExportActions" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
      <p id="planExportTelegramHelp" class="muted" style="font-size:.82rem;margin-top:10px;"></p>`;
    if(anchor) output.insertBefore(card, anchor); else output.appendChild(card);

    const host = card.querySelector('#planExportActions');
    host.append(calendar, telegram, print);

    calendar.textContent = t.calendar;
    telegram.textContent = t.telegram;
    print.textContent = t.print;

    Array.from(output.querySelectorAll('.no-print')).forEach(el => {
      if(el !== card && el.children.length === 0 && !String(el.textContent||'').trim()) el.remove();
    });

    document.addEventListener('change', e => {
      if(e.target && e.target.classList && e.target.classList.contains('cal-cb')) updateActionState();
    });
    updateActionState();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
