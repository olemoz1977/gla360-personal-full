import legacy from './index.js';

const BOT_USERNAME = 'OMESG360Bot';
const MAX_ITEMS = 3;
const TRANSFER_TTL_MS = 30 * 60 * 1000;
const VILNIUS_TZ = 'Europe/Vilnius';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname === '/plan/import') {
      return cors(new Response(null, { status: 204 }));
    }

    if (request.method === 'POST' && url.pathname === '/plan/import') {
      try {
        await ensurePlanSchema(env);
        return cors(await createPlanTransfer(request, env));
      } catch (error) {
        console.error('plan/import failed', error);
        return cors(json({ error: 'Could not prepare Telegram transfer.' }, 500));
      }
    }

    if (request.method === 'POST' && url.pathname === '/telegram/webhook') {
      const incomingSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (env.TELEGRAM_WEBHOOK_SECRET && incomingSecret === env.TELEGRAM_WEBHOOK_SECRET) {
        try {
          await ensurePlanSchema(env);
          const update = await request.clone().json();
          if (await handlePlanTelegramUpdate(update, env)) return json({ ok: true });
        } catch (error) {
          console.error('plan webhook extension failed', error);
        }
      }
    }

    return legacy.fetch(request, env, ctx);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        await ensurePlanSchema(env);
        await sendDuePlanReminders(env);
      } catch (error) {
        console.error('plan reminder scheduler failed', error);
      }
    })());
    if (legacy.scheduled) return legacy.scheduled(controller, env, ctx);
  }
};

async function ensurePlanSchema(env) {
  if (!env.DB) throw new Error('DB binding missing');
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS plan_transfers (
      token TEXT PRIMARY KEY,
      language_code TEXT NOT NULL DEFAULT 'lt',
      start_date TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS plan_transfer_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_token TEXT NOT NULL,
      position INTEGER NOT NULL,
      text TEXT NOT NULL,
      frequency TEXT,
      phase TEXT,
      competency TEXT,
      due_date TEXT,
      FOREIGN KEY (transfer_token) REFERENCES plan_transfers(token) ON DELETE CASCADE
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_plan_transfer_items_token
      ON plan_transfer_items(transfer_token, position)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS plan_commitments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      text TEXT NOT NULL,
      frequency TEXT,
      phase TEXT,
      competency TEXT,
      due_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      source_transfer TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      last_reminded_at TEXT
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_plan_commitments_chat_status
      ON plan_commitments(chat_id, status, due_at)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_plan_commitments_due
      ON plan_commitments(status, due_at, last_reminded_at)`)
  ]);
}

async function createPlanTransfer(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || body.source !== 'leadership360' || !Array.isArray(body.items)) {
    return json({ error: 'Invalid plan payload.' }, 400);
  }
  if (body.items.length < 1 || body.items.length > MAX_ITEMS) {
    return json({ error: `Choose 1-${MAX_ITEMS} actions.` }, 400);
  }

  const items = body.items.map((item, index) => sanitizeItem(item, index));
  if (items.some(item => !item.text)) return json({ error: 'Every action needs text.' }, 400);

  const token = randomToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRANSFER_TTL_MS).toISOString();
  const lang = body.lang === 'en' ? 'en' : 'lt';
  const startDate = validDate(body.startDate) ? body.startDate : null;

  const statements = [
    env.DB.prepare(`INSERT INTO plan_transfers
      (token, language_code, start_date, created_at, expires_at, consumed_at)
      VALUES (?, ?, ?, ?, ?, NULL)`)
      .bind(token, lang, startDate, now.toISOString(), expiresAt)
  ];
  for (const item of items) {
    statements.push(env.DB.prepare(`INSERT INTO plan_transfer_items
      (transfer_token, position, text, frequency, phase, competency, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(token, item.position, item.text, item.frequency, item.phase, item.competency, item.dueDate));
  }
  await env.DB.batch(statements);

  return json({
    ok: true,
    expiresAt,
    telegramUrl: `https://t.me/${BOT_USERNAME}?start=plan_${token}`
  });
}

function sanitizeItem(item, index) {
  return {
    position: index,
    text: String(item?.text || '').trim().slice(0, 700),
    frequency: String(item?.frequency || '').trim().slice(0, 120),
    phase: String(item?.phase || '').trim().slice(0, 40),
    competency: String(item?.competency || '').trim().slice(0, 160),
    dueDate: validDate(item?.dueDate) ? item.dueDate : null
  };
}

