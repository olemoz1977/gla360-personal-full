const RESPONSE_SCHEMA = 'leadership360-response@3';
const BUNDLE_SCHEMA = 'leadership360-cycle-bundle@1';
const MAX_ROSTER = 50;
const MAX_ANSWERS = 120;
const ALLOWED_ROLES = new Set(['self', 'boss', 'peer', 'report', 'other']);
const ALLOWED_LANGS = new Set(['lt', 'en']);
const DEFAULT_ORIGINS = new Set([
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

function nowIso() {
  return new Date().toISOString();
}

function clean(value, max = 200) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function isEmail(value) {
  const s = clean(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function randomToken(bytes = 24) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return bytesToBase64Url(data);
}

function bytesToHex(bytes) {
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  if (!/^[0-9a-f]{64}$/i.test(hex || '')) throw new Error('ROSTER_KEY_HEX must be a 64-character hex secret');
  return Uint8Array.from(hex.match(/../g), h => parseInt(h, 16));
}

async function sha256Hex(value) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(value)))));
}

async function rosterKey(env) {
  return crypto.subtle.importKey('raw', hexToBytes(env.ROSTER_KEY_HEX), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptText(env, value) {
  if (!value) return { cipher: null, iv: null };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await rosterKey(env), enc.encode(String(value)));
  return {
    cipher: bytesToBase64Url(new Uint8Array(cipher)),
    iv: bytesToBase64Url(iv)
  };
}

async function decryptText(env, cipher, iv) {
  if (!cipher || !iv) return '';
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64UrlToBytes(iv) },
    await rosterKey(env),
    base64UrlToBytes(cipher)
  );
  return dec.decode(plain);
}

function originAllowed(request) {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  if (DEFAULT_ORIGINS.has(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function corsHeaders(request) {
  const origin = originAllowed(request);
  return origin ? {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-max-age': '86400',
    'vary': 'Origin'
  } : {};
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...corsHeaders(request)
    }
  });
}

async function readJson(request, maxBytes = 150000) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > maxBytes) throw new Error('payload_too_large');
  const text = await request.text();
  if (text.length > maxBytes) throw new Error('payload_too_large');
  return text ? JSON.parse(text) : {};
}

function surveyBase(env) {
  return clean(env.PUBLIC_SURVEY_BASE || 'https://olemoz1977.github.io/gla360-personal-full/survey.html', 500);
}

function inviteUrl(env, token) {
  const u = new URL(surveyBase(env));
  u.search = '';
  u.searchParams.set('invite', token);
  return u.toString();
}

function normalizeRoster(raw) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_ROSTER) {
    throw new Error('roster_must_have_1_to_50_rows');
  }
  let selfCount = 0;
  return raw.map((row, index) => {
    const email = clean(row?.email, 320).toLowerCase();
    const role = clean(row?.role, 20).toLowerCase();
    const language = clean(row?.language || row?.lang || 'lt', 5).toLowerCase();
    if (!isEmail(email)) throw new Error(`invalid_email_at_row_${index + 1}`);
    if (!ALLOWED_ROLES.has(role)) throw new Error(`invalid_role_at_row_${index + 1}`);
    if (!ALLOWED_LANGS.has(language)) throw new Error(`invalid_language_at_row_${index + 1}`);
    if (role === 'self') selfCount += 1;
    return { email, role, language };
  }).map(row => row);
}

async function requireManage(request, env, assessmentId) {
  const auth = request.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const hash = await sha256Hex(match[1]);
  return env.IDENTITY_DB.prepare(
    'SELECT assessment_id, leader_name, project_name, guardian_name, guardian_email_cipher, guardian_email_iv, status FROM assessments WHERE assessment_id = ? AND manage_token_hash = ?'
  ).bind(assessmentId, hash).first();
}

