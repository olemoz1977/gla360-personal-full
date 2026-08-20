import app from './entry.js';

const IDENTITY_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS assessments (
    assessment_id TEXT PRIMARY KEY,
    leader_name TEXT NOT NULL,
    project_name TEXT,
    guardian_name TEXT,
    guardian_email_cipher TEXT,
    guardian_email_iv TEXT,
    manage_token_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cycles (
    assessment_id TEXT NOT NULL,
    cycle INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'collecting',
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (assessment_id, cycle),
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS invitations (
    invite_id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    cycle INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('self','boss','peer','report','other')),
    language TEXT NOT NULL CHECK (language IN ('lt','en')),
    email_cipher TEXT,
    email_iv TEXT,
    token_hash TEXT NOT NULL UNIQUE,
    token_cipher TEXT NOT NULL,
    token_iv TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','opened','submitting','completed','revoked')),
    sent_at TEXT,
    opened_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (assessment_id, cycle) REFERENCES cycles(assessment_id, cycle) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_invites_assessment_cycle_role ON invitations(assessment_id, cycle, role, status)`,
  `CREATE INDEX IF NOT EXISTS idx_invites_token_hash ON invitations(token_hash)`
];

const RESPONSE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS responses (
    response_id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    cycle INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('self','boss','peer','report','other')),
    language TEXT NOT NULL CHECK (language IN ('lt','en')),
    schema_version TEXT NOT NULL DEFAULT 'leadership360-response@3',
    bank_version TEXT,
    answers_json TEXT NOT NULL,
    open_json TEXT,
    submitted_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_responses_assessment_cycle_role ON responses(assessment_id, cycle, role, submitted_at)`,
  `CREATE INDEX IF NOT EXISTS idx_responses_assessment_cycle ON responses(assessment_id, cycle, submitted_at)`
];

const ALLOWED_ORIGINS = new Set([
  'https://olemoz1977.github.io',
  'https://2rasi.lt',
  'https://www.2rasi.lt',
  'https://2rasi.com',
  'https://www.2rasi.com',
  'https://omesg360.eu',
  'https://www.omesg360.eu'
]);

const enc = new TextEncoder();
const dec = new TextDecoder();

function json(request, data, status = 200){
  const origin = request.headers.get('origin');
  const headers = {
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store'
  };
  if(origin && (ALLOWED_ORIGINS.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))){
    headers['access-control-allow-origin'] = origin;
    headers['vary'] = 'Origin';
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function validateSecret(env){
  const raw = String(env?.ROSTER_KEY_HEX || '').trim();
  if(!raw) throw new Error('ROSTER_KEY_HEX_missing');
  if(!/^[0-9a-f]{64}$/i.test(raw) && raw.length < 32){
    throw new Error('ROSTER_KEY_HEX_too_short');
  }
}

function bytesToHex(bytes){
  return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function sha256Hex(value){
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(String(value)))));
}

async function rosterHex(env){
  const raw=String(env?.ROSTER_KEY_HEX||'').trim();
  validateSecret(env);
  return /^[0-9a-f]{64}$/i.test(raw)?raw:sha256Hex(raw);
}

function base64UrlToBytes(value){
  const padded=String(value||'').replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((String(value||'').length+3)%4);
  const binary=atob(padded);
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}

function hexToBytes(hex){
  return Uint8Array.from(hex.match(/../g),h=>parseInt(h,16));
}

async function decryptText(env,cipher,iv){
  if(!cipher||!iv)return '';
  const key=await crypto.subtle.importKey('raw',hexToBytes(await rosterHex(env)),'AES-GCM',false,['decrypt']);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:base64UrlToBytes(iv)},key,base64UrlToBytes(cipher));
  return dec.decode(plain);
}

async function applyStatements(db, statements){
  for(const statement of statements){
    await db.prepare(statement).run();
  }
}

