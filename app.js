// GLA360 Personal – app.js
// Shared logic: load questions, render survey, collect answers, aggregate, report
// Answer format: { "COMM_INT_1": 4, "COMM_INT_2": 3, ... } (key-based)

const GLA = (()=>{

  // ── 0. Lietuvių kalbos vertimų žodynas ───────────────────────────────────
  // Anglų k. raktai naudojami kode, lietuvių k. rodomi vartotojui
  const LT = {
    // Sritys (clusters)
    'Communication':              'Komunikacija',
    'Assure Success':             'Sėkmės užtikrinimas',
    'Engaging People':            'Žmonių įtraukimas',
    'Continuous Change':          'Nuolatinis tobulėjimas',
    'Boundary-less Inclusion':    'Įtraukianti aplinka',
    // Gebėjimai (competencies)
    'Demonstrating Integrity':          'Sąžiningumas ir patikimumas',
    'Encouraging Dialogue':             'Dialogo skatinimas',
    'Creating Shared Vision':           'Bendros krypties kūrimas',
    'Developing Technological Savvy':   'Technologinis išprusimas',
    'Ensuring Customer Satisfaction':   'Kliento pasitenkinimas',
    'Maintaining Competitive Advantage':'Konkurencinis pranašumas',
    'Developing People':                'Žmonių ugdymas',
    'Building Partnerships':            'Partnerystės kūrimas',
    'Sharing Leadership':               'Lyderiavimo dalijimasis',
    'Achieving Personal Mastery':       'Asmeninis tobulėjimas',
    'Anticipating Opportunities':       'Galimybių numatymas',
    'Leading Change':                   'Pokyčių valdymas',
    'Empowering People':                'Žmonių įgalinimas',
    'Thinking Globally':                'Globalus mąstymas',
    'Appreciating Diversity':           'Įvairovės vertinimas',
  };

  // Verčia anglišką raktą į lietuvišką; jei nežinomas – grąžina originalą
  function lt(key){ return LT[key] || key; }

  // ── 1. ID generation ──────────────────────────────────────────────────────
  function newAssessmentId(leader){
    const init = (leader||'').trim().split(/\s+/).map(s=>(s[0]||'').toUpperCase()).join('') || 'A';
    const ts   = new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
    const rand = Math.random().toString(36).slice(2,10);
    return `${init}-${ts}-${rand}`;
  }

  // ── 2. Load questions ─────────────────────────────────────────────────────
  async function loadBank(){
    const res = await fetch('bank/questions.json?v=' + Date.now(), { cache:'no-store' });
    if(!res.ok) throw new Error('Nepavyko įkelti bank/questions.json (HTTP ' + res.status + ')');
    return await res.json();
  }

  // ── 3. Render survey ──────────────────────────────────────────────────────
  function renderSurvey(bank, mountId){
    const host = document.getElementById(mountId || 'questions');
    if(!host) return;

    const scale = [
      { v:1, label:'Beveik niekada' },
      { v:2, label:'Retai'          },
      { v:3, label:'Kartais'        },
      { v:4, label:'Dažnai'         },
      { v:5, label:'Beveik visada'  },
    ];

    let html = '';
    let qNum = 0;

    bank.competencies.forEach(comp => {
      html += `<div class="comp-block">
        <div class="comp-header">
          <span class="comp-cluster">${esc(lt(comp.cluster))}</span>
          <span class="comp-name">${esc(lt(comp.name))}</span>
        </div>`;

      comp.items.forEach(item => {
        qNum++;
        html += `
        <div class="q" data-key="${esc(item.key)}">
          <div class="q-stem"><span class="q-num">${qNum}.</span> ${esc(item.stem)}</div>
          <div class="q-scale">
            ${scale.map(s => `
              <label class="q-opt">
                <input type="radio" name="${esc(item.key)}" value="${s.v}" required>
                <span class="q-val">${s.v}</span>
                <span class="q-label">${s.label}</span>
              </label>
            `).join('')}
          </div>
        </div>`;
      });

      html += `</div>`;
    });

    // Open questions
    html += `
      <div class="comp-block open-block">
        <div class="comp-header">
          <span class="comp-cluster">Atviri klausimai</span>
          <span class="comp-name">Neprivaloma</span>
        </div>
        <div class="open-q">
          <label>Stiprybės – kuo šis žmogus išsiskiria?
            <textarea id="open_str" rows="3" placeholder="Konkretūs pavyzdžiai..."></textarea>
          </label>
        </div>
        <div class="open-q">
          <label>Ką rekomenduotumėte tobulinti per artimiausius 90 dienų?
            <textarea id="open_dev" rows="3" placeholder="Konkretūs elgesiai ir situacijos..."></textarea>
          </label>
        </div>
      </div>`;

    host.innerHTML = html;
  }

  // ── 4. Collect answers ────────────────────────────────────────────────────
  function collectAnswers(bank){
    const answers = {};
    bank.competencies.forEach(comp => {
      comp.items.forEach(item => {
        const checked = document.querySelector(`input[name="${CSS.escape(item.key)}"]:checked`);
        answers[item.key] = checked ? Number(checked.value) : null;
      });
    });
    return answers;
  }

  function collectOpen(){
    return {
      strengths: (document.getElementById('open_str')?.value || '').trim(),
      develop:   (document.getElementById('open_dev')?.value || '').trim()
    };
  }

  // ── 5. Validate ───────────────────────────────────────────────────────────
  function getMissingKeys(answers){
    return Object.entries(answers).filter(([,v]) => v === null).map(([k]) => k);
  }

  // ── 6. Pack / unpack response ─────────────────────────────────────────────
  function packResponse({ aid, role, answers, open }){
    const dateOnly = new Date().toISOString().slice(0, 10);
    return {
      schema: 'gla360-personal@2',
      aid,
      role: role.toUpperCase(),
      ts: dateOnly,
      answers,
      open: open || {}
    };
  }

  function unpackResponse(obj){
    if(obj.schema === 'gla360-personal@2') return obj;
    if(obj.answers && Object.keys(obj.answers).some(k => /^Q\d+$/.test(k))){
      console.warn('Legacy answer format detected for AID:', obj.aid);
      return { ...obj, _legacy: true };
    }
    if(obj.aid && obj.role && obj.answers) return obj;
    return obj;
  }

  // ── 7. Download JSON ──────────────────────────────────────────────────────
  function download(filename, obj){
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ── 8. Aggregate ──────────────────────────────────────────────────────────
  const ROLE_WEIGHTS_DEFAULT = { boss:0.30, peer:0.30, report:0.30, other:0.10 };

  function normalizeWeights(w){
    const keys = ['boss','peer','report','other'];
    let sum = keys.reduce((t,k) => t + (Number(w[k])||0), 0);
    if(sum <= 0) sum = 1;
    const out = {};
    keys.forEach(k => out[k] = (Number(w[k])||0) / sum);
    return out;
  }

  function aggregate(bank, packs, weights){
    const w = normalizeWeights(weights || ROLE_WEIGHTS_DEFAULT);
    const compCount = bank.competencies.length;

    const keyMap = {};
    bank.competencies.forEach((comp, ci) => {
      comp.items.forEach((item, ii) => {
        keyMap[item.key] = { ci, ii, compName: comp.name, cluster: comp.cluster };
      });
    });

    const roleData = { self:{}, boss:{}, peer:{}, report:{}, other:{} };
    Object.keys(roleData).forEach(r => {
      roleData[r] = Array.from({ length: compCount }, () => []);
    });

    const comments = [];
    const legacyWarnings = [];

    for(const pack of packs){
      if(pack._legacy){
        legacyWarnings.push(pack.role);
        continue;
      }
      const role = (pack.role||'other').toLowerCase();
      const safeRole = roleData[role] ? role : 'other';

      const compScores = Array.from({ length: compCount }, () => []);
      for(const [key, val] of Object.entries(pack.answers || {})){
        if(val === null || val === undefined) continue;
        const info = keyMap[key];
        if(!info) continue;
        compScores[info.ci].push(Number(val));
      }
      compScores.forEach((scores, ci) => {
        if(scores.length > 0){
          roleData[safeRole][ci].push(scores.reduce((a,b)=>a+b,0)/scores.length);
        }
      });

      const o = pack.open || {};
      if(o.strengths) comments.push({ role: safeRole, type:'strengths', text: o.strengths });
      if(o.develop)   comments.push({ role: safeRole, type:'develop',   text: o.develop });
    }

    const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
    const means = {};
    Object.keys(roleData).forEach(r => {
      means[r] = roleData[r].map(arr => avg(arr));
    });

    const others = Array.from({ length: compCount }, (_, ci) => {
      const vals = [];
      const ws   = [];
      [['boss',w.boss],['peer',w.peer],['report',w.report],['other',w.other]].forEach(([r,wt]) => {
        if(means[r][ci] !== null){ vals.push(means[r][ci] * wt); ws.push(wt); }
      });
      if(!ws.length) return null;
      const wSum = ws.reduce((a,b)=>a+b,0);
      return wSum > 0 ? vals.reduce((a,b)=>a+b,0) / wSum : null;
    });

    const clusterNames = [...new Set(bank.competencies.map(c=>c.cluster))];
    const clusterMeans = {
      self:   clusterNames.map(cl => {
        const idxs = bank.competencies.map((c,i)=>c.cluster===cl?i:-1).filter(i=>i>=0);
        return avg(idxs.map(i=>means.self[i]).filter(v=>v!==null));
      }),
      others: clusterNames.map(cl => {
        const idxs = bank.competencies.map((c,i)=>c.cluster===cl?i:-1).filter(i=>i>=0);
        return avg(idxs.map(i=>others[i]).filter(v=>v!==null));
      })
    };

    const diffs = bank.competencies.map((comp, ci) => ({
      ci,
      name: comp.name,
      cluster: comp.cluster,
      self:   means.self[ci],
      others: others[ci],
      diff:   (others[ci] !== null && means.self[ci] !== null)
                ? others[ci] - means.self[ci]
                : null
    })).filter(d => d.diff !== null).sort((a,b) => a.diff - b.diff);

    const gaps = diffs.filter(d => d.diff < 0).slice(0, 3);
    const trueStrengths = diffs.filter(d => d.diff > 0).slice(-3).reverse();
    const strengths = trueStrengths.length > 0
      ? trueStrengths
      : diffs.slice(-3).reverse().map(s => ({ ...s, _relative: true }));

    return {
      bank, weights: w, means, others,
      clusterNames, clusterMeans,
      diffs, gaps, strengths,
      comments, legacyWarnings,
      packsCount: packs.length
    };
  }

  // ── 9. Render report sections ─────────────────────────────────────────────
  function renderSummary(agg){
    const totalItems = agg.bank.competencies.reduce((t,c)=>t+c.items.length,0);
    const legacy = agg.legacyWarnings.length
      ? `<p class="warn">⚠️ Senojo formato failai (nepanaudoti): ${agg.legacyWarnings.join(', ')}</p>` : '';
    return `
      ${legacy}
      <p><strong>Įkeltų vertintojų failų:</strong> ${agg.packsCount}</p>
      <p><strong>Gebėjimų sričių:</strong> ${agg.bank.competencies.length} &nbsp;|&nbsp; <strong>Klausimų:</strong> ${totalItems}</p>
      <p><strong>Svoriai (Kiti):</strong>
        Vadovas ${(agg.weights.boss*100).toFixed(0)}% ·
        Kolegos ${(agg.weights.peer*100).toFixed(0)}% ·
        Pavaldiniai ${(agg.weights.report*100).toFixed(0)}% ·
        Kiti ${(agg.weights.other*100).toFixed(0)}%
      </p>
      <p><strong>Didžiausios spragos:</strong>
        ${agg.gaps.map(g=>`${lt(g.name)} (${g.diff.toFixed(2)})`).join(' · ')}
      </p>`;
  }

  function renderRadar(canvasId, agg){
    if(!window.Chart) return;
    const existing = Chart.getChart(canvasId);
    if(existing) existing.destroy();

    const labels = agg.bank.competencies.map(c => lt(c.name));
    const selfData   = agg.bank.competencies.map((_,ci) => agg.means.self[ci] || 0);
    const othersData = agg.bank.competencies.map((_,ci) => agg.others[ci] || 0);

    new Chart(document.getElementById(canvasId), {
      type: 'radar',
      data: {
        labels,
        datasets: [
          { label:'Savivertinimas', data:selfData, fill:true,
            backgroundColor:'rgba(90,200,250,.15)', borderColor:'rgba(90,200,250,.9)', pointBackgroundColor:'rgba(90,200,250,1)' },
          { label:'Kiti (svorinė)', data:othersData, fill:true,
            backgroundColor:'rgba(126,224,129,.15)', borderColor:'rgba(126,224,129,.9)', pointBackgroundColor:'rgba(126,224,129,1)' }
        ]
      },
      options: {
        scales:{ r:{ suggestedMin:1, suggestedMax:5, ticks:{ stepSize:1, backdropColor:'transparent' },
          grid:{ color:'rgba(128,128,128,.2)' }, angleLines:{ color:'rgba(128,128,128,.2)' },
          pointLabels:{ font:{ size:10 } } } },
        plugins:{ legend:{ position:'bottom' } }
      }
    });
  }

  function renderClusters(agg){
    const rows = agg.clusterNames.map((cl, i) => {
      const s = agg.clusterMeans.self[i];
      const o = agg.clusterMeans.others[i];
      const diff = (s !== null && o !== null) ? (o - s) : null;
      const diffStr = diff !== null
        ? `<span class="${diff >= 0 ? 'pos' : 'neg'}">${diff >= 0 ? '+' : ''}${diff.toFixed(2)}</span>`
        : '—';
      return `<tr>
        <td>${esc(lt(cl))}</td>
        <td>${s !== null ? s.toFixed(2) : '—'}</td>
        <td>${o !== null ? o.toFixed(2) : '—'}</td>
        <td>${diffStr}</td>
      </tr>`;
    }).join('');
    return `<table>
      <thead><tr><th>Sritis</th><th>Savivertinimas</th><th>Kiti (sv.)</th><th>Skirtumas</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function renderStrengthsGaps(agg, strengthsId, gapsId){
    const SUGGESTIONS = {
      'Demonstrating Integrity':          'Savaitiniai įsipareigojimų apžvalgos ritualai; viešas statuso ataskaitos šablonas.',
      'Encouraging Dialogue':             'Įveskite 2 min. tylos + klausimų raundą kiekviename susitikime.',
      'Creating Shared Vision':           'Vienas vizijos šablonas: tikslas → kliento vertė → sėkmės metrika.',
      'Developing Technological Savvy':   'Kas 2 savaitės 30 min. tech peržiūra + 1 pritaikymas komandoje.',
      'Ensuring Customer Satisfaction':   'Mėnesio ritmas: CSAT/NPS įžvalgos → konkretūs veiksmai.',
      'Maintaining Competitive Advantage':'Ketvirtis: 2 konkurentų analizės + 1 eksperimentas.',
      'Developing People':                '1:1 – konkreti grįžtamoji informacija ir augimo klausimas kas 2 sav.',
      'Building Partnerships':            'Kas mėnesį – 1 nauja partnerystė su aiškiu abipusės vertės tikslu.',
      'Sharing Leadership':               'Deleguokite sprendimą su aiškiais rėmais ir sėkmės kriterijais.',
      'Achieving Personal Mastery':       'Kasdien 10 min. refleksija + savaitinis prioritetų peržiūrėjimas.',
      'Anticipating Opportunities':       'Du scenarijai (geriausias/blogiausias) su trigeriais trims tikslams.',
      'Leading Change':                   'Kiekvienam pokyčiui: kas/ką/kada/kodėl + 2 greiti laimėjimai.',
      'Empowering People':                'Suteikite autonomiją vienoje srityje su aiškiais sprendimo rėmais.',
      'Thinking Globally':                'Sprendimus tikrinkite per 3 rinkų ar kultūrų perspektyvą.',
      'Appreciating Diversity':           'Skirtumų vertė – 2 min. momentas kiekviename susitikime.'
    };
    const CAPITALIZE = 'Dokumentuokite gerąją praktiką ir dalinkitės per shadowing ar mini‑mokymą.';

    if(gapsId){
      const el = document.getElementById(gapsId);
      if(!agg.gaps.length){
        el.innerHTML = '<li class="muted">Reikšmingų spragų nerasta – puiku!</li>';
      } else {
        el.innerHTML = agg.gaps.map(g => `
          <li>
            <div class="sg-title">
              <strong>${esc(lt(g.name))}</strong>
              <span class="badge">${esc(lt(g.cluster))}</span>
              <span class="score-chip neg">Kiti ${g.others !== null ? g.others.toFixed(2) : '—'} · Aš ${g.self !== null ? g.self.toFixed(2) : '—'} · Tarpas ${g.diff.toFixed(2)}</span>
            </div>
            <div class="suggest">💡 ${esc(SUGGESTIONS[g.name] || 'Apibrėžkite konkretų, matuojamą elgesį ir 30/60/90 d. planą.')}</div>
          </li>`).join('');
      }
    }

    if(strengthsId){
      const el = document.getElementById(strengthsId);
      const isRelative = agg.strengths.length > 0 && agg.strengths[0]._relative;
      if(isRelative){
        el.innerHTML = `<li class="alert info" style="list-style:none;margin-bottom:8px;">
          ℹ️ Vertintojai visose srityse įvertino žemiau nei savivertinimas. Žemiau – santykinai stipriausios sritys.
        </li>` + agg.strengths.map(s => `
          <li>
            <div class="sg-title">
              <strong>${esc(lt(s.name))}</strong>
              <span class="badge">${esc(lt(s.cluster))}</span>
              <span class="score-chip neutral">Kiti ${s.others !== null ? s.others.toFixed(2) : '—'} · Aš ${s.self !== null ? s.self.toFixed(2) : '—'} · ${s.diff.toFixed(2)}</span>
            </div>
            <div class="suggest">🚀 ${esc(CAPITALIZE)}</div>
          </li>`).join('');
      } else {
        el.innerHTML = agg.strengths.map(s => `
          <li>
            <div class="sg-title">
              <strong>${esc(lt(s.name))}</strong>
              <span class="badge">${esc(lt(s.cluster))}</span>
              <span class="score-chip pos">Kiti ${s.others !== null ? s.others.toFixed(2) : '—'} · Aš ${s.self !== null ? s.self.toFixed(2) : '—'} · +${s.diff.toFixed(2)}</span>
            </div>
            <div class="suggest">🚀 ${esc(CAPITALIZE)}</div>
          </li>`).join('');
      }
    }
  }

  function renderComments(agg, mountId){
    const el = document.getElementById(mountId);
    if(!el) return;
    if(!agg.comments.length){
      el.innerHTML = '<li class="muted">Komentarų nėra.</li>';
      return;
    }
    const roleLabels = { self:'Pats lyderis', boss:'Vadovas', peer:'Kolega', report:'Pavaldinys', other:'Kitas' };
    el.innerHTML = agg.comments.map(c => `
      <li>
        <span class="badge">${esc(roleLabels[c.role] || c.role.toUpperCase())}</span>
        <span class="badge secondary">${c.type === 'strengths' ? '💪 Stiprybės' : '🎯 Tobulinti'}</span>
        ${esc(c.text)}
      </li>`).join('');
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  function esc(s){
    return String(s||'').replace(/[&<>"']/g, m =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }
// ─────────────────────────────────────────────────────────────────────────────
// GLA360 Personal – app.js PAPILDYMAI
// Pridėkite šį kodą į app.js pabaigą, prieš uždarymo  `return { ... }` bloką
// ─────────────────────────────────────────────────────────────────────────────
 
// ── Delta ribos ───────────────────────────────────────────────────────────────
const DELTA_THRESHOLDS = {
  improved:      0.5,   // Δ >= +0.5  → aiškus pagerėjimas
  mild_improved: 0.2,   // Δ >= +0.2  → šiek tiek pagerėjo
  stagnated_pos: 0.2,   // |Δ| < 0.2  → nepasikeitė
  stagnated_neg:-0.2,   // |Δ| < 0.2  → nepasikeitė
  regressed:    -0.2,   // Δ <= -0.2  → pablogėjo
};
 
// ── getTrend ──────────────────────────────────────────────────────────────────
// Grąžina: 'improved' | 'mild_improved' | 'stagnated' | 'regressed' | 'first_time'
function getTrend(delta){
  if(delta === null || delta === undefined) return 'first_time';
  if(delta >= DELTA_THRESHOLDS.improved)      return 'improved';
  if(delta >= DELTA_THRESHOLDS.mild_improved) return 'mild_improved';
  if(delta > DELTA_THRESHOLDS.stagnated_neg)  return 'stagnated';
  return 'regressed';
}
 
// ── getTrendLabel ─────────────────────────────────────────────────────────────
function getTrendLabel(trend){
  return {
    improved:      { lt:'Aiškiai pagerėjo',    icon:'↑↑', css:'pos'     },
    mild_improved: { lt:'Šiek tiek pagerėjo',  icon:'↑',  css:'pos'     },
    stagnated:     { lt:'Nepasikeitė',          icon:'→',  css:'neutral' },
    regressed:     { lt:'Pablogėjo',            icon:'↓',  css:'neg'     },
    first_time:    { lt:'Naujas vertinimas',    icon:'★',  css:'brand'   },
  }[trend] || { lt:'Nežinoma', icon:'?', css:'muted' };
}
 
// ── compareAggregates ─────────────────────────────────────────────────────────
// agg1 = ankstesnis ciklas (C1), agg2 = dabartinis (C2)
// Grąžina delta objektą su pilna palyginimo informacija
function compareAggregates(agg1, agg2){
  const comps = agg2.bank.competencies;
 
  const items = comps.map((comp, ci) => {
    const c1_self   = agg1.means?.self?.[ci]   ?? null;
    const c2_self   = agg2.means?.self?.[ci]   ?? null;
    const c1_others = agg1.others?.[ci]         ?? null;
    const c2_others = agg2.others?.[ci]         ?? null;
 
    const delta_others = (c1_others !== null && c2_others !== null)
      ? parseFloat((c2_others - c1_others).toFixed(3))
      : null;
 
    const delta_self = (c1_self !== null && c2_self !== null)
      ? parseFloat((c2_self - c1_self).toFixed(3))
      : null;
 
    const trend = getTrend(delta_others);
 
    return {
      ci,
      name:        comp.name,
      cluster:     comp.cluster,
      c1_self,
      c2_self,
      c1_others,
      c2_others,
      delta_others,
      delta_self,
      trend,
      trendLabel:  getTrendLabel(trend),
    };
  });
 
  // Suvestinė statistika
  const withDelta    = items.filter(i => i.delta_others !== null);
  const improved     = items.filter(i => i.trend === 'improved' || i.trend === 'mild_improved');
  const stagnated    = items.filter(i => i.trend === 'stagnated');
  const regressed    = items.filter(i => i.trend === 'regressed');
  const avgDelta     = withDelta.length
    ? parseFloat((withDelta.reduce((s,i) => s + i.delta_others, 0) / withDelta.length).toFixed(3))
    : null;
 
  // Top pagerėjusios ir pablogėjusios
  const topImproved  = [...improved].sort((a,b) => b.delta_others - a.delta_others).slice(0,3);
  const topRegressed = [...regressed].sort((a,b) => a.delta_others - b.delta_others).slice(0,3);
 
  return {
    schema:      'gla360-compare@1',
    generatedAt: new Date().toISOString().slice(0,10),
    cycle_c1:    agg1.cycle || 1,
    cycle_c2:    agg2.cycle || 2,
    items,
    summary: {
      total:        items.length,
      improved:     improved.length,
      stagnated:    stagnated.length,
      regressed:    regressed.length,
      avgDelta,
    },
    topImproved,
    topRegressed,
    hasRegressed:  regressed.length > 0,
    gaps_c2:       agg2.gaps  || [],
    weights_c2:    agg2.weights || {},
  };
}
  // ── Public API ────────────────────────────────────────────────────────────
  return {
    newAssessmentId,
    loadBank,
    renderSurvey,
    collectAnswers,
    collectOpen,
    getMissingKeys,
    packResponse,
    unpackResponse,
    download,
    aggregate,
    renderSummary,
    renderRadar,
    renderClusters,
    renderStrengthsGaps,
    renderComments,
    lt,// export lt() for use in plan.html and other pages
    compareAggregates,
     getTrend,
    getTrendLabel,
    DELTA_THRESHOLDS,   
  };
})();