async function createAssessment(request, env) {
  let input;
  try { input = await readJson(request); }
  catch (e) { return json(request, { ok: false, error: e.message === 'payload_too_large' ? e.message : 'invalid_json' }, 400); }

  const leaderName = clean(input.leaderName || input.leader_name, 120);
  const projectName = clean(input.projectName || input.project_name, 160);
  const guardianName = clean(input.guardianName || input.guardian_name, 120);
  const guardianEmail = clean(input.guardianEmail || input.guardian_email, 320).toLowerCase();
  if (!leaderName) return json(request, { ok: false, error: 'leader_name_required' }, 400);
  if (!isEmail(guardianEmail)) return json(request, { ok: false, error: 'guardian_email_required' }, 400);

  let roster;
  try { roster = normalizeRoster(input.roster); }
  catch (e) { return json(request, { ok: false, error: e.message }, 400); }

  const assessmentId = `L360-${randomToken(9)}`;
  const manageToken = randomToken(30);
  const manageHash = await sha256Hex(manageToken);
  const gEnc = await encryptText(env, guardianEmail);
  const stamp = nowIso();

  const statements = [
    env.IDENTITY_DB.prepare(
      `INSERT INTO assessments
       (assessment_id, leader_name, project_name, guardian_name, guardian_email_cipher, guardian_email_iv, manage_token_hash, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    ).bind(assessmentId, leaderName, projectName || null, guardianName || null, gEnc.cipher, gEnc.iv, manageHash, stamp, stamp),
    env.IDENTITY_DB.prepare(
      `INSERT INTO cycles (assessment_id, cycle, status, opened_at, created_at, updated_at)
       VALUES (?, 1, 'collecting', ?, ?, ?)`
    ).bind(assessmentId, stamp, stamp, stamp)
  ];

  const invites = [];
  for (let i = 0; i < roster.length; i += 1) {
    const row = roster[i];
    const inviteId = `I-${randomToken(9)}`;
    const token = randomToken(30);
    const tokenHash = await sha256Hex(token);
    const emailEnc = await encryptText(env, row.email);
    const tokenEnc = await encryptText(env, token);
    statements.push(env.IDENTITY_DB.prepare(
      `INSERT INTO invitations
       (invite_id, assessment_id, cycle, role, language, email_cipher, email_iv, token_hash, token_cipher, token_iv, status, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    ).bind(inviteId, assessmentId, row.role, row.language, emailEnc.cipher, emailEnc.iv, tokenHash, tokenEnc.cipher, tokenEnc.iv, stamp, stamp));
    invites.push({ row: i + 1, role: row.role, language: row.language, url: inviteUrl(env, token) });
  }

  try { await env.IDENTITY_DB.batch(statements); }
  catch (e) { return json(request, { ok: false, error: 'assessment_create_failed' }, 500); }

  return json(request, {
    ok: true,
    assessmentId,
    cycle: 1,
    manageToken,
    guardianMode: true,
    invites
  }, 201);
}

async function lookupInvite(env, token) {
  const tokenHash = await sha256Hex(token);
  return env.IDENTITY_DB.prepare(
    `SELECT i.invite_id, i.assessment_id, i.cycle, i.role, i.language, i.status,
            a.leader_name, a.project_name, a.guardian_name, a.guardian_email_cipher, a.guardian_email_iv
       FROM invitations i
       JOIN assessments a ON a.assessment_id = i.assessment_id
      WHERE i.token_hash = ? AND a.status = 'active'`
  ).bind(tokenHash).first();
}

async function inviteContext(request, env, token) {
  const row = await lookupInvite(env, token);
  if (!row || row.status === 'revoked') return json(request, { ok: false, error: 'invite_not_found' }, 404);
  const guardianEmail = await decryptText(env, row.guardian_email_cipher, row.guardian_email_iv);
  if (row.status === 'pending' || row.status === 'sent') {
    const stamp = nowIso();
    await env.IDENTITY_DB.prepare(
      `UPDATE invitations SET status = 'opened', opened_at = COALESCE(opened_at, ?), updated_at = ? WHERE invite_id = ?`
    ).bind(stamp, stamp, row.invite_id).run();
  }
  return json(request, {
    ok: true,
    completed: row.status === 'completed',
    leaderName: row.leader_name,
    projectName: row.project_name || '',
    role: row.role,
    language: row.language,
    cycle: row.cycle,
    guardian: {
      name: row.guardian_name || '',
      email: guardianEmail
    }
  });
}

