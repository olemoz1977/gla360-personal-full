(function(){
  'use strict';

  const STORAGE_KEY='leadership360_ui_lang';
  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();

  function normalise(value){
    return String(value||'').toLowerCase().startsWith('en')?'en':'lt';
  }

  function queryLang(){
    const value=new URLSearchParams(location.search).get('lang');
    return value?normalise(value):'';
  }

  function hashLang(){
    const raw=String(location.hash||'').replace(/^#/,'');
    const value=new URLSearchParams(raw).get('lang');
    return value?normalise(value):'';
  }

  const explicit=queryLang()||hashLang();
  if(explicit){
    try{ localStorage.setItem(STORAGE_KEY,explicit); }catch(_){}
    document.documentElement.lang=explicit;
  }

  let lang=explicit;
  if(!lang && window.Leadership360I18n && typeof window.Leadership360I18n.current==='function'){
    lang=normalise(window.Leadership360I18n.current());
  }
  if(!lang){
    try{ lang=normalise(localStorage.getItem(STORAGE_KEY)||document.documentElement.lang||navigator.language||'lt'); }
    catch(_){ lang=normalise(document.documentElement.lang||navigator.language||'lt'); }
  }

  const COPY={
    lt:{
      aria:'Pagrindinė navigacija',
      items:[
        ['index.html','🏠 Pradžia'],
        ['audit.html','🔍 3 min. auditas'],
        ['setup-v2.html','📊 Pilnas 360°'],
        ['plan-direct.html','🎯 Tik planas'],
        ['README.html','📖 Aprašas'],
        ['PRIVACY-v2.html','🔒 Privatumas']
      ],
      switchLabel:'EN',
      switchAria:'Switch to English'
    },
    en:{
      aria:'Main navigation',
      items:[
        ['index.html','🏠 Home'],
        ['audit.html','🔍 3 min. audit'],
        ['setup-v2.html','📊 Full 360°'],
        ['plan-direct.html','🎯 Plan only'],
        ['README.html','📖 About'],
        ['PRIVACY-v2.html','🔒 Privacy']
      ],
      switchLabel:'LT',
      switchAria:'Perjungti į lietuvių kalbą'
    }
  };
  const copy=COPY[lang]||COPY.lt;

  function hrefWithLang(href,targetLang=lang){
    const u=new URL(href,location.href);
    u.searchParams.set('lang',targetLang);
    return u.pathname.split('/').pop()+u.search+u.hash;
  }

  const style=document.createElement('style');
  style.textContent=`
    .site-nav{background:var(--surface2);border-bottom:1px solid var(--border)}
    .site-nav__inner{max-width:900px;margin:0 auto;padding:9px 20px;display:flex;gap:14px;flex-wrap:wrap;align-items:center}
    .site-nav a{text-decoration:none;color:var(--muted);font-size:.88rem}
    .site-nav a.is-active{color:var(--brand);font-weight:700}
    .site-nav__lang{margin-left:auto;border:1px solid var(--border);background:var(--surface);color:var(--brand);border-radius:9px;padding:5px 10px;font:inherit;font-size:.82rem;font-weight:700;cursor:pointer}
    @media(max-width:650px){.site-nav__lang{margin-left:0}}
  `;
  document.head.appendChild(style);

  const old=document.querySelector('.site-nav');
  if(old) old.remove();

  const nav=document.createElement('nav');
  nav.className='site-nav';
  nav.setAttribute('aria-label',copy.aria);
  nav.innerHTML='<div class="site-nav__inner">'+copy.items.map(([href,label])=>{
    const active=path===href.toLowerCase();
    return `<a href="${hrefWithLang(href)}"${active?' class="is-active" aria-current="page"':''}>${label}</a>`;
  }).join('')+`<button class="site-nav__lang" type="button" aria-label="${copy.switchAria}">${copy.switchLabel}</button></div>`;

  nav.querySelector('.site-nav__lang').addEventListener('click',()=>{
    const next=lang==='lt'?'en':'lt';
    try{ localStorage.setItem(STORAGE_KEY,next); }catch(_){}
    const u=new URL(location.href);
    u.searchParams.set('lang',next);
    if(u.hash){
      const raw=String(u.hash).replace(/^#/,'');
      const qs=new URLSearchParams(raw);
      if(qs.has('lang')){
        qs.set('lang',next);
        u.hash=qs.toString();
      }
    }
    location.href=u.toString();
  });

  document.body.insertAdjacentElement('afterbegin',nav);
})();
