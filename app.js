 
// GLA360 Personal – pilna versija (client-only)
// v1.0.0 (2025-10-15)

const GLA = (()=>{
  const roles = ['self','boss','peer','report','other'];
  const clusters = [
    { key:'COMM',  name:'Communication',        items:[0,1,2] },
    { key:'ASSUR', name:'Assure Success',       items:[3,4,5] },
    { key:'ENGAG', name:'Engaging People',      items:[6,7,8] },
    { key:'CHANG', name:'Continuous Change',    items:[9,10,11] },
    { key:'INCL',  name:'Boundary-less Inclusion', items:[12,13,14] },
  ];

  // --- Helpers
  const uid = () => crypto.getRandomValues(new Uint32Array(4)).join('-');

  function newAssessmentId(leader, project){
    const base = `${leader}-${project}-${new Date().toISOString().slice(0,10)}`
      .toLowerCase().replace(/[^a-z0-9]+/g,'-');
    return base + '-' + uid();
  }

  async function loadBank(){
    const res = await fetch('bank/questions.json', {cache:'no-store'});
    if(!res.ok) throw new Error('Nepavyko įkelti klausimyno');
    return await res.json();
  }

  // --- Survey render/collect
  function renderSurvey(bank){
    const frag = document.createDocumentFragment();

    const who = document.createElement('fieldset');
    who.innerHTML = `
      <legend>Apie jus</legend>
      <label>Jūsų vardas (nebūtina)<input id="raterName" placeholder="Vardas / slapyvardis (nebūtina)"></label>
      <label>Kaip dažnai dirbate su vertinamu lyderiu?
        <select id="freq">
          <option>Kasdien</option>
          <option>Kelis kartus per savaitę</option>
          <option>Retai</option>
        </select>
      </label>`;
    frag.appendChild(who);

    bank.competencies.forEach((c,ci)=>{
      const fs = document.createElement('fieldset');
      fs.innerHTML = `<legend>${c.cluster} • ${c.name}</legend>`;
      c.items.forEach((it,ii)=>{
        const id = `q_${ci}_${ii}`;
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
          <div><strong>${it.stem}</strong></div>
          <div class="scale">
            <span class="badge">1</span>
            <input type="range" id="${id}" min="1" max="5" value="3" />
            <span class="badge">5</span>
          </div>`;
        fs.appendChild(div);
      });
      frag.appendChild(fs);
    });

    const open = document.createElement('fieldset');
    open.innerHTML = `
      <legend>Atviri klausimai</legend>
      <label>Stiprybės
        <textarea id="open_str" rows="3" placeholder="Kuo šis lyderis išsiskiria? Pavyzdžiai."></textarea>
      </label>
      <label>Kur tobulėti per 90 d.?
        <textarea id="open_dev" rows="3" placeholder="Konkretūs elgesiai ir situacijos."></textarea>
      </label>
      <label>Kita
        <textarea id="open_misc" rows="2" placeholder="Kas dar svarbu?"></textarea>
      </label>`;
    frag.appendChild(open);

    return frag;
  }

  function collect(bank){
    const answers = [];
    bank.competencies.forEach((c,ci)=>{
      c.items.forEach((it,ii)=>{
        const id = `q_${ci}_${ii}`;
        const v = Number(document.getElementById(id).value||3);
        answers.push({compIndex:ci, itemIndex:ii, key:it.key, v});
      });
    });
    const open = {
      strengths: (document.getElementById('open_str')?.value||'').trim(),
      develop:   (document.getElementById('open_dev')?.value||'').trim(),
      misc:      (document.getElementById('open_misc')?.value||'').trim(),
    };
    const meta = {
      raterName: (document.getElementById('raterName')?.value||'').trim(),
      freq: (document.getElementById('freq')?.value||'').trim()
    };
    return {answers, open, meta, ts: new Date().toISOString()};
  }

  function packResponse({aid, role, idx, payload}){
    return { schema:"gla360-personal-full@1", aid, role, idx, payload };
  }
  function unpackResponse(obj){
    if(obj.schema!=="gla360-personal-full@1") throw new Error('Nekorektiškas schemos tipas');
    return obj;
  }

  function download(filename, text){
    const blob = new Blob([text], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  }

  const avg = arr => arr.length? arr.reduce((a,b)=>a+b,0)/arr.length : 0;

  // normalize weights to sum 1
  function normWeights(w){
    const keys = ['boss','peer','report','other'];
    let s = keys.reduce((t,k)=>t+(Number(w[k])||0),0);
    if(s<=0) s = 1;
    const out = {};
    keys.forEach(k => out[k] = (Number(w[k])||0)/s);
    return out;
  }

  function aggregate(bank, packs, weights){
    const compCount = bank.competencies.length; // 15
    const w = normWeights(weights || {boss:.3, peer:.3, report:.3, other:.1});

    // kolekcija: [role][compIndex] -> array of means
    const byRole = {};
    roles.forEach(r=> byRole[r] = Array.from({length:compCount}, ()=>[]));

    const comments = [];
    for(const p of packs){
      const r = roles.includes(p.role)? p.role : 'other';
      // suskaičiuojame vidurkį kiekvienai kompetencijai šiame viename atsakyme
      const compSums = Array(compCount).fill(0);
      const compNs   = Array(compCount).fill(0);
      for(const a of p.payload.answers){
        compSums[a.compIndex] += a.v;
        compNs[a.compIndex]   += 1;
      }
      const compMeans = compSums.map((s,i)=> compNs[i]? s/compNs[i] : 0);
      compMeans.forEach((m,i)=> byRole[r][i].push(m));

      // komentarai
      ['strengths','develop','misc'].forEach(k=>{
        const txt = (p.payload.open?.[k]||'').trim();
        if(txt) comments.push({role:r, idx:p.idx, type:k, text:txt});
      });
    }

    // vidurkiai per role
    const means = {};
    roles.forEach(r=>{
      means[r] = byRole[r].map(arr => avg(arr));
    });

    // Others (svorinė kombinacija be self)
    const others = Array.from({length:compCount}, (_,i)=>{
      return (means.boss[i]||0)*w.boss +
             (means.peer[i]||0)*w.peer +
             (means.report[i]||0)*w.report +
             (means.other[i]||0)*w.other;
    });

    // klasterių vidurkiai Self vs Others
    const clusterIdx = clusters.map(c=> c.items);
    const clusterMeans = {
      self:   clusterIdx.map(idxArr => avg(idxArr.map(i=> means.self[i]))),
      others: clusterIdx.map(idxArr => avg(idxArr.map(i=> others[i])))
    };

    // difai Others - Self per kompetenciją
    const diffs = Array.from({length:compCount}, (_,i)=>({
      i,
      name: bank.competencies[i].name,
      cluster: bank.competencies[i].cluster,
      self: means.self[i]||0,
      others: others[i]||0,
      diff: (others[i]||0)-(means.self[i]||0)
    })).sort((a,b)=> a.diff - b.diff);

    const gaps = diffs.slice(0,3);
    const strengths = diffs.slice(-3).reverse();

    return {
      bankInfo: {version: bank.version, compCount, itemsPerComp: bank.competencies.map(c=>c.items.length)},
      weights: w,
      means, others, clusterMeans,
      diffs, gaps, strengths,
      comments,
      packsCount: packs.length
    };
  }

  function renderSummary(agg){
    const items = agg.bankInfo.itemsPerComp.reduce((a,b)=>a+b,0);
    return `
      <p><strong>Raterių failų:</strong> ${agg.packsCount}</p>
      <p><strong>Kompetencijų:</strong> ${agg.bankInfo.compCount} • <strong>Teiginių:</strong> ${items}</p>
      <p><strong>Svorinė Others sudėtis:</strong>
        Boss ${(agg.weights.boss*100).toFixed(0)}% •
        Peers ${(agg.weights.peer*100).toFixed(0)}% •
        Reports ${(agg.weights.report*100).toFixed(0)}% •
        Others ${(agg.weights.other*100).toFixed(0)}%
      </p>
      <p><strong>Didžiausios spragos (Others – Self):</strong> ${agg.gaps.map(g=>`${g.name} (${g.diff.toFixed(2)})`).join(', ')}</p>
    `;
  }

  function renderRadar(canvasId, agg){
    if(!window.Chart) return;
    const labels = agg.diffs.map(d=> d.name);
    const self = agg.diffs.map(d=> d.self);
    const others = agg.diffs.map(d=> d.others);
    const ctx = document.getElementById(canvasId);
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {label:'Self', data:self, fill:true, backgroundColor:'rgba(0,119,255,.15)', borderColor:'rgba(0,119,255,.9)'},
          {label:'Others (svorinė)', data:others, fill:true, backgroundColor:'rgba(10,165,107,.15)', borderColor:'rgba(10,165,107,.9)'}
        ]
      },
      options: { scales:{ r:{ suggestedMin:1, suggestedMax:5, ticks:{stepSize:1} } }, plugins:{legend:{position:'bottom'}} }
    });
  }

  function renderClusters(agg){
    const rows = clusters.map((c,i)=> `
      <tr><td>${c.name}</td><td>${agg.clusterMeans.self[i].toFixed(2)}</td><td>${agg.clusterMeans.others[i].toFixed(2)}</td></tr>
    `).join('');
    return `<table><thead><tr><th>Klasteris</th><th>Self</th><th>Others (sv.)</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderStrengthsGaps(agg, idS, idG){
    document.getElementById(idG).innerHTML = agg.gaps.map(g=> `<li><strong>${g.name}</strong> • tarpas <em>${g.diff.toFixed(2)}</em> • pasiūlymas: ${suggestion(g)}</li>`).join('');
    document.getElementById(idS).innerHTML = agg.strengths.map(s=> `<li><strong>${s.name}</strong> • pranašumas <em>${s.diff.toFixed(2)}</em> • kaip kapitalizuoti: ${capitalize(s)}</li>`).join('');
  }

  function renderComments(agg, id){
    document.getElementById(id).innerHTML = agg.comments.map(c=> `<li><span class="badge">${c.role}</span> ${escapeHtml(c.text)}</li>`).join('');
  }

  // Pasiūlymai pagal kompetenciją
  function suggestion(g){
    const map = {
      "Communication: Demonstrating Integrity":"Suderinkite pažadus su kalendoriumi; savaitės pabaigoje – įsipareigojimų inventorius.",
      "Communication: Encouraging Dialogue":"Įveskite 2 tylaus mąstymo minutes ir 1 „klausimų raundą“ kiekviename susitikime.",
      "Communication: Creating Shared Vision":"Vienas vizijos šablonas: tikslas, vertė klientui, sėkmės metrika.",
      "Assure Success: Developing Technological Savvy":"Kas 2 sav. 30 min. tech peržiūra + 1 pritaikymas komandoje.",
      "Assure Success: Ensuring Customer Satisfaction":"Mėnesio ritmu aptarkite CSAT/NPS įžvalgas su komanda.",
      "Assure Success: Maintaining Competitive Advantage":"Ketvirtį: 2 konkurentų „greitos analizės“ + 1 eksperimentas.",
      "Engaging People: Developing People":"1:1 – konkreti kompetencijos praktika ir mikro‑elgesys kas 2 sav.",
      "Engaging People: Building Partnerships":"Kas mėn. – 1 nauja ar sustiprinta partnerystė su aiškiu tikslu.",
      "Engaging People: Sharing Leadership":"Deleguokite sprendimą su aiškiais rėmais ir sėkmės kriterijais.",
      "Continuous Change: Achieving Personal Mastery":"Kasdien 10 min. refleksija + savaitinis prioritetų peržiūrėjimas.",
      "Continuous Change: Anticipating Opportunities":"Du scenarijai (best/worst) su trigeriais trims svarbiausiems tikslams.",
      "Continuous Change: Leading Change":"Kiekvienam pokyčiui – „kas/ką/kada/kodėl“ + 2 greiti laimėjimai.",
      "Boundary-less Inclusion: Empowering People":"Suteikite autonomiją vienoje srityje + aiškūs sprendimo rėmai.",
      "Boundary-less Inclusion: Thinking Globally":"Sprendimus tikrinkite per 3 rinkų/kultūrų perspektyvą.",
      "Boundary-less Inclusion: Appreciating Diversity":"„Skirtumų vertė“ momentas kiekviename susitikime (2 min.)."
    };
    const key = `${g.cluster}: ${g.name}`;
    return map[key] || "Apibrėžkite konkretų, matuojamą elgesį ir ritmą (30–60–90 d.).";
  }
  function capitalize(s){
    return "Dokumentuokite gerąją praktiką ir padauginkite ją per shadowing / mini‑mokymą.";
  }
  function escapeHtml(t){ return t.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  return {
    newAssessmentId, loadBank, renderSurvey, collect, packResponse, unpackResponse,
    download, aggregate, renderSummary, renderRadar, renderClusters, renderStrengthsGaps, renderComments
  };
})();
 

 

6)  bank/questions.json   (15 kompetencijų, 72 teiginiai)

Struktūra: pirmoms 12 kompetencijų – po 5 teiginius, paskutinėms 3 – po 4. 12×5 + 3×4 = 72.

 
{
  "version": "1.0.0",
  "competencies": [
    {
      "cluster": "Communication",
      "name": "Demonstrating Integrity",
      "items": [
        {"key":"COMM_INT_1","stem":"Laikosi duotų įsipareigojimų ir terminų."},
        {"key":"COMM_INT_2","stem":"Sprendimai atitinka deklaruojamas vertybes."},
        {"key":"COMM_INT_3","stem":"Atvirai prisiima klaidas ir jas taiso."},
        {"key":"COMM_INT_4","stem":"Pateikia kontekstą, kai tenka keisti kryptį."},
        {"key":"COMM_INT_5","stem":"Viešai ir reguliariai praneša apie pažangos statusą ir rizikas."}
      ]
    },
    {
      "cluster": "Communication",
      "name": "Encouraging Dialogue",
      "items": [
        {"key":"COMM_DIA_1","stem":"Sukuria saugią erdvę skirtingoms nuomonėms."},
        {"key":"COMM_DIA_2","stem":"Aktyviai klausia ir įtraukia tyliau kalbančius."},
        {"key":"COMM_DIA_3","stem":"Skatina ginčą dėl idėjų, ne dėl žmonių."},
        {"key":"COMM_DIA_4","stem":"Apibendrina ir tikslina susitarimus raštu."},
        {"key":"COMM_DIA_5","stem":"Sąmoningai balansuoja eterio laiką tarp dalyvių."}
      ]
    },
    {
      "cluster": "Communication",
      "name": "Creating Shared Vision",
      "items": [
        {"key":"COMM_VSN_1","stem":"Aiškiai sieja tikslus su kliento verte."},
        {"key":"COMM_VSN_2","stem":"Formuluoja sėkmės metrikas ir ribas."},
        {"key":"COMM_VSN_3","stem":"Nuosekliai komunikuoja kryptį komandai."},
        {"key":"COMM_VSN_4","stem":"Užtikrina, kad visi supranta „kodėl“."},
        {"key":"COMM_VSN_5","stem":"Susieja viziją su kasdieniais pasirinkimais ir prioritetais."}
      ]
    },

    {
      "cluster": "Assure Success",
      "name": "Developing Technological Savvy",
      "items": [
        {"key":"ASS_TECH_1","stem":"Domisi naujomis technologijomis savo srityje."},
        {"key":"ASS_TECH_2","stem":"Greitai pritaiko įrankius produktyvumui didinti."},
        {"key":"ASS_TECH_3","stem":"Dalijasi praktinėmis gairėmis komandai."},
        {"key":"ASS_TECH_4","stem":"Vertina technologinių sprendimų rizikas/naudą."},
        {"key":"ASS_TECH_5","stem":"Skatina pilotus (POC) ir mokosi iš jų rezultatų."}
      ]
    },
    {
      "cluster": "Assure Success",
      "name": "Ensuring Customer Satisfaction",
      "items": [
        {"key":"ASS_CUST_1","stem":"Reguliariai telkia klientų įžvalgas sprendimams."},
        {"key":"ASS_CUST_2","stem":"Greitai reaguoja į klientų skausmo taškus."},
        {"key":"ASS_CUST_3","stem":"Matuoja pasitenkinimą (pvz., NPS/CSAT)."},
        {"key":"ASS_CUST_4","stem":"Verčia įžvalgas konkrečiais veiksmais."},
        {"key":"ASS_CUST_5","stem":"Užtikrina sisteminį atsiliepimų fiksavimą ir atsakymus klientams."}
      ]
    },
    {
      "cluster": "Assure Success",
      "name": "Maintaining Competitive Advantage",
      "items": [
        {"key":"ASS_COMP_1","stem":"Stebi konkurentų veiksmus struktūruotai."},
        {"key":"ASS_COMP_2","stem":"Generuoja atsako hipotezes ir eksperimentus."},
        {"key":"ASS_COMP_3","stem":"Koncentruojasi į mūsų unikalų pasiūlymą."},
        {"key":"ASS_COMP_4","stem":"Prioritizuoja iniciatyvas pagal ROI."},
        {"key":"ASS_COMP_5","stem":"Reguliariai peržiūri strategines prielaidas ir adaptuoja kryptį."}
      ]
    },

    {
      "cluster": "Engaging People",
      "name": "Developing People",
      "items": [
        {"key":"ENG_DEV_1","stem":"Kuria individualius augimo planus."},
        {"key":"ENG_DEV_2","stem":"Duoda reguliarią, konkrečią grįžtamąją informaciją."},
        {"key":"ENG_DEV_3","stem":"Suteikia praktines galimybes mokytis."},
        {"key":"ENG_DEV_4","stem":"Švenčia progresą ir pasiekimus."},
        {"key":"ENG_DEV_5","stem":"Skatina ir palaiko praktikos bendruomenes."}
      ]
    },
    {
      "cluster": "Engaging People",
      "name": "Building Partnerships",
      "items": [
        {"key":"ENG_PAR_1","stem":"Mezga ryšius per funkcijas/organizacijas."},
        {"key":"ENG_PAR_2","stem":"Aiškiai apibrėžia abipusę vertę."},
        {"key":"ENG_PAR_3","stem":"Greitai sprendžia konfliktus be eskalacijos."},
        {"key":"ENG_PAR_4","stem":"Dalijasi kreditais už rezultatus."},
        {"key":"ENG_PAR_5","stem":"Nustato reguliarų partnerystės valdymo ritmą (tikslai, rodikliai)."}
      ]
    },
    {
      "cluster": "Engaging People",
      "name": "Sharing Leadership",
      "items": [
        {"key":"ENG_SLD_1","stem":"Deleguoja sprendimus su aiškiais rėmais."},
        {"key":"ENG_SLD_2","stem":"Suteikia autonomiją ir pasitiki."},
        {"key":"ENG_SLD_3","stem":"Padeda komandos nariams „blizgėti“ viešai."},
        {"key":"ENG_SLD_4","stem":"Klauso, o ne mikrovaldo."},
        {"key":"ENG_SLD_5","stem":"Numato, kada pasitraukti iš sprendimų kelio ir netrukdyti."}
      ]
    },

    {
      "cluster": "Continuous Change",
      "name": "Achieving Personal Mastery",
      "items": [
        {"key":"CHG_MAS_1","stem":"Laikosi produktyvumo ritualų ir ribų."},
        {"key":"CHG_MAS_2","stem":"Reflektuoja ir mokosi iš klaidų."},
        {"key":"CHG_MAS_3","stem":"Tvarko prioritetus pagal vertę."},
        {"key":"CHG_MAS_4","stem":"Išlaiko ramybę spaudimo situacijose."},
        {"key":"CHG_MAS_5","stem":"Valdo energiją/poilsį piko periodams."}
      ]
    },
    {
      "cluster": "Continuous Change",
      "name": "Anticipating Opportunities",
      "items": [
        {"key":"CHG_ANT_1","stem":"Anksti pastebi tendencijas ir rizikas."},
        {"key":"CHG_ANT_2","stem":"Kuria scenarijus ir pasirengimą."},
        {"key":"CHG_ANT_3","stem":"Veikia proaktyviai prieš terminus."},
        {"key":"CHG_ANT_4","stem":"Mato „didįjį paveikslą“ už savo funkcijos ribų."},
        {"key":"CHG_ANT_5","stem":"Naudoja duomenis ankstyvų signalų aptikimui ir prioritetams."}
      ]
    },
    {
      "cluster": "Continuous Change",
      "name": "Leading Change",
      "items": [
        {"key":"CHG_LEAD_1","stem":"Sutelkia komandą aiškiam pokyčio tikslui."},
        {"key":"CHG_LEAD_2","stem":"Numato pasipriešinimą ir jį valdo."},
        {"key":"CHG_LEAD_3","stem":"Greitai demonstruoja „greitus laimėjimus“."},
        {"key":"CHG_LEAD_4","stem":"Įtvirtina pokyčius procesuose/standartuose."},
        {"key":"CHG_LEAD_5","stem":"Anksti įtraukia kritikus ir skeptikus."}
      ]
    },

    {
      "cluster": "Boundary-less Inclusion",
      "name": "Empowering People",
      "items": [
        {"key":"INC_EMP_1","stem":"Aiškiai apibrėžia sprendimo ribas komandai."},
        {"key":"INC_EMP_2","stem":"Skatina iniciatyvą be baimės klysti."},
        {"key":"INC_EMP_3","stem":"Užtikrina resursus ir kliūčių šalinimą."},
        {"key":"INC_EMP_4","stem":"Pripažįsta indėlį viešai."}
      ]
    },
    {
      "cluster": "Boundary-less Inclusion",
      "name": "Thinking Globally",
      "items": [
        {"key":"INC_GLB_1","stem":"Įvertina sprendimų pasekmes skirtingoms rinkoms."},
        {"key":"INC_GLB_2","stem":"Derina standartizaciją su lokalizacija."},
        {"key":"INC_GLB_3","stem":"Mąsto per kultūrinius kontekstus."},
        {"key":"INC_GLB_4","stem":"Priima įrodymų pagrįstus sprendimus."}
      ]
    },
    {
      "cluster": "Boundary-less Inclusion",
      "name": "Appreciating Diversity",
      "items": [
        {"key":"INC_DIV_1","stem":"Skatina skirtingas perspektyvas ir patirtis."},
        {"key":"INC_DIV_2","stem":"Užtikrina lygias galimybes dalyvauti."},
        {"key":"INC_DIV_3","stem":"Mato skirtumus kaip inovacijos šaltinį."},
        {"key":"INC_DIV_4","stem":"Reaguoja į šališkumą ir jį mažina."}
      ]
    }
  ]
}