function normalizeAnswers(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('answers_required');
  const entries = Object.entries(raw);
  if (entries.length < 1 || entries.length > MAX_ANSWERS) throw new Error('invalid_answer_count');
  const out = {};
  for (const [key, value] of entries) {
    const k = clean(key, 100);
    const n = Number(value);
    if (!k || !Number.isFinite(n) || n < 1 || n > 5) throw new Error('invalid_answer_value');
    out[k] = n;
  }
  return out;
}

function normalizeOpen(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [key, value] of Object.entries(raw).slice(0, 20)) {
    const k = clean(key, 100);
    const v = clean(value, 4000);
    if (k && v) out[k] = v;
  }
  return out;
}

async function submitInvite(request, env, token) {
  let input;
  try { input = await readJson(request); }
  catch (e) { return json(request, { ok: false, error: e.message === 'payload_too_large' ? e.message : 'invalid_json' }, 400); }

  const invite = await lookupInvite(env, token);
  if (!invite || invite.status === 'revoked') return json(request, { ok: false, error: 'invite_not_found' }, 404);
  if (invite.status === 'completed') return json(request, { ok: false, error: 'already_submitted' }, 409);

  let answers;
  try { answers = normalizeAnswers(input.answers); }
  catch (e) { return json(request, { ok: false, error: e.message }, 400); }
  const open = normalizeOpen(input.open);
  const bankVersion = clean(input.bankVersion || input.bank_version, 80);
  const responseId = `R-${randomToken(15)}`;
  const stamp = nowIso();

  try {
    await env.RESPONSE_DB.prepare(
      `INSERT INTO responses
       (response_id, assessment_id, cycle, role, language, schema_version, bank_version, answers_json, open_json, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      responseId,
      invite.assessment_id,
      invite.cycle,
      invite.role,
      invite.language,
      RESPONSE_SCHEMA,
      bankVersion || null,
      JSON.stringify(answers),
      JSON.stringify(open),
      stamp
    ).run();

    await env.IDENTITY_DB.prepare(
      `UPDATE invitations SET status = 'completed', completed_at = ?, updated_at = ? WHERE invite_id = ? AND status != 'completed'`
    ).bind(stamp, stamp, invite.invite_id).run();
  } catch (e) {
    await env.RESPONSE_DB.prepare('DELETE FROM responses WHERE response_id = ?').bind(responseId).run().catch(() => {});
    return json(request, { ok: false, error: 'submit_failed' }, 500);
  }

  return json(request, { ok: true, receipt: responseId, cycle: invite.cycle }, 201);
}

async function cycleStatus(request, env, assessmentId, cycle) {
  const assessment = await requireManage(request, env, assessmentId);
  if (!assessment) return json(request, { ok: false, error: 'unauthorized' }, 401);

  const rows = await env.IDENTITY_DB.prepare(
    `SELECT role,
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
            SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) AS opened
       FROM invitations
      WHERE assessment_id = ? AND cycle = ? AND status != 'revoked'
      GROUP BY role`
  ).bind(assessmentId, cycle).all();

  return json(request, {
    ok: true,
    assessmentId,
    cycle,
    groups: rows.results.map(r => ({
      role: r.role,
      total: Number(r.total || 0),
      completed: Number(r.completed || 0),
      sent: Number(r.sent || 0),
      opened: Number(r.opened || 0)
    }))
  });
}

async function exportCycle(request, env, assessmentId, cycle) {
  const assessment = await requireManage(request, env, assessmentId);
  if (!assessment) return json(request, { ok: false, error: 'unauthorized' }, 401);

  const rows = await env.RESPONSE_DB.prepare(
    `SELECT response_id, role, language, schema_version, bank_version, answers_json, open_json, submitted_at
       FROM responses
      WHERE assessment_id = ? AND cycle = ?
      ORDER BY submitted_at ASC`
  ).bind(assessmentId, cycle).all();

  const responses = rows.results.map(r => ({
    response_id: r.response_id,
    role: r.role,
    language: r.language,
    schema_version: r.schema_version,
    bank_version: r.bank_version,
    answers: JSON.parse(r.answers_json),
    open: r.open_json ? JSON.parse(r.open_json) : {},
    submitted_at: r.submitted_at
  }));

  return json(request, {
    ok: true,
    schema: BUNDLE_SCHEMA,
    assessment_id: assessmentId,
    cycle,
    exported_at: nowIso(),
    responses
  });
}

function invitationCopy(lang, context, url) {
  if (lang === 'en') {
    return {
      subject: `Leadership 360° feedback invitation${context.project ? ` – ${context.project}` : ''}`,
      text: `You are invited to provide confidential Leadership 360° feedback for ${context.leader}.\n\nThe survey takes about 15–20 minutes. Your invitation link does not contain your email address, and your response is stored separately from the invitation roster.\n\nOpen survey:\n${url}\n\nGuardian: ${context.guardianName || 'Assessment guardian'}${context.guardianEmail ? ` <${context.guardianEmail}>` : ''}\n\nPlease do not forward this personal invitation link.`
    };
  }
  return {
    subject: `Leadership 360° grįžtamojo ryšio kvietimas${context.project ? ` – ${context.project}` : ''}`,
    text: `Kviečiame pateikti konfidencialų Leadership 360° grįžtamąjį ryšį apie ${context.leader}.\n\nApklausa užtrunka apie 15–20 minučių. Kvietimo nuorodoje nėra jūsų el. pašto adreso, o atsakymas saugomas atskirai nuo kvietimų sąrašo.\n\nAtidaryti apklausą:\n${url}\n\nAnonimiškumo sergėtojas: ${context.guardianName || 'Sergėtojas'}${context.guardianEmail ? ` <${context.guardianEmail}>` : ''}\n\nNepersiųskite šios asmeninės kvietimo nuorodos kitam žmogui.`
  };
}

async function sendInvitations(request, env, assessmentId, cycle) {
  const assessment = await requireManage(request, env, assessmentId);
  if (!assessment) return json(request, { ok: false, error: 'unauthorized' }, 401);
  if (!env.EMAIL || !env.MAIL_FROM) {
    return json(request, { ok: false, error: 'email_not_configured' }, 503);
  }

  const guardianEmail = await decryptText(env, assessment.guardian_email_cipher, assessment.guardian_email_iv);
  const rows = await env.IDENTITY_DB.prepare(
    `SELECT invite_id, role, language, email_cipher, email_iv, token_cipher, token_iv, status
       FROM invitations
      WHERE assessment_id = ? AND cycle = ? AND status IN ('pending','sent','opened')`
  ).bind(assessmentId, cycle).all();

  let sent = 0;
  const failed = [];
  for (const row of rows.results) {
    try {
      const to = await decryptText(env, row.email_cipher, row.email_iv);
      const token = await decryptText(env, row.token_cipher, row.token_iv);
      const url = inviteUrl(env, token);
      const copy = invitationCopy(row.language, {
        leader: assessment.leader_name,
        project: assessment.project_name || '',
        guardianName: assessment.guardian_name || '',
        guardianEmail
      }, url);
      await env.EMAIL.send({
        from: env.MAIL_FROM,
        to,
        subject: copy.subject,
        text: copy.text
      });
      const stamp = nowIso();
      await env.IDENTITY_DB.prepare(
        `UPDATE invitations SET status = CASE WHEN status = 'opened' THEN 'opened' ELSE 'sent' END, sent_at = ?, updated_at = ? WHERE invite_id = ?`
      ).bind(stamp, stamp, row.invite_id).run();
      sent += 1;
    } catch (e) {
      failed.push(row.invite_id);
    }
  }

  return json(request, { ok: failed.length === 0, sent, failedCount: failed.length, failed });
}

async function createNextCycle(request, env, assessmentId) {
  const assessment = await requireManage(request, env, assessmentId);
  if (!assessment) return json(request, { ok: false, error: 'unauthorized' }, 401);

  let input = {};
  try { input = await readJson(request, 30000); } catch { input = {}; }
  const fromCycle = Math.max(1, Number(input.fromCycle || input.from_cycle || 1));
  const requested = Number(input.cycle || 0);
  const maxRow = await env.IDENTITY_DB.prepare('SELECT MAX(cycle) AS max_cycle FROM cycles WHERE assessment_id = ?').bind(assessmentId).first();
  const nextCycle = requested > 0 ? requested : Number(maxRow?.max_cycle || 0) + 1;
  if (nextCycle <= fromCycle) return json(request, { ok: false, error: 'cycle_must_advance' }, 400);

  const exists = await env.IDENTITY_DB.prepare('SELECT 1 AS x FROM cycles WHERE assessment_id = ? AND cycle = ?').bind(assessmentId, nextCycle).first();
  if (exists) return json(request, { ok: false, error: 'cycle_exists' }, 409);

  const prior = await env.IDENTITY_DB.prepare(
    `SELECT role, language, email_cipher, email_iv
       FROM invitations
      WHERE assessment_id = ? AND cycle = ? AND status != 'revoked'`
  ).bind(assessmentId, fromCycle).all();
  if (!prior.results.length) return json(request, { ok: false, error: 'source_cycle_has_no_roster' }, 400);

  const stamp = nowIso();
  const statements = [env.IDENTITY_DB.prepare(
    `INSERT INTO cycles (assessment_id, cycle, status, opened_at, created_at, updated_at)
     VALUES (?, ?, 'collecting', ?, ?, ?)`
  ).bind(assessmentId, nextCycle, stamp, stamp, stamp)];
  const invites = [];

  for (let i = 0; i < prior.results.length; i += 1) {
    const row = prior.results[i];
    const token = randomToken(30);
    const tokenHash = await sha256Hex(token);
    const tokenEnc = await encryptText(env, token);
    const inviteId = `I-${randomToken(9)}`;
    statements.push(env.IDENTITY_DB.prepare(
      `INSERT INTO invitations
       (invite_id, assessment_id, cycle, role, language, email_cipher, email_iv, token_hash, token_cipher, token_iv, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    ).bind(inviteId, assessmentId, nextCycle, row.role, row.language, row.email_cipher, row.email_iv, tokenHash, tokenEnc.cipher, tokenEnc.iv, stamp, stamp));
    invites.push({ role: row.role, language: row.language, url: inviteUrl(env, token) });
  }

  await env.IDENTITY_DB.batch(statements);
  return json(request, { ok: true, assessmentId, cycle: nextCycle, clonedFrom: fromCycle, invites }, 201);
}

