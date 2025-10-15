app.js</script>
<script>
let lastAgg=null;

document.getElementById('analyze').addEventListener('click', async()=>{
  const files = Array.from(document.getElementById('files').files||[]);
  if(!files.length) return alert('Pasirinkite bent vieną JSON failą.');

  const packs = [];
  for(const f of files){
    try {
      const obj = JSON.parse(await f.text());
      packs.push(GLA.unpackResponse(obj));
    } catch(e){ console.warn('Negalima nuskaityti', f.name, e); }
  }
  if(!packs.length) return alert('Nepavyko nuskaityti failų.');

  const aidSet = new Set(packs.map(p=>p.aid));
  document.getElementById('aidBox').textContent =
    aidSet.size===1 ? `Assessment ID: ${[...aidSet][0]}` :
    `Dėmesio: rasti keli AID: ${[...aidSet].join(', ')}`;

  const bank = await GLA.loadBank();
  const w = {
    boss: +document.getElementById('wBoss').value || 0.3,
    peer: +document.getElementById('wPeers').value || 0.3,
    report: +document.getElementById('wReports').value || 0.3,
    other: +document.getElementById('wOthers').value || 0.1
  };
  lastAgg = GLA.aggregate(bank, packs, w);

  document.getElementById('summary').innerHTML = GLA.renderSummary(lastAgg);
  GLA.renderRadar('radar', lastAgg);
  document.getElementById('clusters').innerHTML = GLA.renderClusters(lastAgg);
  GLA.renderStrengthsGaps(lastAgg, 'strengths', 'gaps');
  GLA.renderComments(lastAgg, 'comments');

  document.getElementById('saveJson').onclick = ()=> GLA.download(`gla360_agg_${Date.now()}.json`, JSON.stringify(lastAgg, null, 2));
});
</script>
</body>
</html>
 
