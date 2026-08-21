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

  function isTestOrigin(){
    const origin=String(location.origin||'');
    return origin==='https://olemoz1977.github.io' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  }

  function qaMode(){
    if(!isTestOrigin())return false;
    const query=new URLSearchParams(location.search||'');
    if(query.get('qa')==='1')return true;
    const hash=new URLSearchParams(String(location.hash||'').replace(/^#/,''));
    return hash.get('qa')==='1';
  }

  function qaPath(path){
    if(!qaMode())return path;
    return path+(path.includes('?')?'&':'?')+'qa=1';
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

  function stripInviteUrls(data){
    if(!data || !Array.isArray(data.invites))return data;
    return {
      ...data,
      testMode:false,
      invites:data.invites.map(inv=>{
        const safe={...(inv||{})};
        delete safe.url;
        delete safe.token;
        return safe;
      })
    };
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
    if(qaMode())u.searchParams.set('qa','1');
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

  function cycleStatus(assessmentId, cycle, manageToken){
    return request('/api/manage/' + encodeURIComponent(assessmentId) + '/cycles/' + Number(cycle) + '/status', { manageToken });
  }

  // Until the Worker policy wrapper is deployed, the legacy /invites endpoint can
  // return survey URLs on the GitHub test origin. Normal guardian UI therefore
  // derives only aggregate completion rows from the safe /status endpoint.
  async function recoverInvites(assessmentId, cycle, manageToken){
    const status=await cycleStatus(assessmentId,cycle,manageToken);
    const invites=[];
    for(const group of status.groups||[]){
      const total=Math.max(0,Number(group.total||0));
      const completed=Math.max(0,Math.min(total,Number(group.completed||0)));
      const opened=Math.max(0,Math.min(total-completed,Number(group.opened||0)));
      const sent=Math.max(0,Math.min(total-completed-opened,Number(group.sent||0)));
      for(let i=0;i<completed;i++)invites.push({role:group.role,status:'completed'});
      for(let i=0;i<opened;i++)invites.push({role:group.role,status:'opened'});
      for(let i=0;i<sent;i++)invites.push({role:group.role,status:'sent'});
      for(let i=invites.filter(v=>v.role===group.role).length;i<total;i++)invites.push({role:group.role,status:'pending'});
    }
    return {...status,aggregateOnly:true,invites};
  }

  async function recoverInvitesQa(assessmentId, cycle, manageToken){
    if(!qaMode())throw new Error('qa_mode_required');
    return request(qaPath('/api/manage/' + encodeURIComponent(assessmentId) + '/cycles/' + Number(cycle) + '/invites'), { manageToken });
  }

  async function createAssessment(payload){
    const data=await request(qaPath('/api/assessments'), { json: payload });
    return qaMode()?data:stripInviteUrls(data);
  }

  async function createNextCycle(assessmentId, manageToken, payload = {}){
    const data=await request(qaPath('/api/manage/' + encodeURIComponent(assessmentId) + '/cycles'), { manageToken, json: payload });
    return qaMode()?data:stripInviteUrls(data);
  }

  const api = {
    apiBase,
    qaMode,
    health: () => request('/health'),
    createAssessment,
    inviteContext,
    submitInvite: (token, payload) => request('/api/invite/' + encodeURIComponent(token) + '/submit', { json: payload }),
    cycleStatus,
    exportCycle: (assessmentId, cycle, manageToken) => request('/api/manage/' + encodeURIComponent(assessmentId) + '/cycles/' + Number(cycle) + '/export', { manageToken }),
    recoverInvites,
    recoverInvitesQa,
    sendInvitations: (assessmentId, cycle, manageToken) => request('/api/manage/' + encodeURIComponent(assessmentId) + '/cycles/' + Number(cycle) + '/send', { method:'POST', manageToken, json:{} }),
    createNextCycle,
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
    loadHelper('report-radar-missing-style.js?v=20260820-1');
  }
  if(/\/compare-v2\.html$/i.test(location.pathname)){
    loadHelper('compare-radar-safe.js?v=20260821-2');
  }
  if(/\/guardian\.html$/i.test(location.pathname)){
    loadHelper('guardian-workspace.js?v=20260820-1');
    // Per-recipient identity/status UI is intentionally paused until the safe
    // Worker /invites policy is deployed. QA links remain available only in ?qa=1.
    if(qaMode())loadHelper('guardian-test-console.js?v=20260821-roles1');
  }
  if(/\/setup-v2\.html$/i.test(location.pathname)){
    loadHelper('guardian-workspace.js?v=20260820-1');
  }
})(window);