async function deleteAssessment(request, env, assessmentId) {
  const assessment = await requireManage(request, env, assessmentId);
  if (!assessment) return json(request, { ok: false, error: 'unauthorized' }, 401);
  await env.RESPONSE_DB.prepare('DELETE FROM responses WHERE assessment_id = ?').bind(assessmentId).run();
  await env.IDENTITY_DB.prepare('DELETE FROM assessments WHERE assessment_id = ?').bind(assessmentId).run();
  return json(request, { ok: true, deleted: assessmentId });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      const allowed = originAllowed(request);
      if (!allowed) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return json(request, { ok: true, service: 'Leadership 360 Collector', version: 1 });
    }

    if (url.pathname === '/api/assessments' && request.method === 'POST') {
      return createAssessment(request, env);
    }

    let m = url.pathname.match(/^\/api\/invite\/([^/]+)$/);
    if (m && request.method === 'GET') return inviteContext(request, env, decodeURIComponent(m[1]));

    m = url.pathname.match(/^\/api\/invite\/([^/]+)\/submit$/);
    if (m && request.method === 'POST') return submitInvite(request, env, decodeURIComponent(m[1]));

    m = url.pathname.match(/^\/api\/manage\/([^/]+)\/cycles\/(\d+)\/status$/);
    if (m && request.method === 'GET') return cycleStatus(request, env, decodeURIComponent(m[1]), Number(m[2]));

    m = url.pathname.match(/^\/api\/manage\/([^/]+)\/cycles\/(\d+)\/export$/);
    if (m && request.method === 'GET') return exportCycle(request, env, decodeURIComponent(m[1]), Number(m[2]));

    m = url.pathname.match(/^\/api\/manage\/([^/]+)\/cycles\/(\d+)\/send$/);
    if (m && request.method === 'POST') return sendInvitations(request, env, decodeURIComponent(m[1]), Number(m[2]));

    m = url.pathname.match(/^\/api\/manage\/([^/]+)\/cycles$/);
    if (m && request.method === 'POST') return createNextCycle(request, env, decodeURIComponent(m[1]));

    m = url.pathname.match(/^\/api\/manage\/([^/]+)$/);
    if (m && request.method === 'DELETE') return deleteAssessment(request, env, decodeURIComponent(m[1]));

    return json(request, { ok: false, error: 'not_found' }, 404);
  }
};
