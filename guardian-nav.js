(function(){
  'use strict';

  if(!/\/(guardian|guardian-dashboard)\.html$/i.test(location.pathname))return;
  if(document.getElementById('guardianRoleNav'))return;

  const oldTopbar=document.querySelector('.topbar');
  const langButton=document.getElementById('langToggle');

  const style=document.createElement('style');
  style.textContent=`
    .guardian-role-nav{border-bottom:1px solid var(--border);background:var(--surface);}
    .guardian-role-nav-inner{max-width:1000px;margin:0 auto;padding:10px 20px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .guardian-role-link{display:inline-flex;align-items:center;min-height:40px;padding:8px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--brand);font-weight:700;text-decoration:none;white-space:nowrap;}
    .guardian-role-link:hover{background:var(--surface2);}
    .guardian-role-link.active{background:var(--brand);border-color:var(--brand);color:#fff;}
    .guardian-role-lang{margin-left:auto;min-width:48px;}
    @media(max-width:700px){
      .guardian-role-nav-inner{padding:9px 12px;gap:6px;}
      .guardian-role-link{min-height:38px;padding:7px 9px;font-size:.86rem;}
      .guardian-role-lang{margin-left:0;}
    }
  `;
  document.head.appendChild(style);

  const nav=document.createElement('nav');
  nav.id='guardianRoleNav';
  nav.className='guardian-role-nav';
  nav.setAttribute('aria-label','Guardian');
  nav.innerHTML='<div class="guardian-role-nav-inner" id="guardianRoleNavInner"></div>';

  const body=document.body;
  body.insertBefore(nav,body.firstChild);
  const inner=document.getElementById('guardianRoleNavInner');

  function currentLang(){return document.documentElement.lang==='en'?'en':'lt'}
  function withLang(page){
    const u=new URL(page,location.href);
    u.search='';
    u.searchParams.set('lang',currentLang());
    u.hash='';
    return u.toString();
  }

  const links=[
    {id:'guardianNavHome',page:'index.html'},
    {id:'guardianNavWorkspace',page:'guardian-dashboard.html',active:true},
    {id:'guardianNavNew',page:'setup-v2.html'},
    {id:'guardianNavPrivacy',page:'PRIVACY-v2.html'}
  ];

  for(const item of links){
    const a=document.createElement('a');
    a.id=item.id;
    a.className='guardian-role-link'+(item.active?' active':'');
    a.href=withLang(item.page);
    inner.appendChild(a);
  }

  if(langButton){
    langButton.classList.add('guardian-role-lang');
    inner.appendChild(langButton);
  }
  if(oldTopbar)oldTopbar.style.display='none';

  if(/\/guardian\.html$/i.test(location.pathname)){
    const duplicatePrivacy=document.getElementById('privacyLink');
    if(duplicatePrivacy){
      const wrapper=duplicatePrivacy.closest('p');
      (wrapper||duplicatePrivacy).style.display='none';
    }
  }

  const COPY={
    lt:{home:'🏠 Pradžia',workspace:'🛡️ Administravimo stalas',newAssessment:'＋ Naujas 360°',privacy:'🔒 Privatumas'},
    en:{home:'🏠 Home',workspace:'🛡️ Administration workspace',newAssessment:'＋ New 360°',privacy:'🔒 Privacy'}
  };

  function render(){
    const lang=currentLang(),t=COPY[lang];
    document.getElementById('guardianNavHome').textContent=t.home;
    document.getElementById('guardianNavWorkspace').textContent=t.workspace;
    document.getElementById('guardianNavNew').textContent=t.newAssessment;
    document.getElementById('guardianNavPrivacy').textContent=t.privacy;
    document.getElementById('guardianNavHome').href=withLang('index.html');
    document.getElementById('guardianNavWorkspace').href=withLang('guardian-dashboard.html');
    document.getElementById('guardianNavNew').href=withLang('setup-v2.html');
    document.getElementById('guardianNavPrivacy').href=withLang('PRIVACY-v2.html');
    nav.setAttribute('aria-label',lang==='lt'?'Sergėtojo navigacija':'Guardian navigation');
  }

  new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  langButton?.addEventListener('click',()=>setTimeout(render,0));
  render();
})();
