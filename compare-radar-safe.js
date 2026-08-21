(function(){
  'use strict';

  function isEn(){return document.documentElement.lang==='en'}
  function copy(){return isEn()?{
    c1:'Others C1',c2:'Others C2',axes:'Radar axes',
    note:'Scale: 1–5. A missing / cannot-assess value is not 0 and is excluded from averages. A dashed series contains at least one missing axis.'
  }:{
    c1:'Kiti C1',c2:'Kiti C2',axes:'Radaro ašys',
    note:'Skalė: 1–5. „Neįvertinta / negaliu įvertinti“ nėra 0 balas ir į vidurkius neįtraukiama. Brūkšniuota serija turi bent vieną neįvertintą ašį.'
  }}

  function ensureUi(chart){
    const canvas=chart?.canvas;
    if(!canvas)return;
    const holder=canvas.parentElement;
    if(!holder)return;

    let note=holder.querySelector('#compareRadarMissingNote');
    if(!note){
      note=document.createElement('p');
      note.id='compareRadarMissingNote';
      note.className='muted';
      note.style.cssText='font-size:.78rem;line-height:1.5;text-align:center;margin:10px 0 0';
      holder.appendChild(note);
    }
    note.textContent=copy().note;

    let key=holder.querySelector('#compareRadarAxisKey');
    if(!key){
      key=document.createElement('div');
      key.id='compareRadarAxisKey';
      key.style.cssText='display:none;margin-top:14px;padding-top:12px;border-top:1px solid var(--border);font-size:.78rem;color:var(--muted)';
      holder.appendChild(key);
    }
    const labels=chart.data.labels||[];
    key.innerHTML=`<div style="font-weight:700;color:var(--text);margin-bottom:8px">${copy().axes}</div>`+
      labels.map((label,i)=>`<div style="display:flex;gap:7px;padding:2px 0"><strong style="min-width:20px;color:var(--text)">${i+1}.</strong><span>${String(label)}</span></div>`).join('');
    key.style.display=window.matchMedia('(max-width:650px)').matches?'block':'none';
  }

  function patchTable(){
    const ths=document.querySelectorAll('.delta-table thead th');
    if(ths.length>=3){ths[1].textContent=isEn()?'C1 Others':'C1 Kiti';ths[2].textContent=isEn()?'C2 Others':'C2 Kiti'}
  }

  function patch(){
    if(!window.Chart)return;
    const chart=Chart.getChart('radar');
    if(!chart)return;
    const mobile=window.matchMedia('(max-width:650px)').matches;
    const c=copy();
    chart.data.datasets.forEach((ds,index)=>{
      const hadMissing=(ds.data||[]).some(v=>Number(v)===0||v===null||v===undefined);
      ds.data=(ds.data||[]).map(v=>Number(v)===0?null:v);
      ds.label=index===0?c.c1:c.c2;
      ds.spanGaps=true;
      ds.borderDash=hadMissing?[7,5]:[];
      ds.fill=false;
    });
    if(chart.options?.scales?.r){
      chart.options.scales.r.min=1;
      chart.options.scales.r.max=5;
      chart.options.scales.r.pointLabels=chart.options.scales.r.pointLabels||{};
      chart.options.scales.r.pointLabels.callback=mobile?((_value,index)=>String(index+1)):undefined;
      chart.options.scales.r.pointLabels.font=mobile?{size:12}:undefined;
    }
    chart.update('none');
    ensureUi(chart);
    patchTable();
  }

  const observer=new MutationObserver(()=>setTimeout(patch,0));
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('resize',()=>setTimeout(patch,50));
  document.addEventListener('click',e=>{
    if(e.target?.id==='langToggle')setTimeout(patch,80);
  });
  setTimeout(patch,500);
  setTimeout(patch,1200);
})();
