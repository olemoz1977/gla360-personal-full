// GLA360 Personal – app.js
// Shared logic: load questions, render survey, collect answers, aggregate, report
// Answer format: { "COMM_INT_1": 4, "COMM_INT_2": 3, ... } (key-based)

const GLA = (()=>{

  // ── 1. ID generation ──────────────────────────────────────────────────────
  function newAssessmentId(leader){
    const init = (leader||'').trim().split(/\s+/).map(s=>(s[0]||'').toUpperCase()).join('') || 'A';
    const ts   = new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
    const rand = Math.random().toString(36).slice(2,10);
    return `${init}-${ts}-${rand}`;
  }

  // ── 2. Load questions ─────────────────────────────────────────────────────
  // Resolves bank/questions.json relative to app.js location, not the page URL.
  // This ensures it works even if pages are linked from README or other locations.
  async function loadBank(){
    // Build URL relative to this script file's location
    const scriptEl = document.querySelector('script[src*="app.js"]');
    const base = scriptEl
      ? scriptEl.src.substring(0, scriptEl.src.lastIndexOf('/') + 1)
      : (location.href.substring(0, location.href.lastIndexOf('/') + 1));
    const url = base + 'bank/questions.json';
    const res = await fetch(url + '?v=' + Date.now(), { cache:'no-store' });
    if(!res.ok) throw new Error('Nepavyko įkelti bank/questions.json (HTTP ' + res.status + ')');
    return await res.json();
  }

  // ── 3. Render survey ──────────────────────────────────────────────────────
  // Renders all questions into #questions element
  // Each question gets a radio group named by its key (e.g. "COMM_INT_1")
  function renderSurvey(bank, mountId){
    const host = document.getElementById(mountId || 'questions');
    if(!host) return;

    const scale = [1,2,3,4,5];
    const scaleLabels = { 1:'Labai retai', 3:'Kartais', 5:'Nuosekliai' };

    let html = '';
    let qNum = 0;

    bank.competencies.forEach(comp => {
      html += `<div class="comp-block">
        <div class="comp-header">
          <span class="comp-cluster">${esc(comp.cluster)}</span>
          <span class="comp-name">${esc(comp.name)}</span>
        </div>`;

      comp.items.forEach(item => {
        qNum++;
        html += `
        <div class="q" data-key="${esc(item.key)}">
          <div class="q-stem"><span class="q-num">${qNum}.</span> ${esc(item.stem)}</div>
          <div class="q-scale">
            ${scale.map(v => `
              <label class="q-opt">
                <input type="radio" name="${esc(item.key)}" value="${v}" required>
                <span class="q-val">${v}</span>
                ${scaleLabels[v] ? `<span class="q-label">${scaleLabels[v]}</span>` : ''}
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
          <label>Stiprybės – kuo šis lyderis išsiskiria?
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
  // Returns { "COMM_INT_1": 4, ... } – key-based format
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
  // NOTE: 'i' (rater index) is intentionally NOT stored in the JSON file.
  // This protects anonymity – the leader cannot identify which peer is which.
  // 'i' is only used in the URL to generate unique survey links.
  function packResponse({ aid, role, answers, open }){
    // ts rounded to date only (not hour/minute) – protects anonymity
    const dateOnly = new Date().toISOString().slice(0, 10);
    return {
      schema: 'gla360-personal@2',
      aid,
      role: role.toUpperCase(),
      ts: dateOnly,
      answers,   // { "COMM_INT_1": 4, ... }
      open: open || {}
    };
  }

  function unpackResponse(obj){
    if(obj.schema === 'gla360-personal@2') return obj;
    // Legacy v1 format (Q1, Q2, ...) – can't aggregate properly, warn
    if(obj.answers && Object.keys(obj.answers).some(k => /^Q\d+$/.test(k))){
      console.warn('Legacy answer format detected for AID:', obj.aid);
      return { ...obj, _legacy: true };
    }
    // Accept files without schema if they have aid+role+answers (partial compatibility)
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
    const compCount = bank.competencies.length; // 15

    // Build lookup: key → { compIndex, itemIndex }
    const keyMap = {};
    bank.competencies.forEach((comp, ci) => {
      comp.items.forEach((item, ii) => {
        keyMap[item.key] = { ci, ii, compName: comp.name, cluster: comp.cluster };
      });
    });

    // Per role, per competency: array of individual scores
    const roleData = { self:{}, boss:{}, peer:{}, report:{}, other:{} };
    Object.keys(roleData).forEach(r => {
      roleData[r] = Array.from({ length: compCount }, () => []);
    });

    const comments = [];
    const legacyWarnings = [];

    for(const pack of packs){
      if(pack._legacy){
        legacyWarnings.push(pack.role + ' #' + pack.i);
        continue;
      }
      const role = (pack.role||'other').toLowerCase();
      const safeRole = roleData[role] ? role : 'other';

      // For each key in answers, map to competency index
      const compScores = Array.from({ length: compCount }, () => []);
      for(const [key, val] of Object.entries(pack.answers || {})){
        if(val === null || val === undefined) continue;
        const info = keyMap[key];
        if(!info) continue;
        compScores[info.ci].push(Number(val));
      }
      // Average per competency for this rater
      compScores.forEach((scores, ci) => {
        if(scores.length > 0){
          roleData[safeRole][ci].push(scores.reduce((a,b)=>a+b,0)/scores.length);
        }
      });

      // Open comments – no rater index stored (anonymity)
      const o = pack.open || {};
      if(o.strengths) comments.push({ role: safeRole, type:'strengths', text: o.strengths });
      if(o.develop)   comments.push({ role: safeRole, type:'develop',   text: o.develop });
    }

    // Mean per role per competency
    const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
    const means = {};
    Object.keys(roleData).forEach(r => {
      means[r] = roleData[r].map(arr => avg(arr));
    });

    // Weighted "Others" (excluding self)
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

    // Unique clusters
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

    // Diffs per competency (others - self), sorted ascending (most negative = biggest gap first)
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

    // Gaps: Others scored lower than Self (negative diff)
    const gaps = diffs.filter(d => d.diff < 0).slice(0, 3);

    // True strengths: Others scored higher than Self (positive diff)
    const trueStrengths = diffs.filter(d => d.diff > 0).slice(-3).reverse();

    // If no positive diffs, show least-negative as relative strengths
    const strengths = trueStrengths.length > 0
      ? trueStrengths
      : diffs.slice(-3).reverse().map(s => ({ ...s, _relative: true }));

    return {
      bank,
      weights: w,
      means,
      others,
      clusterNames,
      clusterMeans,
      diffs,
      gaps,
      strengths,
      comments,
      legacyWarnings,
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
      <p><strong>Įkeltų raterių failų:</strong> ${agg.packsCount}</p>
      <p><strong>Kompetencijų:</strong> ${agg.bank.competencies.length} &nbsp;|&nbsp; <strong>Klausimų:</strong> ${totalItems}</p>
      <p><strong>Svoriai (Others):</strong>
        Vadovas ${(agg.weights.boss*100).toFixed(0)}% ·
        Kolegos ${(agg.weights.peer*100).toFixed(0)}% ·
        Pavaldiniai ${(agg.weights.report*100).toFixed(0)}% ·
        Kiti ${(agg.weights.other*100).toFixed(0)}%
      </p>
      <p><strong>Didžiausios spragos:</strong>
        ${agg.gaps.map(g=>`${g.name} (${g.diff.toFixed(2)})`).join(' · ')}
      </p>`;
  }

  function renderRadar(canvasId, agg){
    if(!window.Chart) return;
    const existing = Chart.getChart(canvasId);
    if(existing) existing.destroy();

    const labels = agg.bank.competencies.map(c=>c.name);
    const selfData   = agg.bank.competencies.map((_,ci) => agg.means.self[ci] || 0);
    const othersData = agg.bank.competencies.map((_,ci) => agg.others[ci] || 0);

    new Chart(document.getElementById(canvasId), {
      type: 'radar',
      data: {
        labels,
        datasets: [
          { label:'Self', data:selfData, fill:true,
            backgroundColor:'rgba(90,200,250,.15)', borderColor:'rgba(90,200,250,.9)', pointBackgroundColor:'rgba(90,200,250,1)' },
          { label:'Others (svorinė)', data:othersData, fill:true,
            backgroundColor:'rgba(126,224,129,.15)', borderColor:'rgba(126,224,129,.9)', pointBackgroundColor:'rgba(126,224,129,1)' }
        ]
      },
      options: {
        scales:{ r:{ suggestedMin:1, suggestedMax:5, ticks:{ stepSize:1, backdropColor:'transparent' },
          grid:{ color:'rgba(255,255,255,.1)' }, angleLines:{ color:'rgba(255,255,255,.1)' },
          pointLabels:{ font:{ size:11 } } } },
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
        <td>${esc(cl)}</td>
        <td>${s !== null ? s.toFixed(2) : '—'}</td>
        <td>${o !== null ? o.toFixed(2) : '—'}</td>
        <td>${diffStr}</td>
      </tr>`;
    }).join('');
    return `<table>
      <thead><tr><th>Klasteris</th><th>Self</th><th>Others (sv.)</th><th>Skirtumas</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function renderStrengthsGaps(agg, strengthsId, gapsId){
    const SUGGESTIONS = {
      'Demonstrating Integrity':       'Savaitiniai įsipareigojimų apžvalgos ritualai; viešas statuso ataskaitos šablonas.',
      'Encouraging Dialogue':          'Įveskite 2 min. tylos + klausimų raundą kiekviename susitikime.',
      'Creating Shared Vision':        'Vienas vizijos šablonas: tikslas → kliento vertė → sėkmės metrika.',
      'Developing Technological Savvy':'Kas 2 savaitės 30 min. tech peržiūra + 1 pritaikymas komandoje.',
      'Ensuring Customer Satisfaction':'Mėnesio ritmas: CSAT/NPS įžvalgos → konkretūs veiksmai.',
      'Maintaining Competitive Advantage':'Ketvirtis: 2 konkurentų analizės + 1 eksperimentas.',
      'Developing People':             '1:1 – konkreti kompetencijos praktika ir mikro‑elgesys kas 2 sav.',
      'Building Partnerships':         'Kas mėnesį – 1 nauja partnerystė su aiškiu abipusės vertės tikslu.',
      'Sharing Leadership':            'Deleguokite sprendimą su aiškiais rėmais ir sėkmės kriterijais.',
      'Achieving Personal Mastery':    'Kasdien 10 min. refleksija + savaitinis prioritetų peržiūrėjimas.',
      'Anticipating Opportunities':    'Du scenarijai (geriausias/blogiausias) su trigeriais trims tikslams.',
      'Leading Change':                'Kiekvienam pokyčiui: kas/ką/kada/kodėl + 2 greiti laimėjimai.',
      'Empowering People':             'Suteikite autonomiją vienoje srityje su aiškiais sprendimo rėmais.',
      'Thinking Globally':             'Sprendimus tikrinkite per 3 rinkų ar kultūrų perspektyvą.',
      'Appreciating Diversity':        'Skirtumų vertė – 2 min. momentas kiekviename susitikime.'
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
              <strong>${esc(g.name)}</strong>
              <span class="badge">${esc(g.cluster)}</span>
              <span class="score-chip neg">Others ${g.others !== null ? g.others.toFixed(2) : '—'} · Self ${g.self !== null ? g.self.toFixed(2) : '—'} · Tarpas ${g.diff.toFixed(2)}</span>
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
          ℹ️ Rateriai visose kompetencijose įvertino žemiau nei Self. Žemiau – santykinai stipriausios sritys.
        </li>` + agg.strengths.map(s => `
          <li>
            <div class="sg-title">
              <strong>${esc(s.name)}</strong>
              <span class="badge">${esc(s.cluster)}</span>
              <span class="score-chip neutral">Others ${s.others !== null ? s.others.toFixed(2) : '—'} · Self ${s.self !== null ? s.self.toFixed(2) : '—'} · ${s.diff.toFixed(2)}</span>
            </div>
            <div class="suggest">🚀 ${esc(CAPITALIZE)}</div>
          </li>`).join('');
      } else {
        el.innerHTML = agg.strengths.map(s => `
          <li>
            <div class="sg-title">
              <strong>${esc(s.name)}</strong>
              <span class="badge">${esc(s.cluster)}</span>
              <span class="score-chip pos">Others ${s.others !== null ? s.others.toFixed(2) : '—'} · Self ${s.self !== null ? s.self.toFixed(2) : '—'} · +${s.diff.toFixed(2)}</span>
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
    // Group by role for anonymity – show role but not rater number
    el.innerHTML = agg.comments.map(c => `
      <li>
        <span class="badge">${esc(c.role.toUpperCase())}</span>
        <span class="badge secondary">${c.type === 'strengths' ? '💪 Stiprybės' : '🎯 Tobulinti'}</span>
        ${esc(c.text)}
      </li>`).join('');
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  function esc(s){
    return String(s||'').replace(/[&<>"']/g, m =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
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
    renderComments
  };
})();