async function handlePlanTelegramUpdate(update, env) {
  const message = update?.message;
  if (!message?.chat?.id) return false;
  const chatId = String(message.chat.id);
  const userId = String(message.from?.id || '');
  const text = String(message.text || '').trim();

  const startMatch = text.match(/^\/start(?:@\w+)?(?:\s+plan_([A-Za-z0-9_-]{8,64}))?$/i);
  if (startMatch?.[1]) {
    await consumeTransfer(chatId, userId, startMatch[1], env);
    return true;
  }

  const hasPlan = await hasPlanCommitments(chatId, env);
  if (!hasPlan) return false;

  if (/^\/start(?:@\w+)?$/i.test(text)) {
    await sendPlanStatus(chatId, env);
    return true;
  }
  if (/^\/list(?:@\w+)?$/i.test(text) || text === '📋 Aktyvūs priminimai') {
    await sendPlanList(chatId, env);
    return true;
  }
  if (/^\/status(?:@\w+)?$/i.test(text)) {
    await sendPlanStatus(chatId, env);
    return true;
  }
  if (text === '🌐 English' || text === '🌐 Lietuvių') {
    const lang = text === '🌐 English' ? 'en' : 'lt';
    await env.DB.prepare(`UPDATE users SET language_code = ?, updated_at = ? WHERE chat_id = ?`)
      .bind(lang, new Date().toISOString(), chatId).run();
    await sendPlanStatus(chatId, env);
    return true;
  }
  if (/^\/done(?:@\w+)?(?:\s+(\d+))?$/i.test(text)) {
    const match = text.match(/^\/done(?:@\w+)?(?:\s+(\d+))?$/i);
    await completePlanCommitment(chatId, match?.[1] ? Number(match[1]) : null, env);
    return true;
  }
  if (/^\/delete(?:@\w+)?$/i.test(text)) {
    await deleteAllCompanionData(chatId, env);
    return true;
  }

  return false;
}

async function consumeTransfer(chatId, userId, token, env) {
  const transfer = await env.DB.prepare(`SELECT * FROM plan_transfers WHERE token = ?`).bind(token).first();
  if (!transfer) return sendTelegram(chatId, 'Ši plano perdavimo nuoroda nebegalioja. Grįžkite į 90 d. planą ir perduokite veiksmus dar kartą.', env);
  if (transfer.consumed_at) return sendTelegram(chatId, 'Ši plano perdavimo nuoroda jau panaudota. Aktyvius veiksmus peržiūrėsite su /list.', env);
  if (new Date(transfer.expires_at).getTime() < Date.now()) {
    return sendTelegram(chatId, transfer.language_code === 'en'
      ? 'This plan transfer link has expired. Return to the 90-day plan and send the actions again.'
      : 'Ši plano perdavimo nuoroda nebegalioja. Grįžkite į 90 d. planą ir perduokite veiksmus dar kartą.', env);
  }

  const itemRows = await env.DB.prepare(`SELECT * FROM plan_transfer_items WHERE transfer_token = ? ORDER BY position ASC`)
    .bind(token).all();
  const items = itemRows.results || [];
  if (!items.length) return sendTelegram(chatId, 'Plano veiksmų neradau.', env);

  const lang = transfer.language_code === 'en' ? 'en' : 'lt';
  const now = new Date();
  const activeDue = [];
  const statements = [];

  // A new handoff replaces the previously monitored plan. It must not append stale test commitments.
  statements.push(env.DB.prepare(`UPDATE plan_commitments
    SET status = 'replaced', completed_at = ?
    WHERE chat_id = ? AND status = 'active'`).bind(now.toISOString(), chatId));

  for (const item of items.slice(0, MAX_ITEMS)) {
    const dueAt = normalizeDueAt(item.due_date, now);
    activeDue.push(dueAt);
    statements.push(env.DB.prepare(`INSERT INTO plan_commitments
      (chat_id, text, frequency, phase, competency, due_at, status, source_transfer, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`)
      .bind(chatId, item.text, item.frequency, item.phase, item.competency, dueAt, token, now.toISOString()));
  }

  // Keep legacy user state aligned so /language and other companion commands still work.
  statements.push(env.DB.prepare(`INSERT INTO users
    (chat_id, telegram_user_id, language_code, focus_codes, cadence, status, awaiting, started_at, next_due_at, created_at, updated_at)
    VALUES (?, ?, ?, '', 'weekly', 'active', NULL, ?, ?, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET
      telegram_user_id = excluded.telegram_user_id,
      language_code = excluded.language_code,
      status = 'active',
      awaiting = NULL,
      next_due_at = excluded.next_due_at,
      updated_at = excluded.updated_at`)
    .bind(chatId, userId, lang, now.toISOString(), activeDue.sort()[0], now.toISOString(), now.toISOString()));

  statements.push(env.DB.prepare(`UPDATE plan_transfers SET consumed_at = ? WHERE token = ? AND consumed_at IS NULL`)
    .bind(now.toISOString(), token));

  await env.DB.batch(statements);

  const first = activeDue.sort()[0];
  const body = lang === 'en'
    ? `✅ Leadership 360° plan connected.\nActive commitments: ${items.length}.\nFirst reminder: ${formatVilnius(first, 'en')}.\n\nView them with /list.`
    : `✅ Leadership 360° planas prijungtas.\nAktyvūs pažadai: ${items.length}.\nPirmas priminimas: ${formatVilnius(first, 'lt')}.\n\nJuos peržiūrėsi su /list.`;
  return sendTelegram(chatId, body, env, planKeyboard(lang));
}

