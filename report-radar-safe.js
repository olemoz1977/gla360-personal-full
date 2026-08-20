(function(){
  'use strict';

  function isMobile(){return window.matchMedia('(max-width:650px)').matches}
  function lang(){return document.documentElement.lang==='en'?'en':'lt'}
  function title(){return lang()==='en'?'Radar axes':'Radaro ašys'}
  function scaleNote(){return lang()==='en'
    ? 'Scale: 1–5. 0 = not assessed / cannot assess. 0 is not a rating and is excluded from averages. Missing values are not connected in the radar line.'
    : 'Skalė: 1–5. 0 = neįvertinta / negaliu įvertinti. 0 nėra vertinimo balas ir į vidurkius neįtraukiamas. Trūkstama reikšmė radaro kreivėje nejungiama.';
  }

  function ensureKey(labels){
    const canvas=document.getElementById('radar');
    if(!canvas)return;
    let note=document.getElementById('radarScaleNote');
    if(!note){
      note=document.createElement('p');
      note.id='radarScaleNote';
      note.style.cssText='font-size:.78rem;margin:10px 0 0;text-align:center;color:var(--muted)';
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
      labels.map((label,i)=>'<div style="display:flex;gap:6px;align-items:flex-start"><strong style="min-width:18px;color:var(--text)">'+(i+1)+'.</strong><span>'+escapeHtml(label)+'</span></div>').join('')+
      '</div>';
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  }

  function apply(){
    if(!window.Chart)return false;
    const chart=Chart.getChart('radar');
    if(!chart)return false;
    const labels=(chart.data.labels||[]).map(String);
    const r=chart.options?.scales?.r;
    if(!r)return false;

    // 0 is a visual baseline only: it means "not assessed" and is never averaged.
    r.min=0;
    r.max=5;
    r.ticks=r.ticks||{};
    r.ticks.stepSize=1;
    r.ticks.callback=(value)=>Number(value)===0?'0*':String(value);

    r.pointLabels=r.pointLabels||{};
    if(isMobile()){
      r.pointLabels.display=true;
      r.pointLabels.callback=(_value,index)=>String(index+1);
      r.pointLabels.font={size:11,weight:'600'};
      r.pointLabels.padding=5;
    }else{
      r.pointLabels.display=true;
      r.pointLabels.callback=(value)=>value;
      r.pointLabels.font={size:11};
      r.pointLabels.padding=5;
    }
    chart.update('none');
    ensureKey(labels);
    return true;
  }

  let lastChart=null;
  const timer=setInterval(()=>{
    const chart=window.Chart&&Chart.getChart('radar');
    if(chart&&chart!==lastChart){lastChart=chart;setTimeout(apply,0)}
  },250);

  window.addEventListener('resize',()=>setTimeout(apply,80));
  const toggle=document.getElementById('langToggle');
  if(toggle)toggle.addEventListener('click',()=>setTimeout(apply,180));
  setTimeout(apply,500);
})();
