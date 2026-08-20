(function(){
  'use strict';
  const C=window.Leadership360Collector;
  const token=new URLSearchParams(location.search).get('invite')||'';
  if(!C||!token)return;

  const COPY={
    lt:{
      title:'Trumpa refleksija',
      strength:'Kokiomis savo stiprybėmis labiausiai remiuosi?',
      strengthPh:'Konkretūs pavyzdžiai…',
      develop:'Ką norėčiau sąmoningai tobulinti per artimiausias 90 dienų?',
      developPh:'Konkretūs elgesiai ar situacijos…'
    },
    en:{
      title:'Brief reflection',
      strength:'Which of my strengths do I rely on most?',
      strengthPh:'Specific examples…',
      develop:'What would I like to deliberately improve over the next 90 days?',
      developPh:'Specific behaviours or situations…'
    }
  };

  function rewriteLabel(label,text,placeholder){
    if(!label)return;
    const textarea=label.querySelector('textarea');
    if(!textarea)return;
    textarea.placeholder=placeholder;
    label.textContent='';
    label.appendChild(document.createTextNode(text));
    label.appendChild(textarea);
  }

  async function apply(){
    let ctx;
    try{ctx=await C.inviteContext(token)}catch(_){return false}
    if(ctx?.role!=='self')return true;
    const block=document.querySelector('#questions .open-block');
    if(!block)return false;
    const lang=ctx.language==='en'?'en':'lt',tx=COPY[lang];
    const title=block.querySelector('.comp-cluster');
    if(title)title.textContent=tx.title;
    const labels=block.querySelectorAll('.open-q label');
    rewriteLabel(labels[0],tx.strength,tx.strengthPh);
    rewriteLabel(labels[1],tx.develop,tx.developPh);
    block.dataset.selfReflection='1';
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    apply().then(done=>{if(done||tries>40)clearInterval(timer)}).catch(()=>{if(tries>40)clearInterval(timer)});
  },250);
})();
