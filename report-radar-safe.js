(function(){
  'use strict';

  function lang(){return document.documentElement.lang==='en'?'en':'lt'}
  function copy(){return lang()==='en'
    ? {self:'Self-assessment',others:'Others',note:'— = not assessed. Missing values are not plotted as zero.'}
    : {self:'Savivertinimas',others:'Kiti',note:'— = neįvertinta. Trūkstamos reikšmės radare nerodomos kaip 0.'};
  }

  function apply(){
    if(!window.Chart)return false;
    const chart=Chart.getChart('radar');
    if(!chart)return false;

    let hasMissing=false;
    (chart.data.datasets||[]).forEach((ds,index)=>{
      ds.data=(ds.data||[]).map(v=>{
        const n=Number(v);
        if(!Number.isFinite(n)||n<1){hasMissing=true;return null;}
        return n;
      });
      ds.spanGaps=false;
      ds.label=index===0?copy().self:copy().others;
    });

    chart.options=chart.options||{};
    chart.options.scales=chart.options.scales||{};
    chart.options.scales.r=chart.options.scales.r||{};
    chart.options.scales.r.pointLabels=chart.options.scales.r.pointLabels||{};
    chart.options.scales.r.pointLabels.display=window.innerWidth>650;
    chart.update('none');

    const canvas=document.getElementById('radar');
    if(canvas){
      let note=document.getElementById('radarMissingNote');
      if(!note){
        note=document.createElement('p');
        note.id='radarMissingNote';
        note.className='muted';
        note.style.cssText='font-size:.78rem;margin-top:8px;text-align:center';
        canvas.insertAdjacentElement('afterend',note);
      }
      note.textContent=hasMissing?copy().note:'';
      note.style.display=hasMissing?'block':'none';
    }
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(apply()||tries>80)clearInterval(timer);
  },250);

  window.addEventListener('resize',()=>setTimeout(apply,50));
  const toggle=document.getElementById('langToggle');
  if(toggle)toggle.addEventListener('click',()=>setTimeout(apply,100));
})();
