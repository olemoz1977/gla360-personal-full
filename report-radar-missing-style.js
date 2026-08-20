(function(){
  'use strict';

  function lang(){return document.documentElement.lang==='en'?'en':'lt'}
  function noteText(){
    return lang()==='en'
      ? 'Missing rating: the incomplete series is shown with a dashed outline. The dashed segment bridges neighbouring observed values only for visual continuity; it is not an estimated score and is excluded from averages.'
      : 'Trūkstamas vertinimas: nepilna serija rodoma brūkšniuota linija. Brūkšniuota atkarpa tik vizualiai sujungia gretimus įvertintus taškus – tai nėra apskaičiuotas balas ir į vidurkius ji neįtraukiama.';
  }

  function getChart(){
    if(!window.Chart)return null;
    const canvas=document.getElementById('radar');
    if(!canvas)return null;
    try{return Chart.getChart(canvas)||null}catch(_){return null}
  }

  function apply(){
    const chart=getChart();
    if(!chart)return false;
    let hasMissing=false;
    (chart.data.datasets||[]).forEach(ds=>{
      const missing=(ds.data||[]).some(v=>v===null||v===undefined||!Number.isFinite(Number(v)));
      if(missing){
        hasMissing=true;
        ds.fill=true;
        ds.spanGaps=true;
        ds.borderDash=[7,5];
        ds.borderWidth=2;
      }else{
        ds.fill=true;
        ds.spanGaps=false;
        ds.borderDash=[];
      }
    });
    const note=document.getElementById('radarMissingNote');
    if(note){
      note.textContent=hasMissing?noteText():'';
      note.style.display=hasMissing?'block':'none';
    }
    chart.update('none');
    return true;
  }

  let last=null,tries=0;
  const timer=setInterval(()=>{
    tries++;
    const chart=getChart();
    if(chart){
      if(chart!==last)last=chart;
      apply();
    }
    if(tries>80)clearInterval(timer);
  },250);

  window.addEventListener('resize',()=>setTimeout(apply,100));
  const toggle=document.getElementById('langToggle');
  if(toggle)toggle.addEventListener('click',()=>setTimeout(apply,250));
  setTimeout(apply,350);
  setTimeout(apply,900);
})();
