// Leadership 360° browser client for the pseudonymous collector.
// Management secrets are kept in URL fragments/local browser state and are never
// sent as query parameters. Raw 360 responses never pass through OMESG360Bot.
(function(global){
  'use strict';

  const DEFAULT_API = 'https://leadership-360-collector.olemoz1977.workers.dev';
  const inviteContextPromises = new Map();

  function apiBase(){
    const override = global.LEADERSHIP360_COLLECTOR_API || localStorage.getItem('leadership360_collector_api');
    return String(override || DEFAULT_API).replace(/\/+$/, '');
  }

  async function request(path, options = {}){
    const headers = new Headers(options.headers || {});
    if(options.json !== undefined) headers.set('content-type', 'application/json');
    if(options.manageToken) headers.set('authorization', 'Bearer ' + options.manageToken);

    let response;
    try {
      response = await fetch(apiBase() + path, {
        method: options.method || (options.json !== undefined ? 'POST' : 'GET'),
        headers,
        body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
        cache: 'no-store'
      });
    } catch(error){
      const e = new Error('collector_unreachable');
      e.cause = error;
      throw e;
    }

    let data = null;
    try { data = await response.json(); } catch(_) {}
    if(!response.ok){
      const e = new Error(data?.error || ('http_' + response.status));
      e.status = response.status;
      e.data = data;
      throw e;
    }
    return data;
  }

  function inviteContext(token){
    const key=String(token||'');
    if(!inviteContextPromises.has(key)){
      const p=request('/api/invite/' + encodeURIComponent(key)).catch(error=>{
        inviteContextPromises.delete(key);
        throw error;
      });
      inviteContextPromises.set(key,p);
    }
    return inviteContextPromises.get(key);
  }

  function normaliseLang(value){
    return String(value || '').toLowerCase().startsWith('en') ? 'en' : 'lt';
  }

  function parseManageHash(hash = location.hash){
    const raw = String(hash || '').replace(/^#/, '');
    const qs = new URLSearchParams(raw);
    return {
      assessmentId: qs.get('aid') || '',
      manageToken: qs.get('key') || '',
      cycle: Math.max(1, Number(qs.get('cycle') || 1) || 1),
      lang: normaliseLang(qs.get('lang') || localStorage.getItem('leadership360_ui_lang') || navigator.language || 'lt')
    };
  }

  function manageHash({ assessmentId, manageToken, cycle = 1, lang = 'lt' }){
    const qs = new URLSearchParams();
    qs.set('aid', assessmentId);
    qs.set('key', manageToken);
    qs.set('cycle', String(cycle));
    qs.set('lang', normaliseLang(lang));
    return '#' + qs.toString();
  }

  function pageUrl(page, auth){
    const u = new URL(page, location.href);
    u.search = '';
    u.hash = manageHash(auth);
    return u.toString();
  }

  function guardianUrl(auth){ return pageUrl('guardian.html', auth); }
  function reportUrl(auth){ return pageUrl('report-v2.html', auth); }
  function compareUrl(auth){ return pageUrl('compare-v2.html', { ...auth, cycle: 2 }); }
  function privacyUrl(lang = 'lt'){
    const u = new URL('PRIVACY-v2.html', location.href);
    u.searchParams.set('lang', normaliseLang(lang));
    u.hash = '';
    return u.toString();
  }

  const api = {
    apiBase,
    health: () => request('/health'),
    createAssessment: payload => request('/api/assessments', { json: payload }),
    inviteContext,
    submitInvite: (token, payload) => request('/api/invite/' + encodeURIComponent(token) + '/submit', { json: payload }),
    cycleStatus: (assessmentId, cycle, manageToken) => request('/api/manage/' + encodeURIComponent(assessmentId) + '/cycles/' + Number(cycle) + '/status', { manageToken }),
    exportCycle: (assessmentId, cycle, manageToken) => request('/api/manage/' + encodeURIComponent(assessmentId) + '/cycles/' + Number(cycle) + '/export', { manageToken }),
    recoverInvites: (assessmentId, cycle, manageToken) => request('/api/manage/' + encodeURIComponent(assessmentId) + '/cycles/' + Number(cycle) + '/invites', { manageToken }),
    sendInvitations: (assessmentId, cycle, manageToken) => request('/api/manage/' + encodeURIComponent(assessmentId) + '/cycles/' + Number(cycle) + '/send', { method:'POST', manageToken, json:{} }),
    createNextCycle: (assessmentId, manageToken, payload = {}) => request('/api/manage/' + encodeURIComponent(assessmentId) + '/cycles', { manageToken, json: payload }),
    deleteAssessment: (assessmentId, manageToken) => request('/api/manage/' + encodeURIComponent(assessmentId), { method:'DELETE', manageToken }),
    parseManageHash,
    manageHash,
    guardianUrl,
    reportUrl,
    compareUrl,
    privacyUrl,
    normaliseLang
  };

  global.Leadership360Collector = api;

  function loadHelper(src){
    const script=document.createElement('script');
    script.src=src;
    script.defer=true;
    document.head.appendChild(script);
  }

  // Progressive enhancements are kept outside the stable page files.
  if(/\/survey-v2\.html$/i.test(location.pathname)){
    loadHelper('survey-recovery.js?v=20260820-1');
    loadHelper('survey-enhancements-safe.js?v=20260820-2');
    loadHelper('survey-self-reflection.js?v=20260820-1');
  }
  if(/\/report-v2\.html$/i.test(location.pathname)){
    loadHelper('report-coverage.js?v=20260820-3');
    loadHelper('report-interpretation.js?v=20260820-1');
    loadHelper('report-plan-link.js?v=20260820-2');
    loadHelper('report-radar-safe.js?v=20260820-8');
  }
  if(/\/guardian\.html$/i.test(location.pathname)){
    loadHelper('guardian-invites.js?v=20260820-2');
    loadHelper('guardian-workspace.js?v=20260820-1');
  }
  if(/\/setup-v2\.html$/i.test(location.pathname)){
    loadHelper('guardian-workspace.js?v=20260820-1');
  }
})(window);
