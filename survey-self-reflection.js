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

  function seedFromToken(value){
    let h=2166136261;
    for(let i=0;i<value.length;i++){
      h^=value.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return h>>>0;
  }

  function seededRandom(seed){
    let s=seed>>>0;
    return function(){
      s+=0x6D2B79F5;
      let t=s;
      t=Math.imul(t^(t>>>15),t|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }

  function neutralizeQuestions(){
    const root=document.getElementById('questions');
    if(!root||root.dataset.neutralized==='1')return false;
    const items=[...root.querySelectorAll('.q[data-key]')];
    if(items.length<1)return false;
    const openBlock=root.querySelector('.open-block');
    if(!openBlock)return false;

    const rand=seededRandom(seedFromToken(token));
    for(let i=items.length-1;i>0;i--){
      const j=Math.floor(rand()*(i+1));
      [items[i],items[j]]=[items[j],items[i]];
    }

    root.querySelectorAll('.comp-block:not(.open-block)').forEach(block=>block.remove());
    const frag=document.createDocumentFragment();
    items.forEach((item,index)=>{
      if(index%15===0){
        const block=document.createElement('div');
        block.className='comp-block survey-neutral-block';
        frag.appendChild(block);
      }
      const block=frag.lastElementChild;
      const num=item.querySelector('.q-num');
      if(num)num.textContent=(index+1)+'.';
      block.appendChild(item);
    });
    root.insertBefore(frag,openBlock);
    root.dataset.neutralized='1';
    return true;
  }

  async function apply(){
    if(!neutralizeQuestions())return false;
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