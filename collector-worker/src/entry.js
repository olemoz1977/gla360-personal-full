import core from './index.js';

const enc = new TextEncoder();

function clean(value, max = 320){
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function bytesToHex(bytes){
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value){
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(value)))));
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
    const url = new URL(request.url);

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
