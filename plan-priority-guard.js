(function(){
  'use strict';

  const REFLECT_KEY='gla360_reflect';
  const DELTA_KEY='gla360_delta';

  function authCycle(){
    const C=window.Leadership360Collector;
    let auth=C?.parseManageHash?.();
    if(auth?.assessmentId&&auth?.manageToken)return Number(auth.cycle||1)||1;
    try{
      const x=JSON.parse(sessionStorage.getItem('leadership360_last_manage')||'null');
      if(x?.assessmentId&&x?.manageToken)return Number(x.cycle||1)||1;
    }catch(_){}
    return 1;
  }

  function selectedNames(){
    return Array.from(document.querySelectorAll('.manual-comp:checked')).map(cb=>cb.value).filter(Boolean);
  }

  function parse(key){
    const raw=sessionStorage.getItem(key);
    if(!raw)return {raw:null,value:null};
    try{return {raw,value:JSON.parse(raw)}}catch(_){return {raw,value:null}}
  }

  function filterReflect(value,names){
    if(!value||typeof value!=='object')return null;
    const allowed=new Set(names);
    return {...value,items:Array.isArray(value.items)?value.items.filter(i=>allowed.has(i?.name)):[]};
  }

  function filterDelta(value,names){
    if(!value||typeof value!=='object')return null;
    const allowed=new Set(names);
    const out={...value};
    if(Array.isArray(out.items))out.items=out.items.filter(i=>allowed.has(i?.name));
    if(Array.isArray(out.gaps_c2))out.gaps_c2=out.gaps_c2.filter(i=>allowed.has(i?.name));
    if(Array.isArray(out.topRegressed))out.topRegressed=out.topRegressed.filter(i=>allowed.has(i?.name));
    if(Array.isArray(out.topImproved))out.topImproved=out.topImproved.filter(i=>allowed.has(i?.name));
    return out;
  }

  function restore(key,snapshot){
    if(snapshot.raw===null)sessionStorage.removeItem(key);
    else sessionStorage.setItem(key,snapshot.raw);
  }

  document.addEventListener('click',event=>{
    const btn=event.target?.closest?.('#generateBtn');
    if(!btn)return;
    const names=selectedNames();
    if(!names.length)return;

    const reflect=parse(REFLECT_KEY),delta=parse(DELTA_KEY);
    const cycle=authCycle();

    // C1 must never inherit stale C2 comparison/reflection state from another browser flow.
    if(cycle<=1){
      sessionStorage.removeItem(REFLECT_KEY);
      sessionStorage.removeItem(DELTA_KEY);
    }else{
      // In repeat cycles the user's visible checkbox choice is authoritative.
      // Keep trend/cause context only for the competencies that are actually checked.
      const filteredReflect=filterReflect(reflect.value,names);
      const filteredDelta=filterDelta(delta.value,names);
      if(filteredReflect)sessionStorage.setItem(REFLECT_KEY,JSON.stringify(filteredReflect));
      else sessionStorage.removeItem(REFLECT_KEY);
      if(filteredDelta)sessionStorage.setItem(DELTA_KEY,JSON.stringify(filteredDelta));
      else sessionStorage.removeItem(DELTA_KEY);
    }

    // The core click handler reads sessionStorage synchronously and renders immediately.
    // Restore the wider comparison context afterwards for other pages.
    setTimeout(()=>{
      restore(REFLECT_KEY,reflect);
      restore(DELTA_KEY,delta);
    },0);
  },true);
})();
