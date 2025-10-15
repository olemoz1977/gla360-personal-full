// survey.render.js – savarankiškas normalizatorius ir rendereris
(function(){
  // 1) Robustus query parsing (apsauga nuo suklijuotų nuorodų)
  function parseQuery(){
    let raw = location.search || '';
    // jei nuoroda suklijuota, iškirpti antrą "http" dalį
    if (raw.includes('http')) raw = raw.split('http')[0];
    if (raw && !raw.startsWith('?')) raw = '?' + raw;
    const qs = new URLSearchParams(raw);
    const aid = (qs.get('aid') || '').trim();
    const role = (qs.get('role') || 'self').toLowerCase();
    const i = Number(qs.get('i')) || 1;
    return { aid, role, i };
  }

  // 2) Tvirtas questions.json įkėlimas
  async function loadQuestions(url = 'bank/questions.json'){
    const bust = `v=${Date.now()}`;
    const sep = url.includes('?') ? '&' : '?';
    try {
      const res = await fetch(`${url}${sep}${bust}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      console.error('❌ Nepavyko įkelti bank/questions.json:', e);
      return null;
    }
  }

  // 3) Normalizacija: palaiko ir data.questions, ir data.Competencies[].items[]
  function normalizeQuestions(data){
    if (!data) return [];
    if (Array.isArray(data.questions) && data.questions.length){
      // Tikimasi: {id, text*, cluster?, competency?, reverse?}
      return data.questions.map((q, idx) => ({
        id: q.id || `Q${idx+1}`,
        text: q.text_lt || q.text || q.stem || `Klausimas ${idx+1}`,
        cluster: q.cluster || null,
        competency: q.competency || null,
        reverse: !!q.reverse
      }));
    }
    if (Array.isArray(data.Competencies) && data.Competencies.length){
      const out = [];
      data.Competencies.forEach((comp, cIdx) => {
        const compName = comp.name || `Kompetencija ${cIdx+1}`;
        const cluster = comp.cluster || null;
        (comp.items || []).forEach((item, iIdx) => {
          out.push({
            id: item.key || `C${cIdx+1}_${iIdx+1}`,
            text: item.stem || item.text_lt || item.text || `Klausimas ${cIdx+1}.${iIdx+1}`,
            cluster,
            competency: compName,
            reverse: !!item.reverse
          });
        });
      });
      return out;
    }
    return [];
  }

  // 4) Paprastas rendereris: sukuria klausimų sąrašą + name atributus
  function renderSurvey(questions, mount){
    const host = mount || document.getElementById('questions') || document.querySelector('[data-role="questions"]') || (() => {
      const el = document.createElement('div');
      el.id = 'questions';
      document.body.appendChild(el);
      return el;
    })();

    if (!questions.length){
      host.innerHTML = `<div class="alert error">Nerasta įkeltų klausimų. Patikrink <code>bank/questions.json</code> struktūrą.</div>`;
      return;
    }

    const scale = [1,2,3,4,5];
    const html = questions.map((q, idx) => {
      const name = q.id; // svarbu: name, kad nebūtų autofill įspėjimo
      const radios = scale.map(v => `
        <label class="likert">
          <input type="radio" name="${name}" value="${v}" required>
          <span>${v}</span>
        </label>
      `).join('');
      return `
        <div class="q card" data-qid="${q.id}">
          <div class="stem"><strong>${idx+1}.</strong> ${escapeHtml(q.text)}</div>
          <div class="scale">${radios}</div>
          ${q.competency || q.cluster ? `<div class="meta muted">${q.competency ? `Kompetencija: ${escapeHtml(q.competency)}` : ''}${q.competency && q.cluster ? ' · ' : ''}${q.cluster ? `Klasteris: ${escapeHtml(q.cluster)}` : ''}</div>` : ''}
        </div>
      `;
    }).join('');

    host.innerHTML = `
      <div class="progress muted">Klausimų: ${questions.length}</div>
      <div class="q-list">${html}</div>
    `;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // 5) Surinkimas (jei nori susieti su savo „Baigti“ mygtuku)
  function collectAnswers(){
    const result = {};
    document.querySelectorAll('.q[data-qid]').forEach(q => {
      const qid = q.getAttribute('data-qid');
      const checked = q.querySelector(`input[name="${CSS.escape(qid)}"]:checked`);
      result[qid] = checked ? Number(checked.value) : null;
    });
    return result;
  }
  // Padaryti globalu, jei reikės panaudoti iš app.js
  window.GLA = window.GLA || {};
  window.GLA.collectAnswers = collectAnswers;

  // 6) Paleidimas
  (async function init(){
    const params = parseQuery();
    console.log('[survey] params:', params);

    // Parodyti AID/role (jei turi elementus)
    const aidEl = document.getElementById('aid');
    if (aidEl) aidEl.textContent = params.aid || '—';
    const roleEl = document.getElementById('role');
    if (roleEl) roleEl.textContent = params.role.toUpperCase();

    const data = await loadQuestions('bank/questions.json');
    const questions = normalizeQuestions(data);
    console.log(`[survey] įkeltų klausimų: ${questions.length}`);
    const errorsBox = document.getElementById('surveyErrors');
    if (errorsBox) errorsBox.textContent = '';

    renderSurvey(questions);

    if (!questions.length && errorsBox){
      errorsBox.innerHTML = 'Nerasta klausimų. Patikrink <code>bank/questions.json</code> (struktūrą ir ar failas pasiekiamas).';
      errorsBox.classList.add('error');
    }
  })();
})();
