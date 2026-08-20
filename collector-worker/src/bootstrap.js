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

function json(data, status = 200){
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store'
    }
  });
}

function validateSecret(env){
  const raw = String(env?.ROSTER_KEY_HEX || '').trim();
  if(!raw) throw new Error('ROSTER_KEY_HEX_missing');
  if(!/^[0-9a-f]{64}$/i.test(raw) && raw.length < 32){
    throw new Error('ROSTER_KEY_HEX_too_short');
  }
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

export default {
  async fetch(request, env, ctx){
    const url = new URL(request.url);

    if(url.pathname === '/health' && request.method === 'GET'){
      try {
        validateSecret(env);
        await ensureSchema(env);
        return json({
          ok:true,
          service:'Leadership 360 Collector',
          version:3,
          schemaReady:true,
          secretReady:true
        });
      } catch(error){
        return json({
          ok:false,
          error:'health_check_failed',
          detail:error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }

    return app.fetch(request, env, ctx);
  }
};
