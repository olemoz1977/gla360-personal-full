(function(){
  'use strict';

  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const items=[
    ['index.html','🏠 Pradžia'],
    ['audit.html','🔍 3 min. auditas'],
    ['setup-v2.html','📊 Pilnas 360°'],
    ['plan-direct.html','🎯 Tik planas'],
    ['README.html','📖 Aprašas'],
    ['PRIVACY-v2.html','🔒 Privatumas']
  ];

  const style=document.createElement('style');
  style.textContent=`
    .site-nav{background:var(--surface2);border-bottom:1px solid var(--border)}
    .site-nav__inner{max-width:900px;margin:0 auto;padding:9px 20px;display:flex;gap:14px;flex-wrap:wrap}
    .site-nav a{text-decoration:none;color:var(--muted);font-size:.88rem}
    .site-nav a.is-active{color:var(--brand);font-weight:700}
  `;
  document.head.appendChild(style);

  const nav=document.createElement('nav');
  nav.className='site-nav';
  nav.setAttribute('aria-label','Pagrindinė navigacija');
  nav.innerHTML='<div class="site-nav__inner">'+items.map(([href,label])=>{
    const active=path===href.toLowerCase();
    return `<a href="${href}"${active?' class="is-active" aria-current="page"':''}>${label}</a>`;
  }).join('')+'</div>';

  document.body.insertAdjacentElement('afterbegin',nav);
})();
