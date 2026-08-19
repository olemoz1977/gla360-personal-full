import fs from 'node:fs';

const lt = JSON.parse(fs.readFileSync(new URL('../bank/questions.json', import.meta.url), 'utf8'));
const en = JSON.parse(fs.readFileSync(new URL('../bank/questions.en.json', import.meta.url), 'utf8'));

function fail(message){
  console.error('FAIL:', message);
  process.exitCode = 1;
}

function flatten(bank){
  const rows=[];
  for(const comp of bank.competencies || []){
    for(const item of comp.items || []){
      rows.push({cluster:comp.cluster,name:comp.name,key:item.key,stem:item.stem});
    }
  }
  return rows;
}

if((lt.competencies||[]).length !== 15) fail(`LT competencies = ${lt.competencies?.length}, expected 15`);
if((en.competencies||[]).length !== 15) fail(`EN competencies = ${en.competencies?.length}, expected 15`);

for(const [lang, bank] of [['LT',lt],['EN',en]]){
  for(const comp of bank.competencies || []){
    if((comp.items||[]).length !== 5) fail(`${lang} ${comp.name}: ${comp.items?.length} items, expected 5`);
  }
}

const ltf=flatten(lt), enf=flatten(en);
if(ltf.length !== 75) fail(`LT items = ${ltf.length}, expected 75`);
if(enf.length !== 75) fail(`EN items = ${enf.length}, expected 75`);

const ltKeys=ltf.map(x=>x.key), enKeys=enf.map(x=>x.key);
if(new Set(ltKeys).size !== ltKeys.length) fail('LT contains duplicate item keys');
if(new Set(enKeys).size !== enKeys.length) fail('EN contains duplicate item keys');

for(let i=0;i<Math.max(ltf.length,enf.length);i++){
  const a=ltf[i], b=enf[i];
  if(!a || !b) continue;
  if(a.key !== b.key) fail(`Key mismatch at ${i+1}: ${a.key} vs ${b.key}`);
  if(a.cluster !== b.cluster) fail(`Cluster mismatch for ${a.key}: ${a.cluster} vs ${b.cluster}`);
  if(a.name !== b.name) fail(`Competency mismatch for ${a.key}: ${a.name} vs ${b.name}`);
  if(!String(a.stem||'').trim()) fail(`LT empty stem: ${a.key}`);
  if(!String(b.stem||'').trim()) fail(`EN empty stem: ${b.key}`);
}

if(!process.exitCode){
  console.log(`PASS: LT/EN bank parity (${ltf.length} items, ${lt.competencies.length} competencies)`);
}
