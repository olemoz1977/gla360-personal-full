(function(){
  'use strict';
  const C = window.Leadership360Collector;
  const el = document.getElementById('collectorState');
  if(!C || !el) return;

  function currentLang(){
    return document.documentElement.lang === 'en' ? 'en' : 'lt';
  }

  function detailFrom(error){
    const data = error && error.data;
    if(data && typeof data === 'object'){
      return [data.error, data.detail].filter(Boolean).join(' · ');
    }
    return error && error.message ? error.message : 'unknown_error';
  }

  async function probe(){
    try {
      await C.health();
      const lang = currentLang();
      el.innerHTML = '<span class="status-dot ok"></span>' +
        (lang === 'lt' ? 'Collector pasiekiamas' : 'Collector is reachable');
    } catch(error){
      const lang = currentLang();
      const detail = detailFrom(error);
      const api = C.apiBase();
      el.innerHTML = '<span class="status-dot bad"></span>' +
        (lang === 'lt' ? 'Collector klaida: ' : 'Collector error: ') +
        '<code style="font-size:.78em">' + String(detail).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) + '</code>' +
        '<div style="font-size:.72rem;margin-top:6px;word-break:break-all">' + api + '/health</div>';
    }
  }

  setTimeout(probe, 250);
})();
