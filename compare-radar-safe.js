(function(){
  'use strict';

  function isEn(){return document.documentElement.lang==='en'}
  function isMobile(){return Math.min(window.innerWidth||9999,document.documentElement.clientWidth||9999)<=650}
  function copy(){return isEn()?{
    c1:'Others C1',c2:'Others C2',axes:'Radar axes',title:'Others ratings: C1 vs C2',
    th1:'C1 Others',th2:'C2 Others',
    note:'Scale: 1–5. A missing / cannot-assess value is not 0 and is excluded from averages. A dashed series contains at least one missing axis.',
    coverage:(n,total)=>`Comparable areas: ${n} of ${total}. Change is calculated only where both C1 and C2 have a rating.`
  }:{
    c1:'Kiti C1',c2:'Kiti C2',axes:'Radaro ašys',title:'Kitų vertinimas: C1 vs C2',
    th1:'C1 Kiti',th2:'C2 Kiti',
    note:'Skalė: 1–5. „Neįvertinta / negaliu įvertinti“ nėra 0 balas ir į vidurkius neįtraukiama. Brūkšniuota serija turi bent vieną neįvertintą ašį.',
    coverage:(n,total)=>`Palyginamos sritys: ${n} iš ${total}. Pokytis skaičiuojamas tik ten, kur ir C1, ir C2 yra vertinimas.`
  }}

  function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}

  function patchStatic(){
    const c=copy();
    const title=document.getElementById('radarTitle');
    if(title)title.textContent=c.title;
    const ths=document.querySelectorAll('.delta-table thead th');
    if(ths.length>=3){ths[1].textContent=c.th1;ths[2].textContent=c.th2}
  }

  function comparableCount(){
    const rows=[...document.querySelectorAll('#rows tr')];
    let comparable=0;
    rows.forEach(row=>{
      const cells=row.querySelectorAll('td');
      if(cells.length>=3 && cells[1].textContent.trim()!=='—' && cells[2].textContent.trim()!=='—')comparable++;
    });
    return {comparable,total:rows.length};
  }

  function ensureCoverage(){
    const stats=document.getElementById('stats');
    if(!stats)return;
    let note=document.getElementById('compareCoverageNote');
    if(!note){
      note=document.createElement('p');
      note.id='compareCoverageNote';
      note.className='muted';
      note.style.cssText='font-size:.78rem;line-height:1.5;margin:10px 2px 18px;text-align:center';
      stats.insertAdjacentElement('afterend',note);
    }
    const {comparable,total}=comparableCount();
    note.textContent=total?copy().coverage(comparable,total):'';
  }

  function ensureUi(chart,fullLabels){
    const canvas=chart?.canvas;
    if(!canvas)return;
    const holder=canvas.parentElement;
    if(!holder)return;

    let note=holder.querySelector('#compareRadarMissingNote');
    if(!note){
      note=document.createElement('p');
      note.id='compareRadarMissingNote';
      note.className='muted';
      note.style.cssText='font-size:.78rem;line-height:1.5;text-align:center;margin:12px 0 0';
      holder.appendChild(note);
    }
    note.textContent=copy().note;

    let key=holder.querySelector('#compareRadarAxisKey');
    if(!key){
      key=document.createElement('div');
      key.id='compareRadarAxisKey';
      key.style.cssText='margin-top:14px;padding-top:12px;border-top:1px solid var(--border);font-size:.78rem;color:var(--muted)';
      holder.appendChild(key);
    }
    key.innerHTML=`<div style="font-weight:700;color:var(--text);margin-bottom:8px">${esc(copy().axes)}</div>`+
      fullLabels.map((label,i)=>`<div style="display:flex;gap:7px;padding:2px 0"><strong style="min-width:20px;color:var(--text)">${i+1}.</strong><span>${esc(label)}</span></div>`).join('');
    key.style.display=isMobile()?'block':'none';
  }

  function patch(){
    patchStatic();
    ensureCoverage();
    if(!window.Chart)return;
    const canvas=document.getElementById('radar');
    if(!canvas)return;
    const chart=Chart.getChart(canvas);
    if(!chart)return;

    const mobile=isMobile();
    const c=copy();
    const fullLabels=(chart.data.labels||[]).map(String);
    chart.data.datasets.forEach((ds,index)=>{
      const hadMissing=(ds.data||[]).some(v=>Number(v)===0||v===null||v===undefined);
      ds.data=(ds.data||[]).map(v=>(Number(v)===0||v===undefined)?null:v);
      ds.label=index===0?c.c1:c.c2;
      ds.spanGaps=true;
      ds.borderDash=hadMissing?[7,5]:[];
      ds.fill=false;
    });
    if(chart.options?.scales?.r){
      const r=chart.options.scales.r;
      r.min=1;
      r.max=5;
      r.ticks={...(r.ticks||{}),stepSize:1};
      r.pointLabels={...(r.pointLabels||{}),font:{size:mobile?12:10},callback:(value,index)=>mobile?String(index+1):fullLabels[index]};
    }
    chart.update('none');
    ensureUi(chart,fullLabels);
  }

  let scheduled=false;
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;patch()});
  }

  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('resize',()=>setTimeout(schedule,60));
  document.addEventListener('click',e=>{if(e.target?.id==='langToggle')setTimeout(schedule,100)});
  setTimeout(schedule,300);
  setTimeout(schedule,800);
  setTimeout(schedule,1600);
})();
