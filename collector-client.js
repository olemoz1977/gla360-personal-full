// Leadership 360° browser client for the pseudonymous collector.
// Management secrets are kept in URL fragments/local browser state and are never
// sent as query parameters. Raw 360 responses never pass through OMESG360Bot.
(function(global){
  'use strict';

  const DEFAULT_API = 'https://leadership-360-collector.olemoz1977.workers.dev';

  function apiBase(){
    const override = global.LEADERSHIP360_COLLECTOR_API || localStorage.getItem('leadership360_collector_api');
    return String(override || DEFAULT_API).replace(/\/+$/, '');
  }

  async function request(path, options = {}){
    const headers = new Headers(options.headers || {});
    if(options.json !== undefined){
      headers.set('content-type', 'application/json');
    }
    if(options.manageToken){
      headers.set('authorization', 'Bearer ' + options.manageToken);
    }

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

  function parseManageHash(hash = location.hash){
    const raw = String(hash || '').replace(/^#/, '');
    const qs = new URLSearchParams(raw);
    return {
      assessmentId: qs.get('aid') || '',
      manageToken: qs.get('key') || '',
      cycle: Math.max(1, Number(qs.get('cycle') || 1) || 1)
    };
  }

  function manageHash({ assessmentId, manageToken, cycle = 1 }){
    const qs = new URLSearchParams();
    qs.set('aid', assessmentId);
    qs.set('key', manageToken);
    qs.set('cycle', String(cycle));
    return '#' + qs.toString();
  }

  function guardianUrl({ assessmentId, manageToken, cycle = 1 }){
    const u = new URL('guardian.html', location.href);
    u.search = '';
    u.hash = manageHash({ assessmentId, manageToken, cycle });
    return u.toString();
  }

  function reportUrl({ assessmentId, manageToken, cycle = 1 }){
    const u = new URL('report-v2.html', location.href);
    u.search = '';
    u.hash = manageHash({ assessmentId, manageToken, cycle });
    return u.toString();
  }

  function compareUrl({ assessmentId, manageToken }){
    const u = new URL('compare-v2.html', location.href);
    u.search = '';
    u.hash = manageHash({ assessmentId, manageToken, cycle: 2 });
    return u.toString();
  }

  const api = {
    apiBase,
    health: () => request('/health'),
    createAssessment: payload => request('/api/assessments', { json: payload }),
    inviteContext: token => request('/api/invite/' + encodeURIComponent(token)),
    submitInvite: (token, payload) => request('/api/invite/' + encodeURIComponent(token) + '/submit', { json: payload }),
    cycleStatus: (assessmentId, cycle, manageToken) => request('/api/manage/' + encodeURIComponent(assessmentId) + '/cycles/' + Number(cycle) + '/status', { manageToken }),
    exportCycle: (assessmentId, cycle, manageToken) => request('/api/manage/' + encodeURIComponent(assessmentId) + '/cycles/' + Number(cycle) + '/export', { manageToken }),
    sendInvitations: (assessmentId, cycle, manageToken) => request('/api/manage/' + encodeURIComponent(assessmentId) + '/cycles/' + Number(cycle) + '/send', { method:'POST', manageToken, json:{} }),
    createNextCycle: (assessmentId, manageToken, payload = {}) => request('/api/manage/' + encodeURIComponent(assessmentId) + '/cycles', { manageToken, json: payload }),
    deleteAssessment: (assessmentId, manageToken) => request('/api/manage/' + encodeURIComponent(assessmentId), { method:'DELETE', manageToken }),
    parseManageHash,
    manageHash,
    guardianUrl,
    reportUrl,
    compareUrl
  };

  global.Leadership360Collector = api;
})(window);
