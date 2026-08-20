import core from './index.js';

const enc = new TextEncoder();

const IDENTITY_SCHEMA = `
CREATE TABLE IF NOT EXISTS assessments (
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
);
CREATE TABLE IF NOT EXISTS cycles (
  assessment_id TEXT NOT NULL,
  cycle INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'collecting',
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (assessment_id, cycle),
  FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS invitations (
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
);
CREATE INDEX IF NOT EXISTS idx_invites_assessment_cycle_role ON invitations(assessment_id, cycle, role, status);
CREATE INDEX IF NOT EXISTS idx_invites_token_hash ON invitations(token_hash);
`;

const RESPONSE_SCHEMA = `
CREATE TABLE IF NOT EXISTS responses (
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
);
CREATE INDEX IF NOT EXISTS idx_responses_assessment_cycle_role ON responses(assessment_id, cycle, role, submitted_at);
CREATE INDEX IF NOT EXISTS idx_responses_assessment_cycle ON responses(assessment_id, cycle, submitted_at);
`;

function clean(value, max = 320){
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function bytesToHex(bytes){
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value){
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(value)))));
}

async function normalizeRosterSecret(env){
  const raw = String(env?.ROSTER_KEY_HEX || '').trim();
  if(!raw) throw new Error('ROSTER_KEY_HEX_missing');
  if(/^[0-9a-f]{64}$/i.test(raw)) return env;
  if(raw.length < 32) throw new Error('ROSTER_KEY_HEX_too_short');
  return { ...env, ROSTER_KEY_HEX: await sha256Hex(raw) };
}

function json(request, data, status = 200){
  const origin = request.headers.get('origin');
  const headers = {'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
  if(origin){
    headers['access-control-allow-origin'] = origin;
    headers['vary'] = 'Origin';
  }
  return new Response(JSON.stringify(data), {status, headers});
}

async function runSchema(db, sql){
  const statements = sql.split(';').map(statement => statement.trim()).filter(Boolean);
  for(const statement of statements){
    await db.prepare(statement).run();
  }
}

async function ensureSchema(env){
  await runSchema(env.IDENTITY_DB, IDENTITY_SCHEMA);
  await runSchema(env.RESPONSE_DB, RESPONSE_SCHEMA);
}

async function validateAssessmentRequest(request){
  let body;
  try { body = await request.clone().json(); }
  catch { return { error:'invalid_json' }; }
  const roster = Array.isArray(body?.roster) ? body.roster : [];
  const selfCount = roster.filter(r => clean(r?.role, 20).toLowerCase() === 'self').length;
  if(selfCount !== 1) return { error:'exactly_one_self_required' };
  const emails = roster.map(r => clean(r?.email).toLowerCase()).filter(Boolean);
  if(new Set(emails).size !== emails.length) return { error:'duplicate_email_in_cycle' };
  return { ok:true };
}

async function inviteRow(env, token){
  const tokenHash = await sha256Hex(token);
  return env.IDENTITY_DB.prepare(
    `SELECT invite_id, assessment_id, status FROM invitations WHERE token_hash = ?`
  ).bind(tokenHash).first();
}

async function augmentInviteContext(request, env, token){
  const response = await core.fetch(request, env);
  if(!response.ok) return response;
  let data;
  try { data = await response.clone().json(); }
  catch { return response; }
  const row = await inviteRow(env, token);
  if(row?.assessment_id) data.assessmentId = row.assessment_id;
  const headers = new Headers(response.headers);
  headers.set('content-type','application/json; charset=utf-8');
  headers.set('cache-control','no-store');
  return new Response(JSON.stringify(data), {status:response.status, headers});
}

async function oneTimeSubmit(request, env, token){
  const row = await inviteRow(env, token);
  if(!row) return core.fetch(request, env);
  if(row.status === 'completed' || row.status === 'submitting'){
    return json(request, {ok:false,error:'already_submitted'}, 409);
  }
  if(row.status === 'revoked') return core.fetch(request, env);

  const stamp = new Date().toISOString();
  const claim = await env.IDENTITY_DB.prepare(
    `UPDATE invitations SET status = 'submitting', updated_at = ?
     WHERE invite_id = ? AND status IN ('pending','sent','opened')`
  ).bind(stamp, row.invite_id).run();

  if(Number(claim?.meta?.changes || 0) !== 1){
    return json(request, {ok:false,error:'already_submitted'}, 409);
  }

  let response;
  try {
    response = await core.fetch(request, env);
  } catch(error){
    await env.IDENTITY_DB.prepare(
      `UPDATE invitations SET status = 'opened', updated_at = ? WHERE invite_id = ? AND status = 'submitting'`
    ).bind(new Date().toISOString(), row.invite_id).run().catch(()=>{});
    throw error;
  }

  if(!response.ok){
    await env.IDENTITY_DB.prepare(
      `UPDATE invitations SET status = 'opened', updated_at = ? WHERE invite_id = ? AND status = 'submitting'`
    ).bind(new Date().toISOString(), row.invite_id).run().catch(()=>{});
  }
  return response;
}

export default {
  async fetch(request, env){
    try {
      env = await normalizeRosterSecret(env);
    } catch(error){
      return json(request, {ok:false,error:error instanceof Error ? error.message : String(error)}, 500);
    }

    const url = new URL(request.url);

    if(url.pathname === '/health' && request.method === 'GET'){
      try {
        await ensureSchema(env);
        return json(request, {ok:true,service:'Leadership 360 Collector',version:2,schemaReady:true});
      } catch(error){
        return json(request, {ok:false,error:'schema_init_failed',detail:error instanceof Error ? error.message : String(error)}, 500);
      }
    }

    if(url.pathname === '/api/assessments' && request.method === 'POST'){
      const valid = await validateAssessmentRequest(request);
      if(!valid.ok) return json(request, {ok:false,error:valid.error}, 400);
      return core.fetch(request, env);
    }

    let m = url.pathname.match(/^\/api\/invite\/([^/]+)$/);
    if(m && request.method === 'GET'){
      return augmentInviteContext(request, env, decodeURIComponent(m[1]));
    }

    m = url.pathname.match(/^\/api\/invite\/([^/]+)\/submit$/);
    if(m && request.method === 'POST'){
      return oneTimeSubmit(request, env, decodeURIComponent(m[1]));
    }

    return core.fetch(request, env);
  }
};
