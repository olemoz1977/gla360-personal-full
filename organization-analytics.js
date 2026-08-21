(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.Leadership360OrgAnalytics=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SNAPSHOT_SCHEMA='leadership360-org-assessment@1';
  const PARTICIPATION_SCHEMA='leadership360-org-participation@1';
  const SUMMARY_SCHEMA='leadership360-org-analytics@1';
  const DEFAULTS={
    minAssessments:5,
    minTrendPairs:5,
    lowOthers:3.20,
    blindGap:0.70,
    blindMaxOthers:3.80,
    strongOthers:3.75,
    broadLowRate:0.40,
    systemicLowRate:0.50,
    attentionGap:0.50,
    blindRate:0.30,
    segmentLowRate:0.40,
    segmentMinAssessments:5,
    persistentDelta:0.10
  };

  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const avg=arr=>{const v=arr.filter(x=>Number.isFinite(x));return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
  const pct=(n,d)=>d>0?n/d:null;
  const clamp01=v=>v===null?null:Math.max(0,Math.min(1,v));
  const round=(v,d=3)=>v===null?null:Number(v.toFixed(d));

  function competencyKey(comp,index){
    const first=comp?.items?.[0]?.key||'';
    if(first)return first.replace(/_\d+$/,'');
    return String(comp?.name||('COMP_'+index)).toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'');
  }

  function fromAggregate(agg,meta={}){
    if(!agg||!agg.bank||!Array.isArray(agg.bank.competencies)||!agg.means||!Array.isArray(agg.means.self)||!Array.isArray(agg.others)){
      throw new Error('unsupported_aggregate');
    }
    const competencies=agg.bank.competencies.map((comp,i)=>({
      key:competencyKey(comp,i),
      name:String(comp.name||('Competency '+(i+1))),
      cluster:String(comp.cluster||''),
      self:num(agg.means.self[i]),
      others:num(agg.others[i])
    }));
    return {
      schema:SNAPSHOT_SCHEMA,
      assessment_id:String(meta.assessment_id||agg.assessment_id||''),
      cycle:Math.max(1,Number(meta.cycle||agg.cycle||1)||1),
      segment:{...(meta.segment||{})},
      response_count:Number(meta.response_count||agg.packsCount||0)||0,
      competencies
    };
  }

  function normaliseSnapshot(input){
    if(input?.schema===SNAPSHOT_SCHEMA&&Array.isArray(input.competencies)){
      return {
        schema:SNAPSHOT_SCHEMA,
        assessment_id:String(input.assessment_id||''),
        cycle:Math.max(1,Number(input.cycle||1)||1),
        segment:{...(input.segment||{})},
        response_count:Number(input.response_count||0)||0,
        competencies:input.competencies.map((c,i)=>({
          key:String(c.key||competencyKey(c,i)),name:String(c.name||c.key||('Competency '+(i+1))),cluster:String(c.cluster||''),self:num(c.self),others:num(c.others)
        }))
      };
    }
    return fromAggregate(input,input?.meta||{});
  }

  function normaliseParticipation(input){
    if(!input)return null;
    const x=input.schema===PARTICIPATION_SCHEMA?input:(input.participation||input);
    const block=k=>{
      const b=x?.[k]||{};
      return {planned:Number(b.planned||0)||0,started:Number(b.started||0)||0,sent:Number(b.sent||0)||0,opened:Number(b.opened||0)||0,completed:Number(b.completed||0)||0,eligible:Number(b.eligible||0)||0};
    };
    const assessments=block('assessments'),invitations=block('invitations'),c2=block('c2');
    const byRole={};
    for(const [role,b] of Object.entries(x?.by_role||x?.byRole||{})){
      byRole[role]=blockFrom(b);
    }
    return {schema:PARTICIPATION_SCHEMA,campaign_id:String(x?.campaign_id||''),assessments,invitations,c2,by_role:byRole};
  }

  function blockFrom(b){
    b=b||{};
    return {planned:Number(b.planned||0)||0,started:Number(b.started||0)||0,sent:Number(b.sent||0)||0,opened:Number(b.opened||0)||0,completed:Number(b.completed||0)||0,eligible:Number(b.eligible||0)||0};
  }

  function participationMetrics(input){
    const p=normaliseParticipation(input);
    if(!p)return {available:false,band:'unknown'};
    const a=p.assessments,i=p.invitations,c=p.c2;
    const metrics={
      available:true,
      assessments:{
        planned:a.planned,started:a.started,completed:a.completed,
        start_rate:clamp01(pct(a.started,a.planned)),completion_rate:clamp01(pct(a.completed,a.planned))
      },
      invitations:{
        planned:i.planned,sent:i.sent,opened:i.opened,completed:i.completed,
        invitation_coverage:clamp01(pct(i.sent,i.planned)),open_rate:clamp01(pct(i.opened,i.sent)),completion_rate:clamp01(pct(i.completed,i.sent)),follow_through:clamp01(pct(i.completed,i.opened))
      },
      c2:{eligible:c.eligible||c.planned,started:c.started,completed:c.completed,continuity_rate:clamp01(pct(c.completed,c.eligible||c.planned))},
      by_role:p.by_role
    };
    const core=[metrics.assessments.completion_rate,metrics.invitations.completion_rate,metrics.c2.continuity_rate].filter(v=>v!==null);
    const weakest=core.length?Math.min(...core):null;
    metrics.band=weakest===null?'unknown':weakest>=0.80?'strong':weakest>=0.60?'moderate':'attention';
    return metrics;
  }

  function latestSnapshots(snapshots){
    const map=new Map(),anonymous=[];
    for(const s of snapshots){
      if(!s.assessment_id){anonymous.push(s);continue}
      const prev=map.get(s.assessment_id);
      if(!prev||s.cycle>prev.cycle)map.set(s.assessment_id,s);
    }
    return [...map.values(),...anonymous];
  }

  function indexCompetencies(snapshot){
    return new Map(snapshot.competencies.map(c=>[c.key||c.name,c]));
  }

  function segmentRecurrence(rows,opt){
    const keys=['department','team','location','cohort','level'];
    const out=[];
    for(const key of keys){
      const groups=new Map();
      for(const row of rows){
        const value=String(row.segment?.[key]||'').trim();
        if(!value)continue;
        if(!groups.has(value))groups.set(value,[]);
        groups.get(value).push(row);
      }
      const eligible=[];
      for(const [value,g] of groups){
        const vals=g.map(r=>r.others).filter(v=>v!==null);
        if(vals.length<opt.segmentMinAssessments)continue;
        const low=vals.filter(v=>v<=opt.lowOthers).length/vals.length;
        eligible.push({value,n:vals.length,low_rate:low});
      }
      const recurring=eligible.filter(g=>g.low_rate>=opt.segmentLowRate);
      if(eligible.length)out.push({key,eligible_segments:eligible.length,recurring_segments:recurring.length,segments:eligible.map(g=>({...g,low_rate:round(g.low_rate)}))});
    }
    return out;
  }

  function trendFor(key,snapshots,opt){
    const byAssessment=new Map();
    for(const s of snapshots){
      if(!s.assessment_id)continue;
      const comp=indexCompetencies(s).get(key);
      if(!comp||comp.others===null)continue;
      if(!byAssessment.has(s.assessment_id))byAssessment.set(s.assessment_id,[]);
      byAssessment.get(s.assessment_id).push({cycle:s.cycle,others:comp.others});
    }
    const deltas=[];
    for(const arr of byAssessment.values()){
      arr.sort((a,b)=>a.cycle-b.cycle);
      if(arr.length<2)continue;
      const first=arr[0],last=arr[arr.length-1];
      if(last.cycle>first.cycle)deltas.push(last.others-first.others);
    }
    if(!deltas.length)return {pairs:0,mean_delta:null,improved_rate:null,regressed_rate:null,persistent:false};
    const meanDelta=avg(deltas);
    return {
      pairs:deltas.length,
      mean_delta:round(meanDelta),
      improved_rate:round(deltas.filter(d=>d>=0.20).length/deltas.length),
      regressed_rate:round(deltas.filter(d=>d<=-0.20).length/deltas.length),
      persistent:deltas.length>=opt.minTrendPairs&&meanDelta<opt.persistentDelta
    };
  }

  function confidence(n,participation,opt){
    if(n<opt.minAssessments)return'insufficient';
    const pr=participation?.invitations?.completion_rate;
    if(n>=20&&(pr===null||pr===undefined||pr>=0.70))return'high';
    if(n>=10&&(pr===null||pr===undefined||pr>=0.60))return'medium';
    return'directional';
  }

  function classify(row,opt){
    if(row.n<opt.minAssessments)return {type:'suppressed',reasons:['insufficient_org_coverage']};
    const reasons=[];
    const segBroad=(row.segment_recurrence||[]).some(x=>x.recurring_segments>=2);
    const systemic=row.low_rate>=opt.systemicLowRate&&(segBroad||row.trend.persistent);
    if(systemic){
      if(row.low_rate>=opt.systemicLowRate)reasons.push('broad_low_others');
      if(segBroad)reasons.push('repeats_across_segments');
      if(row.trend.persistent)reasons.push('persists_across_cycles');
      return {type:'systemic',reasons};
    }
    if(row.others_mean!==null&&row.others_mean<=opt.lowOthers&&row.low_rate>=opt.broadLowRate){
      reasons.push('broad_low_others');
      if(row.shared_low_rate>=0.30)reasons.push('shared_development_view');
      return {type:'development',reasons};
    }
    if((row.abs_gap_mean!==null&&row.abs_gap_mean>=opt.attentionGap)||row.blind_spot_rate>=opt.blindRate||(row.others_mean!==null&&row.others_mean<=3.40&&row.low_rate>=0.30)){
      if(row.abs_gap_mean!==null&&row.abs_gap_mean>=opt.attentionGap)reasons.push('large_self_others_gap');
      if(row.blind_spot_rate>=opt.blindRate)reasons.push('repeated_possible_blind_spot');
      if(row.others_mean!==null&&row.others_mean<=3.40&&row.low_rate>=0.30)reasons.push('emerging_low_others');
      return {type:'attention',reasons};
    }
    if(row.others_mean!==null&&row.others_mean>=opt.strongOthers&&row.low_rate<0.20&&(row.abs_gap_mean===null||row.abs_gap_mean<0.40)){
      return {type:'strength',reasons:['consistently_strong_others']};
    }
    return {type:'neutral',reasons:[]};
  }

  function analyse(snapshotsInput,participationInput=null,options={}){
    const opt={...DEFAULTS,...options};
    const snapshots=(snapshotsInput||[]).map(normaliseSnapshot);
    const latest=latestSnapshots(snapshots);
    const participation=participationMetrics(participationInput);
    const catalog=new Map();
    for(const s of latest){
      for(const c of s.competencies){
        const key=c.key||c.name;
        if(!catalog.has(key))catalog.set(key,{key,name:c.name,cluster:c.cluster});
      }
    }
    const competencies=[];
    for(const meta of catalog.values()){
      const rows=[];
      for(const s of latest){
        const c=indexCompetencies(s).get(meta.key);
        if(!c)continue;
        rows.push({assessment_id:s.assessment_id,cycle:s.cycle,segment:s.segment,self:c.self,others:c.others});
      }
      const othersVals=rows.map(r=>r.others).filter(v=>v!==null);
      const comparable=rows.filter(r=>r.self!==null&&r.others!==null);
      const gaps=comparable.map(r=>r.self-r.others);
      const absGaps=gaps.map(Math.abs);
      const n=othersVals.length;
      const row={
        key:meta.key,name:meta.name,cluster:meta.cluster,n,
        others_mean:round(avg(othersVals)),
        self_mean:round(avg(comparable.map(r=>r.self))),
        signed_gap_mean:round(avg(gaps)),
        abs_gap_mean:round(avg(absGaps)),
        low_rate:round(pct(othersVals.filter(v=>v<=opt.lowOthers).length,n)||0),
        shared_low_rate:round(pct(comparable.filter(r=>r.self<=opt.lowOthers&&r.others<=opt.lowOthers).length,comparable.length)||0),
        blind_spot_rate:round(pct(comparable.filter(r=>(r.self-r.others)>=opt.blindGap&&r.others<=opt.blindMaxOthers).length,comparable.length)||0),
        segment_recurrence:segmentRecurrence(rows,opt),
        trend:trendFor(meta.key,snapshots,opt)
      };
      row.confidence=confidence(n,participation,opt);
      row.signal=classify(row,opt);
      competencies.push(row);
    }
    const priority={systemic:0,development:1,attention:2,strength:3,neutral:4,suppressed:5};
    competencies.sort((a,b)=>(priority[a.signal.type]-priority[b.signal.type])||((a.others_mean??99)-(b.others_mean??99))||b.n-a.n);

    const clusterMap=new Map();
    for(const c of competencies.filter(c=>c.n>=opt.minAssessments)){
      if(!clusterMap.has(c.cluster))clusterMap.set(c.cluster,[]);
      clusterMap.get(c.cluster).push(c);
    }
    const clusters=[...clusterMap.entries()].map(([name,items])=>({
      name,
      competencies:items.length,
      others_mean:round(avg(items.map(x=>x.others_mean).filter(v=>v!==null))),
      systemic_signals:items.filter(x=>x.signal.type==='systemic').length,
      development_signals:items.filter(x=>x.signal.type==='development').length,
      attention_signals:items.filter(x=>x.signal.type==='attention').length,
      strengths:items.filter(x=>x.signal.type==='strength').length
    })).sort((a,b)=>(b.systemic_signals-a.systemic_signals)||(b.development_signals-a.development_signals)||((a.others_mean??99)-(b.others_mean??99)));

    return {
      schema:SUMMARY_SCHEMA,
      generated_at:new Date().toISOString(),
      guardrails:{
        min_assessments:opt.minAssessments,
        min_trend_pairs:opt.minTrendPairs,
        no_raw_responses:true,
        no_open_comments:true,
        no_individual_leader_ranking:true,
        interpretation:'heuristic_directional_not_diagnostic'
      },
      coverage:{snapshots:snapshots.length,current_assessments:latest.length,with_assessment_id:latest.filter(s=>s.assessment_id).length},
      participation,
      competencies,
      clusters
    };
  }

  return {SNAPSHOT_SCHEMA,PARTICIPATION_SCHEMA,SUMMARY_SCHEMA,DEFAULTS,fromAggregate,normaliseSnapshot,normaliseParticipation,participationMetrics,analyse};
});