async function hasPlanCommitments(chatId, env) {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM plan_commitments WHERE chat_id = ? AND status = 'active'`)
    .bind(chatId).first();
  return Number(row?.n || 0) > 0;
}

async function listPlanCommitments(chatId, env) {
  const rows = await env.DB.prepare(`SELECT id, text, frequency, competency, due_at
    FROM plan_commitments WHERE chat_id = ? AND status = 'active' ORDER BY due_at ASC, id ASC`)
    .bind(chatId).all();
  return rows.results || [];
}

async function sendPlanList(chatId, env) {
  const lang = await userLanguage(chatId, env);
  const items = await listPlanCommitments(chatId, env);
  if (!items.length) return sendTelegram(chatId, lang === 'en' ? 'No active commitments.' : 'Aktyvių pažadų nėra.', env, planKeyboard(lang));
  const heading = lang === 'en' ? 'Active commitments:' : 'Aktyvūs pažadai:';
  const lines = items.map((item, i) => `#${i + 1} · ${formatVilnius(item.due_at, lang)} · ${item.text}`);
  const hint = lang === 'en' ? '\n\nComplete one with /done 1' : '\n\nUžbaigti konkretų pažadą: /done 1';
  return sendTelegram(chatId, [heading, ...lines].join('\n') + hint, env, planKeyboard(lang));
}

async function sendPlanStatus(chatId, env) {
  const lang = await userLanguage(chatId, env);
  const items = await listPlanCommitments(chatId, env);
  const first = items[0]?.due_at || null;
  const body = lang === 'en'
    ? `✅ Leadership 360° plan connected.\nActive commitments: ${items.length}.\n${first ? `Next reminder: ${formatVilnius(first, 'en')}.` : ''}\n\nView them with /list.`
    : `✅ Leadership 360° planas prijungtas.\nAktyvūs pažadai: ${items.length}.\n${first ? `Kitas priminimas: ${formatVilnius(first, 'lt')}.` : ''}\n\nJuos peržiūrėsi su /list.`;
  return sendTelegram(chatId, body, env, planKeyboard(lang));
}

async function completePlanCommitment(chatId, ordinal, env) {
  const lang = await userLanguage(chatId, env);
  const items = await listPlanCommitments(chatId, env);
  if (!items.length) return sendTelegram(chatId, lang === 'en' ? 'No active commitment found.' : 'Aktyvaus pažado neradau.', env, planKeyboard(lang));
  if (ordinal == null) {
    if (items.length !== 1) {
      return sendTelegram(chatId,
        lang === 'en' ? `You have ${items.length} active commitments. Specify which one, for example /done 1.` : `Turi ${items.length} aktyvius pažadus. Nurodyk kurį užbaigei, pvz. /done 1.`,
        env, planKeyboard(lang));
    }
    ordinal = 1;
  }
  const item = items[ordinal - 1];
  if (!item) return sendTelegram(chatId, lang === 'en' ? 'That active commitment number does not exist. Use /list.' : 'Tokio aktyvaus pažado numerio nėra. Peržiūrėk /list.', env, planKeyboard(lang));
  await env.DB.prepare(`UPDATE plan_commitments SET status = 'completed', completed_at = ? WHERE id = ? AND chat_id = ?`)
    .bind(new Date().toISOString(), item.id, chatId).run();
  const remaining = Math.max(0, items.length - 1);
  return sendTelegram(chatId,
    lang === 'en' ? `✅ Completed: ${item.text}\nActive commitments left: ${remaining}.` : `✅ Užbaigta: ${item.text}\nLiko aktyvių pažadų: ${remaining}.`,
    env, planKeyboard(lang));
}

