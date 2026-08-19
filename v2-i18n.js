(function(global){
  'use strict';

  const STORAGE_KEY = 'leadership360_ui_lang';

  function normalise(value){
    return String(value || '').toLowerCase().startsWith('en') ? 'en' : 'lt';
  }

  function fromHash(hash = location.hash){
    const raw = String(hash || '').replace(/^#/, '');
    const qs = new URLSearchParams(raw);
    const lang = qs.get('lang');
    return lang ? normalise(lang) : '';
  }

  function current(){
    const hashLang = fromHash();
    if(hashLang) return hashLang;
    const stored = localStorage.getItem(STORAGE_KEY);
    if(stored) return normalise(stored);
    return normalise(navigator.language || 'lt');
  }

  function set(lang, options = {}){
    const value = normalise(lang);
    localStorage.setItem(STORAGE_KEY, value);
    document.documentElement.lang = value;

    if(options.syncHash && location.hash){
      const raw = String(location.hash || '').replace(/^#/, '');
      const qs = new URLSearchParams(raw);
      qs.set('lang', value);
      history.replaceState(null, '', location.pathname + location.search + '#' + qs.toString());
    }
    return value;
  }

  function pick(copy, lang = current()){
    return copy[normalise(lang)] || copy.lt || copy.en || {};
  }

  function bindToggle(button, onChange, options = {}){
    if(!button) return;
    function render(){
      const lang = current();
      button.textContent = lang === 'lt' ? 'EN' : 'LT';
      button.setAttribute('aria-label', lang === 'lt' ? 'Switch to English' : 'Perjungti į lietuvių kalbą');
    }
    button.addEventListener('click', () => {
      const next = current() === 'lt' ? 'en' : 'lt';
      set(next, { syncHash: options.syncHash });
      render();
      if(typeof onChange === 'function') onChange(next);
    });
    render();
  }

  global.Leadership360I18n = { current, set, pick, bindToggle, normalise, fromHash };
})(window);