async function ensureSchema(env){
  await applyStatements(env.IDENTITY_DB, IDENTITY_STATEMENTS);
  await applyStatements(env.RESPONSE_DB, RESPONSE_STATEMENTS);
}

function surveyUrl(env,token){
  const u=new URL(String(env.PUBLIC_SURVEY_BASE||'https://olemoz1977.github.io/gla360-personal-full/survey-v2.html'));
  u.search='';
  u.searchParams.set('invite',token);
  return u.toString();
}

async function recoverInvites(request,env,assessmentId,cycle){
  const auth=request.headers.get('authorization')||'';
  const match=auth.match(/^Bearer\s+(.+)$/i);
  if(!match)return json(request,{ok:false,error:'unauthorized'},401);
  const manageHash=await sha256Hex(match[1]);
  const assessment=await env.IDENTITY_DB.prepare(
    `SELECT assessment_id, leader_name, project_name, guardian_name, created_at
       FROM assessments
      WHERE assessment_id = ? AND manage_token_hash = ? AND status = 'active'`
  ).bind(assessmentId,manageHash).first();
  if(!assessment)return json(request,{ok:false,error:'unauthorized'},401);

  const rows=await env.IDENTITY_DB.prepare(
    `SELECT role, language, email_cipher, email_iv, token_cipher, token_iv, status
       FROM invitations
      WHERE assessment_id = ? AND cycle = ? AND status != 'revoked'
      ORDER BY created_at ASC`
  ).bind(assessmentId,cycle).all();

  const invites=[];
  for(const row of rows.results){
    const token=await decryptText(env,row.token_cipher,row.token_iv);
    const email=await decryptText(env,row.email_cipher,row.email_iv);
    invites.push({role:row.role,language:row.language,email,status:row.status,url:surveyUrl(env,token)});
  }
  return json(request,{
    ok:true,
    assessmentId,
    cycle,
    leaderName:assessment.leader_name||'',
    projectName:assessment.project_name||'',
    guardianName:assessment.guardian_name||'',
    createdAt:assessment.created_at||'',
    invites
  });
}

async function stripNotObservedAnswers(request){
  let body;
  try{body=await request.clone().json()}catch(_){return request}
  if(!body?.answers || typeof body.answers!=='object' || Array.isArray(body.answers))return request;

  // survey-v2 serializes the explicit "not observed" option as JSON null.
  // Omit those item keys before the core validator so they never enter numeric averages.
  const answers=Object.fromEntries(Object.entries(body.answers).filter(([,value])=>value!==null));
  const headers=new Headers(request.headers);
  headers.set('content-type','application/json');
  return new Request(request.url,{
    method:request.method,
    headers,
    body:JSON.stringify({...body,answers})
  });
}

export default {
  async fetch(request, env, ctx){
    const url = new URL(request.url);

    if(url.pathname === '/ping' && request.method === 'GET'){
      return json(request, {
        ok:true,
        service:'Leadership 360 Collector',
        deployed:true,
        bootstrap:8
      });
    }

    if(url.pathname === '/health' && request.method === 'GET'){
      try {
        validateSecret(env);
        await ensureSchema(env);
        return json(request, {
          ok:true,
          service:'Leadership 360 Collector',
          version:8,
          schemaReady:true,
          secretReady:true
        });
      } catch(error){
        return json(request, {
          ok:false,
          error:'health_check_failed',
          detail:error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }

    const recovery=url.pathname.match(/^\/api\/manage\/([^/]+)\/cycles\/(\d+)\/invites$/);
    if(recovery && request.method === 'GET'){
      try{
        return await recoverInvites(request,env,decodeURIComponent(recovery[1]),Number(recovery[2]));
      }catch(error){
        return json(request,{ok:false,error:'invite_recovery_failed',detail:error instanceof Error?error.message:String(error)},500);
      }
    }

    if(/^\/api\/invite\/[^/]+\/submit$/.test(url.pathname) && request.method === 'POST'){
      request=await stripNotObservedAnswers(request);
    }

    return app.fetch(request, env, ctx);
  }
};
