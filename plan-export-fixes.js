(function(){
  'use strict';

  const COMP_LT = {
    'Demonstrating Integrity':'Sąžiningumas ir patikimumas',
    'Encouraging Dialogue':'Dialogo skatinimas',
    'Creating Shared Vision':'Bendros krypties kūrimas',
    'Developing Technological Savvy':'Technologinis išprusimas',
    'Ensuring Customer Satisfaction':'Kliento pasitenkinimas',
    'Maintaining Competitive Advantage':'Konkurencinis pranašumas',
    'Developing People':'Žmonių ugdymas',
    'Building Partnerships':'Partnerystės kūrimas',
    'Sharing Leadership':'Lyderiavimo dalijimasis',
    'Achieving Personal Mastery':'Asmeninis tobulėjimas',
    'Anticipating Opportunities':'Galimybių numatymas',
    'Leading Change':'Pokyčių valdymas',
    'Empowering People':'Žmonių įgalinimas',
    'Thinking Globally':'Globalus mąstymas',
    'Appreciating Diversity':'Įvairovės vertinimas',
    'universal':'Bendri įpročiai'
  };

  const enc = new TextEncoder();
  const ltComp = name => COMP_LT[name] || name || '';
  const isEn = () => document.documentElement.lang === 'en';

  function readAuth(){
    const C=window.Leadership360Collector;
    let auth=C?.parseManageHash?.();
    if(auth?.assessmentId&&auth?.manageToken)return auth;
    try{
      const x=JSON.parse(sessionStorage.getItem('leadership360_last_manage')||'null');
      if(x?.assessmentId&&x?.manageToken)return x;
    }catch(_){}
    return null;
  }

  function setLeaderName(name){
    name=String(name||'').trim();
    if(!name)return;
    const input=document.getElementById('leaderNamePlan');
    if(input && (!input.value.trim() || input.value.trim()==='Lyderis')) input.value=name;
    const title=document.getElementById('planTitle');
    if(title && /^Lyderis\s+[–-]/.test(title.textContent||'')){
      title.textContent=(title.textContent||'').replace(/^Lyderis/,name);
    }
  }

  function prefillLeader(){
    const auth=readAuth();
    if(!auth)return;
    try{
      const items=JSON.parse(localStorage.getItem('leadership360_guardian_workspace_v1')||'[]');
      const hit=Array.isArray(items)?items.find(x=>x?.assessmentId===auth.assessmentId):null;
      if(hit?.leaderName)setLeaderName(hit.leaderName);
    }catch(_){}
    const C=window.Leadership360Collector;
    if(C?.recoverInvites){
      C.recoverInvites(auth.assessmentId,auth.cycle||1,auth.manageToken)
        .then(data=>setLeaderName(data?.leaderName))
        .catch(()=>{});
    }
  }

  function addDays(base,days){
    const d=new Date(base.getFullYear(),base.getMonth(),base.getDate());
    d.setDate(d.getDate()+days);
    return d;
  }

  function icsDate(d){
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,'0');
    const day=String(d.getDate()).padStart(2,'0');
    return `${y}${m}${day}`;
  }

  function icsStamp(){
    return new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  }

  function escText(value){
    return String(value??'')
      .replace(/\\/g,'\\\\')
      .replace(/;/g,'\\;')
      .replace(/,/g,'\\,')
      .replace(/\r?\n/g,'\\n');
  }

  function foldLine(line){
    let out='';
    let chunk='';
    let first=true;
    for(const ch of String(line)){
      const limit=first?75:74;
      if(chunk && enc.encode(chunk+ch).length>limit){
        out+=chunk+'\r\n ';
        chunk=ch;
        first=false;
      }else{
        chunk+=ch;
      }
    }
    return out+chunk;
  }

  function shortAction(text,max=82){
    const s=String(text||'').replace(/\s+/g,' ').trim();
    if(s.length<=max)return s;
    const cut=s.slice(0,max+1);
    const safe=cut.replace(/\s+\S*$/,'').trim();
    return (safe||s.slice(0,max).trim())+'…';
  }

  function phaseOffset(phase){
    if(phase==='p2')return 30;
    if(phase==='p3')return 60;
    return 0;
  }

  function weekdayCode(date){
    return ['SU','MO','TU','WE','TH','FR','SA'][date.getDay()];
  }

  function scheduleFor(freq,phase,startDate){
    const f=String(freq||'').toLowerCase();
    let offset=phaseOffset(phase);
    const explicitDay=f.match(/(\d+)\s*[-–]?ąją\s+dien/);
    if(explicitDay)offset=Math.max(0,Number(explicitDay[1])-1);
    else {
      const dayMatch=f.match(/^(?:per\s+)?(\d+)\s*d\.?$/);
      if(dayMatch)offset=Math.max(0,Number(dayMatch[1])-1);
    }
    const eventDate=addDays(startDate,offset);
    let rule='';
    if(f.includes('kas pirmadien')) rule='FREQ=WEEKLY;BYDAY=MO';
    else if(f.includes('kas penktadien')) rule='FREQ=WEEKLY;BYDAY=FR';
    else if(f.includes('kas 2 sav')) rule=`FREQ=WEEKLY;INTERVAL=2;BYDAY=${weekdayCode(eventDate)}`;
    else if(f.includes('kas savaitę')) rule=`FREQ=WEEKLY;BYDAY=${weekdayCode(eventDate)}`;
    else if(f.includes('kas mėnesį')) rule='FREQ=MONTHLY';
    else if(f.includes('kasdien')) rule='FREQ=DAILY';
    return {eventDate,rule};
  }

  function buildIcs(items,startDate,leader){
    const end=addDays(startDate,90);
    const raw=[
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Leadership 360°//Tobulėjimo planas//LT','CALSCALE:GREGORIAN','METHOD:PUBLISH',
      `X-WR-CALNAME:${escText(`Leadership 360° - ${leader} 90d`)}`,'X-WR-TIMEZONE:Europe/Vilnius'
    ];
    items.forEach((item,i)=>{
      const {eventDate,rule}=scheduleFor(item.freq,item.phase,startDate);
      const summary=`Leadership 360° · ${ltComp(item.comp)} · ${shortAction(item.text)}`;
      const description=`${ltComp(item.comp)}\n${item.freq}\n\n${item.text}`;
      raw.push('BEGIN:VEVENT',`UID:leadership360-${Date.now()}-${i}@2rasi`,`DTSTART;VALUE=DATE:${icsDate(eventDate)}`,`DTEND;VALUE=DATE:${icsDate(addDays(eventDate,1))}`);
      if(rule)raw.push(`RRULE:${rule};UNTIL=${icsDate(end)}`);
      raw.push(`SUMMARY:${escText(summary)}`,`DESCRIPTION:${escText(description)}`,'CATEGORIES:Leadership 360,Lyderystė','STATUS:CONFIRMED',`DTSTAMP:${icsStamp()}`,'END:VEVENT');
    });
    raw.push('END:VCALENDAR');
    return raw.map(foldLine).join('\r\n')+'\r\n';
  }

  function safeFilenamePart(s){
    return String(s||'Lyderis').trim().replace(/[^\p{L}\p{N}_-]+/gu,'_').replace(/^_+|_+$/g,'')||'Lyderis';
  }

  function exportSelected(){
    const checked=Array.from(document.querySelectorAll('.cal-cb:checked'));
    if(checked.length < 1 || checked.length > 3){
      alert(isEn()
        ? 'Choose 1–3 actions to export to your calendar.'
        : 'Pažymėkite 1–3 veiksmus, kuriuos norite eksportuoti į kalendorių.');
      return;
    }
    const items=checked.map(cb=>cb.closest('.action-item')).filter(Boolean).map(row=>({
      text:row.dataset.text||'', freq:row.dataset.freq||'Vieną kartą', phase:row.dataset.phase||'p1', comp:row.dataset.comp||''
    }));
    const leader=(document.getElementById('leaderNamePlan')?.value||'Lyderis').trim()||'Lyderis';
    const startDate=new Date();
    const ics=buildIcs(items,startDate,leader);
    const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`Leadership360_${safeFilenamePart(leader)}_90d.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#exportIcs');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    exportSelected();
  },true);

  prefillLeader();
  setTimeout(prefillLeader,400);
  setTimeout(prefillLeader,1200);
})();