async function deleteAllCompanionData(chatId, env) {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM plan_commitments WHERE chat_id = ?`).bind(chatId),
    env.DB.prepare(`DELETE FROM checkins WHERE chat_id = ?`).bind(chatId),
    env.DB.prepare(`DELETE FROM commitments WHERE chat_id = ?`).bind(chatId),
    env.DB.prepare(`DELETE FROM users WHERE chat_id = ?`).bind(chatId)
  ]);
  return sendTelegram(chatId, 'Tavo Leadership 360° companion duomenys ištrinti. / Your Leadership 360° companion data was deleted.', env);
}

async function sendDuePlanReminders(env) {
  const now = new Date().toISOString();
  const rows = await env.DB.prepare(`SELECT id, chat_id, text, due_at FROM plan_commitments
    WHERE status = 'active' AND due_at <= ? AND last_reminded_at IS NULL
    ORDER BY due_at ASC LIMIT 100`).bind(now).all();
  for (const item of rows.results || []) {
    const lang = await userLanguage(item.chat_id, env);
    const body = lang === 'en'
      ? `⏰ Leadership 360° commitment:\n${item.text}\n\nWhen completed, use /list and /done N.`
      : `⏰ Leadership 360° pažadas:\n${item.text}\n\nKai atliksi, peržiūrėk /list ir pažymėk /done N.`;
    await sendTelegram(item.chat_id, body, env, planKeyboard(lang));
    await env.DB.prepare(`UPDATE plan_commitments SET last_reminded_at = ? WHERE id = ?`).bind(new Date().toISOString(), item.id).run();
  }
}

async function userLanguage(chatId, env) {
  const row = await env.DB.prepare(`SELECT language_code FROM users WHERE chat_id = ?`).bind(chatId).first();
  return row?.language_code === 'en' ? 'en' : 'lt';
}

function planKeyboard(lang) {
  return {
    keyboard: [[
      { text: lang === 'en' ? '📋 Active reminders' : '📋 Aktyvūs priminimai' },
      { text: lang === 'en' ? '🌐 Lietuvių' : '🌐 English' }
    ]],
    resize_keyboard: true,
    is_persistent: true
  };
}

async function sendTelegram(chatId, text, env, replyMarkup = null) {
  const body = { chat_id: chatId, text, disable_web_page_preview: true };
  if (replyMarkup) body.reply_markup = replyMarkup;
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) console.error('Telegram sendMessage failed', response.status, await response.text());
  return response;
}

function randomToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(`${value}T12:00:00Z`).getTime());
}

function normalizeDueAt(dueDate, now = new Date()) {
  const baseDate = validDate(dueDate) ? dueDate : formatDateInZone(now, VILNIUS_TZ);
  let due = zonedTimeToUtc(baseDate, 18, 0, VILNIUS_TZ);
  if (due.getTime() <= now.getTime() + 5 * 60 * 1000) {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    due = zonedTimeToUtc(formatDateInZone(tomorrow, VILNIUS_TZ), 18, 0, VILNIUS_TZ);
  }
  return due.toISOString();
}

function zonedTimeToUtc(dateStr, hour, minute, timeZone) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetLocalAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = new Date(targetLocalAsUtc);
  for (let i = 0; i < 3; i++) {
    const parts = zoneParts(guess, timeZone);
    const renderedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    const delta = targetLocalAsUtc - renderedAsUtc;
    if (!delta) break;
    guess = new Date(guess.getTime() + delta);
  }
  return guess;
}

function zoneParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day), hour: Number(map.hour), minute: Number(map.minute) };
}

function formatDateInZone(date, timeZone) {
  const parts = zoneParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function formatVilnius(value, lang) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return String(value || '');
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'lt-LT', {
    timeZone: VILNIUS_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(d).replace(',', '');
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

function cors(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Headers', 'content-type');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
