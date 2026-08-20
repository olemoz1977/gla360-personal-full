(function(){
  'use strict';

  function isMobile(){return window.matchMedia('(max-width:650px)').matches}
  function lang(){return document.documentElement.lang==='en'?'en':'lt'}
  function title(){return lang()==='en'?'Radar axes':'Radaro ašys'}
  function scaleNote(){return lang()==='en'
    ? 'Scale: 1–5. 0 = not assessed / cannot assess. 0 is not a rating and is excluded from averages. Missing values are not connected in the radar line.'
    : 'Skalė: 1–5. 0 = neįvertinta / negaliu įvertinti. 0 nėra vertinimo balas ir į vidurkius neįtraukiamas. Trūkstama reikšmė radaro kreivėje nejungiama.';
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function getChart(){
    if(!window.Chart)return null;
    const canvas=document.getElementById('radar');
    if(!canvas)return null;
    try{return Chart.getChart(canvas)||null}catch(_){return null}
  }

  function ensureKey(labels){
    const canvas=document.getElementById('radar');
    if(!canvas)return;

    const oldNote=document.getElementById('radarMissingNote');
    if(oldNote) oldNote.style.display='none';

    let note=document.getElementById('radarScaleNote');
    if(!note){
      note=document.createElement('p');
      note.id='radarScaleNote';
      note.style.cssText='font-size:.78rem;margin:10px 0 0;text-align:center;color:var(--muted);line-height:1.45';
      canvas.insertAdjacentElement('afterend',note);
    }
    note.textContent=scaleNote();

    let key=document.getElementById('radarAxisKey');
    if(!key){
      key=document.createElement('div');
      key.id='radarAxisKey';
      key.style.cssText='margin-top:14px;padding-top:12px;border-top:1px solid var(--border);font-size:.78rem;color:var(--muted)';
      canvas.parentElement.appendChild(key);
    }
    if(!isMobile()){
      key.style.display='none';
      return;
    }
    key.style.display='block';
    key.innerHTML='<div style="font-weight:700;color:var(--text);margin-bottom:8px">'+title()+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px">'+
      labels.map((label,i)=>'<div style="display:flex;gap:6px;align-items:flex-start"><strong style="min-width:22px;color:var(--text)">'+(i+1)+'.</strong><span>'+escapeHtml(label)+'</span></div>').join('')+
      '</div>';
  }

  function apply(){
    const chart=getChart();
    if(!chart)return false;
    const labels=(chart.data.labels||[]).map(String);
    const r=chart.options && chart.options.scales && chart.options.scales.r;
    if(!r)return false;

    // 0 is a visual baseline only. Real ratings are 1–5.
    r.min=0;
    r.max=5;
    r.beginAtZero=true;
    r.ticks=r.ticks||{};
    r.ticks.stepSize=1;
    r.ticks.callback=(value)=>Number(value)===0?'0*':String(value);

    r.pointLabels=r.pointLabels||{};
    r.pointLabels.display=true;
    if(isMobile()){
      r.pointLabels.callback=(_value,index)=>String(index+1);
      r.pointLabels.font={size:11,weight:'600'};
      r.pointLabels.padding=6;
    }else{
      r.pointLabels.callback=(value)=>value;
      r.pointLabels.font={size:11};
      r.pointLabels.padding=5;
    }

    chart.update('none');
    ensureKey(labels);
    return true;
  }

  let lastChart=null;
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    const chart=getChart();
    if(chart){
      if(chart!==lastChart){lastChart=chart}
      apply();
    }
    if(attempts>80) clearInterval(timer);
  },250);

  window.addEventListener('resize',()=>setTimeout(apply,100));
  const toggle=document.getElementById('langToggle');
  if(toggle)toggle.addEventListener('click',()=>{
    lastChart=null;
    setTimeout(apply,250);
    setTimeout(apply,700);
  });
  setTimeout(apply,300);
  setTimeout(apply,900);
})();
