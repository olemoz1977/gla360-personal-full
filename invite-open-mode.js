(function(){
  'use strict';
  const C=window.Leadership360Collector;
  const list=document.getElementById('inviteList');
  if(!list||!C?.qaMode?.())return;

  function normalizeLinks(){
    list.querySelectorAll('.invite-item').forEach(item=>{
      let link=item.querySelector('a');
      if(link){link.target='_blank';link.rel='noopener';return}
      const blocks=item.querySelectorAll('div');
      const block=blocks[blocks.length-1];
      if(!block)return;
      const url=(block.textContent||'').trim();
      if(!/^https?:\/\//i.test(url))return;
      const a=document.createElement('a');
      a.href=url;a.target='_blank';a.rel='noopener';a.textContent=url;
      block.textContent='';block.appendChild(a);
    });
  }

  new MutationObserver(normalizeLinks).observe(list,{childList:true,subtree:true});
  setTimeout(normalizeLinks,200);
  setTimeout(normalizeLinks,700);
})();
