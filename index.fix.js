// index.fix.js
(function(){
  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function(){
    const btn = document.getElementById('create');
    const linksBox = document.getElementById('links');

    if(!btn || !linksBox){
      console.error('Nerasta #create arba #links elementų.');
      return;
    }

    // Rekomenduoju naudoti hybrid puslapį, kad raterių apklausos veiktų ir be GLA
    const SURVEY_PAGE = 'survey.hybrid.html'; // jei neturi, pakeisk į 'survey.html'

    function fallbackId(leader, project){
      const rand = Math.random().toString(36).slice(2,10);
      const ts = new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
      const init = leader.trim().split(/\s+/).map(s=>s[0]).join('').toUpperCase() || 'A';
      return `${init}-${ts}-${rand}`;
    }

    const getId = (leader, project) => {
      try {
        if (window.GLA && typeof GLA.newAssessmentId === 'function') {
          return GLA.newAssessmentId(leader, project);
        }
      } catch(e) {
        console.warn('GLA.newAssessmentId nepavyko, naudojam fallback:', e);
      }
      return fallbackId(leader, project);
    };

    function baseDir(){
      const u = new URL(location.href);
      if (!u.pathname.endsWith('/')) {
        u.pathname = u.pathname.split('/').slice(0,-1).join('/') + '/';
      }
      u.search = ''; u.hash = '';
      return u;
    }

    function mk(role, i, aid){
      const u = new URL(SURVEY_PAGE, baseDir());
      u.searchParams.set('aid', aid);
      u.searchParams.set('role', role);
      if (i) u.searchParams.set('i', i);
      return u.toString();
    }

    btn.addEventListener('click', function(){
      const leader  = (document.getElementById('leaderName')?.value || 'Lyderis').trim();
      const project = (document.getElementById('projectName')?.value || 'Asmeninis 360 vertinimas').trim();
      const aid = getId(leader, project);

      const n = {
        boss:   Number(document.getElementById('nBoss')?.value)    || 0,
        peer:   Number(document.getElementById('nPeers')?.value)   || 0,
        report: Number(document.getElementById('nReports')?.value) || 0,
        other:  Number(document.getElementById('nOthers')?.value)  || 0
      };

      let html = `<p><strong>Assessment ID:</strong> <code>${aid}</code></p>`;

      // SELF – viena aiški nuoroda
      const selfUrl = mk('self', 1, aid);
      html += `<p>📎 Savivertinimo nuoroda (SELF): ${selfUrl}${selfUrl}</a></p>`;

      // Kitos grupės
      ['boss','peer','report','other'].forEach(role=>{
        if (n[role] > 0){
          html += `<details open><summary>${role} (${n[role]})</summary><ol>`;
          for (let i=1; i<=n[role]; i++){
            const url = mk(role, i, aid);
            html += `<li>${url}${url}</a></li>`;
          }
          html += `</ol></details>`;
        }
      });

      html += `<p class="muted">Išsiųskite šias nuorodas savo rateriams el. paštu / žinute. Užpildę jie atsisiųs *.json ir atsiųs jums.</p>`;
      linksBox.innerHTML = html;

      console.log('[index] Sukurtas vertinimas:', { aid, n, selfUrl });
    });
  });
})();
