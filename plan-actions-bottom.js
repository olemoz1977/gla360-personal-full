(() => {
  function isEn(){ return document.documentElement.lang === 'en'; }

  function text(){
    return isEn() ? {
      title:'Finish and export',
      intro:'Review the plan first. Calendar and PDF export the full plan. Telegram receives only 1–3 actions you choose to follow.',
      noSelection:'Choose 1–3 actions in the plan to enable Telegram.',
      selected:n => `${n} action${n===1?'':'s'} selected for Telegram.`,
      tooMany:n => `${n} actions selected. Keep no more than 3 for Telegram.`
    } : {
      title:'Plano užbaigimas ir eksportas',
      intro:'Pirmiausia peržiūrėkite planą. Kalendorius ir PDF eksportuoja visą planą. Į Telegram perduodami tik 1–3 jūsų pasirinkti veiksmai.',
      noSelection:'Pažymėkite 1–3 plano veiksmus, kad būtų galima perduoti juos į Telegram.',
      selected:n => `Telegram pasirinkta veiksmų: ${n}.`,
      tooMany:n => `Pažymėta ${n} veiksmų. Telegram palikite ne daugiau kaip 3.`
    };
  }

  function selectedCount(){
    return document.querySelectorAll('.cal-cb:checked').length;
  }

  function updateTelegramState(){
    const button = document.getElementById('botSyncBtn');
    const helper = document.getElementById('planExportTelegramHelp');
    if(!button || !helper) return;
    const t = text();
    const count = selectedCount();
    const valid = count >= 1 && count <= 3;
    button.disabled = !valid;
    button.setAttribute('aria-disabled', valid ? 'false' : 'true');
    helper.textContent = count === 0 ? t.noSelection : count > 3 ? t.tooMany(count) : t.selected(count);
    helper.style.color = count > 3 ? 'var(--danger, #c0392b)' : 'var(--muted)';
  }

  function install(){
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

    const oldActionParent = calendar.parentElement;
    // Buttons have already been moved; remove empty legacy action wrapper if one remains.
    Array.from(output.querySelectorAll('.no-print')).forEach(el => {
      if(el !== card && el.children.length === 0 && !String(el.textContent||'').trim()) el.remove();
    });

    document.addEventListener('change', e => {
      if(e.target && e.target.classList && e.target.classList.contains('cal-cb')) updateTelegramState();
    });
    updateTelegramState();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
