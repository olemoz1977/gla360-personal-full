const FOCUS = {
  DI: 'Sąžiningumas ir patikimumas',
  ED: 'Dialogo skatinimas',
  CSV: 'Bendros krypties kūrimas',
  DTS: 'Technologinis išprusimas',
  ECS: 'Kliento pasitenkinimas',
  MCA: 'Konkurencinis pranašumas',
  DP: 'Žmonių ugdymas',
  BP: 'Partnerystės kūrimas',
  SL: 'Lyderiavimo dalijimasis',
  APM: 'Asmeninis tobulėjimas',
  AO: 'Galimybių numatymas',
  LC: 'Pokyčių valdymas',
  EP: 'Žmonių įgalinimas',
  TG: 'Globalus mąstymas',
  AD: 'Įvairovės vertinimas'
};

const DAY_MS = 24 * 60 * 60 * 1000;
const CADENCE_MS = {
  weekly: 7 * DAY_MS,
  twice: 3.5 * DAY_MS
};
const MILESTONE_DAYS = [30, 60, 90];
const SILENCE_GRACE_MS = 7 * DAY_MS;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, service: 'leadership-360-companion' });
    }

    if (request.method !== 'POST' || url.pathname !== '/telegram/webhook') {
      return new Response('Not found', { status: 404 });
    }

    const incomingSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (!env.TELEGRAM_WEBHOOK_SECRET || incomingSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response('Forbidden', { status: 403 });
    }

    const update = await request.json();
    await handleUpdate(update, env);
    return json({ ok: true });
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(sendDueCheckins(env));
  }
};

async function handleUpdate(update, env) {
  if (update.callback_query) {
    return handleCallback(update.callback_query, env);
  }

  const message = update.message;
  if (!message?.chat?.id || !message.from) return;

  const chatId = String(message.chat.id);
  const userId = String(message.from.id);
  const text = (message.text || '').trim();

  if (text.startsWith('/start')) {
    const payload = text.split(/\s+/, 2)[1] || '';
    return startFlow(chatId, userId, message.from.language_code || null, payload, env);
  }

  if (text === '/pause') return pause(chatId, env);
  if (text === '/resume') return resume(chatId, env);
  if (text === '/status') return status(chatId, env);
  if (text === '/add') return beginAdd(chatId, env);
  if (text === '/done') return markCurrentDone(chatId, env);
  if (text === '/delete') return deleteUser(chatId, env);

  const user = await getUser(chatId, env);
  if (!user) {
    return sendMessage(chatId, 'Pradėkite nuo /start.', env);
  }

  if (user.awaiting === 'commitment') {
    return saveCommitment(chatId, text, env);
  }

  if (user.awaiting === 'blocker') {
    return saveBlocker(chatId, text, env);
  }

  return sendMessage(
    chatId,
    'Galiu sekti tik tavo pasirinktus įsipareigojimus. Naudok /status, /add, /pause arba /resume.',
    env
  );
}

async function startFlow(chatId, userId, languageCode, payload, env) {
  const now = isoNow();
  const codes = parseFocusCodes(payload);
  const focusCodes = codes.join(',');

  await env.DB.prepare(`
    INSERT INTO users (
      chat_id, telegram_user_id, language_code, focus_codes,
      cadence, status, awaiting, started_at, next_due_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'weekly', 'onboarding', NULL, ?, NULL, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET
      telegram_user_id = excluded.telegram_user_id,
      language_code = excluded.language_code,
      focus_codes = CASE
        WHEN excluded.focus_codes <> '' THEN excluded.focus_codes
        ELSE users.focus_codes
      END,
      status = 'onboarding',
      awaiting = NULL,
      updated_at = excluded.updated_at
  `).bind(chatId, userId, languageCode, focusCodes, now, now, now).run();

  const focusText = codes.length
    ? `\n\nTavo 360° fokusas:\n${codes.map((c, i) => `${i + 1}. ${FOCUS[c]}`).join('\n')}`
    : '';

  return sendMessage(
    chatId,
    `Šis palydovas nėra treneris ir nesiųs kasdienių motyvacinių žinučių.${focusText}\n\nKaip dažnai galiu trumpai priminti apie tavo pasirinktą pažadą?`,
    env,
    {
      inline_keyboard: [
        [{ text: '1× per savaitę', callback_data: 'cadence:weekly' }],
        [{ text: '2× per savaitę', callback_data: 'cadence:twice' }],
        [{ text: 'Tik 30/60/90 d. etapai', callback_data: 'cadence:milestones' }]
      ]
    }
  );
}

async function handleCallback(query, env) {
  const chatId = String(query.message?.chat?.id || '');
  if (!chatId) return;

  await answerCallback(query.id, env);
  const data = query.data || '';

  if (data.startsWith('cadence:')) {
    const cadence = data.split(':')[1];
    if (![...Object.keys(CADENCE_MS), 'milestones'].includes(cadence)) return;

    const user = await getUser(chatId, env);
    if (!user) return sendMessage(chatId, 'Pradėkite nuo /start.', env);

    const nextDue = nextDueAt({ ...user, cadence });
    await env.DB.prepare(`
      UPDATE users
      SET cadence = ?, status = 'active', awaiting = 'commitment', next_due_at = ?, updated_at = ?
      WHERE chat_id = ?
    `).bind(cadence, nextDue, isoNow(), chatId).run();

    return sendMessage(
      chatId,
      'Gerai. Dabar įrašyk vieną konkretų pažadą sau artimiausiam etapui. Trumpai, vienu sakiniu.',
      env
    );
  }

  if (data.startsWith('check:')) {
    const result = data.split(':')[1];
    return handleCheckinResult(chatId, result, env);
  }
}

async function saveCommitment(chatId, text, env) {
  if (!text || text.length < 3) {
    return sendMessage(chatId, 'Pažadas per trumpas. Parašyk vieną konkretų veiksmą.', env);
  }

  const countRow = await env.DB.prepare(`
    SELECT COUNT(*) AS n FROM commitments WHERE chat_id = ? AND status = 'active'
  `).bind(chatId).first();

  if ((countRow?.n || 0) >= 3) {
    await env.DB.prepare(`UPDATE users SET awaiting = NULL, updated_at = ? WHERE chat_id = ?`)
      .bind(isoNow(), chatId).run();
    return sendMessage(chatId, 'Jau turi 3 aktyvius pažadus. Pirmiau užbaik bent vieną su /done.', env);
  }

  await env.DB.prepare(`
    INSERT INTO commitments (chat_id, text, status, created_at)
    VALUES (?, ?, 'active', ?)
  `).bind(chatId, text.slice(0, 500), isoNow()).run();

  await env.DB.prepare(`UPDATE users SET awaiting = NULL, status = 'active', updated_at = ? WHERE chat_id = ?`)
    .bind(isoNow(), chatId).run();

  return sendMessage(
    chatId,
    'Užfiksuota. Priminsiu pagal tavo pasirinktą ritmą. Jei nori pridėti dar vieną pažadą, naudok /add.',
    env
  );
}

async function beginAdd(chatId, env) {
  const user = await getUser(chatId, env);
  if (!user) return sendMessage(chatId, 'Pradėkite nuo /start.', env);

  await env.DB.prepare(`UPDATE users SET awaiting = 'commitment', updated_at = ? WHERE chat_id = ?`)
    .bind(isoNow(), chatId).run();

  return sendMessage(chatId, 'Įrašyk dar vieną konkretų pažadą. Daugiausia gali būti 3 aktyvūs.', env);
}

async function handleCheckinResult(chatId, result, env) {
  if (result === 'pause') return pause(chatId, env);

  const commitment = await currentCommitment(chatId, env);
  if (!commitment) return sendMessage(chatId, 'Aktyvaus pažado neradau. Pridėk jį su /add.', env);

  if (result === 'done') {
    await recordCheckin(chatId, commitment.id, 'done', null, env);
    await reschedule(chatId, env);
    return sendMessage(chatId, 'Užfiksuota: padaryta.', env);
  }

  if (result === 'partial' || result === 'notyet') {
    await recordCheckin(chatId, commitment.id, result, null, env);
    await reschedule(chatId, env);
    await env.DB.prepare(`UPDATE users SET awaiting = 'blocker', updated_at = ? WHERE chat_id = ?`)
      .bind(isoNow(), chatId).run();
    return sendMessage(chatId, 'Jei nori, vienu sakiniu užfiksuok kas sutrukdė. Jei nenori rašyti, siųsk „-“.', env);
  }

  if (result === 'later') {
    const nextDue = new Date(Date.now() + 2 * DAY_MS).toISOString();
    await recordCheckin(chatId, commitment.id, 'later', null, env);
    await env.DB.prepare(`
      UPDATE users
      SET status = 'active', awaiting = NULL, next_due_at = ?, updated_at = ?
      WHERE chat_id = ?
    `).bind(nextDue, isoNow(), chatId).run();
    return sendMessage(chatId, 'Gerai. Grįšiu prie šio pažado po 2 dienų.', env);
  }
}

async function saveBlocker(chatId, text, env) {
  const note = text === '-' ? null : text.slice(0, 700);
  const recent = await env.DB.prepare(`
    SELECT id FROM checkins
    WHERE chat_id = ? AND status IN ('partial','notyet')
    ORDER BY id DESC LIMIT 1
  `).bind(chatId).first();

  if (recent?.id) {
    await env.DB.prepare(`UPDATE checkins SET note = ? WHERE id = ?`)
      .bind(note, recent.id).run();
  }

  await env.DB.prepare(`UPDATE users SET awaiting = NULL, updated_at = ? WHERE chat_id = ?`)
    .bind(isoNow(), chatId).run();

  return sendMessage(chatId, note ? 'Kliūtis užfiksuota.' : 'Gerai, be papildomo komentaro.', env);
}

async function status(chatId, env) {
  const user = await getUser(chatId, env);
  if (!user) return sendMessage(chatId, 'Pradėkite nuo /start.', env);

  const commitments = await env.DB.prepare(`
    SELECT id, text, status, created_at FROM commitments
    WHERE chat_id = ? AND status = 'active'
    ORDER BY id ASC
  `).bind(chatId).all();

  const codes = (user.focus_codes || '').split(',').filter(Boolean);
  const focusText = codes.length ? codes.map(c => FOCUS[c] || c).join(', ') : 'neperduotas';
  const active = commitments.results || [];
  const next = user.status === 'paused'
    ? 'pauzė'
    : user.status === 'waiting'
      ? 'laukiu tavo atsakymo'
      : compactDate(user.next_due_at);

  const body = [
    `Fokusas: ${focusText}`,
    `Ritmas: ${cadenceLabel(user.cadence)}`,
    `Kitas check-in: ${next}`,
    '',
    active.length ? 'Aktyvūs pažadai:' : 'Aktyvių pažadų nėra.',
    ...active.map((c, i) => `${i + 1}. ${c.text}`)
  ].join('\n');

  return sendMessage(chatId, body, env);
}

async function pause(chatId, env) {
  const user = await getUser(chatId, env);
  if (!user) return sendMessage(chatId, 'Pradėkite nuo /start.', env);

  await env.DB.prepare(`
    UPDATE users
    SET status = 'paused', next_due_at = NULL, awaiting = NULL, updated_at = ?
    WHERE chat_id = ?
  `).bind(isoNow(), chatId).run();
  return sendMessage(chatId, 'Pauzė įjungta. Kol neparašysi /resume, priminimų nebus.', env);
}

async function resume(chatId, env) {
  const user = await getUser(chatId, env);
  if (!user) return sendMessage(chatId, 'Pradėkite nuo /start.', env);

  const nextDue = nextDueAt(user);
  if (!nextDue && user.cadence === 'milestones') {
    return sendMessage(chatId, '90 dienų ciklas jau pasibaigęs. Laikas pakartotiniam Leadership 360° vertinimui.', env);
  }

  await env.DB.prepare(`
    UPDATE users
    SET status = 'active', awaiting = NULL, next_due_at = ?, updated_at = ?
    WHERE chat_id = ?
  `).bind(nextDue, isoNow(), chatId).run();
  return sendMessage(chatId, 'Tęsiam. Priminsiu pagal tavo pasirinktą ritmą.', env);
}

async function markCurrentDone(chatId, env) {
  const commitment = await currentCommitment(chatId, env);
  if (!commitment) return sendMessage(chatId, 'Aktyvaus pažado neradau.', env);

  await env.DB.prepare(`
    UPDATE commitments SET status = 'completed', completed_at = ? WHERE id = ?
  `).bind(isoNow(), commitment.id).run();
  await recordCheckin(chatId, commitment.id, 'completed', null, env);

  return sendMessage(chatId, `Užbaigta: ${commitment.text}\nJei reikia naujo pažado, naudok /add.`, env);
}

async function deleteUser(chatId, env) {
  const user = await getUser(chatId, env);
  if (!user) return sendMessage(chatId, 'Companion duomenų šiam pokalbiui nėra.', env);

  await env.DB.batch([
    env.DB.prepare(`DELETE FROM checkins WHERE chat_id = ?`).bind(chatId),
    env.DB.prepare(`DELETE FROM commitments WHERE chat_id = ?`).bind(chatId),
    env.DB.prepare(`DELETE FROM users WHERE chat_id = ?`).bind(chatId)
  ]);
  return sendMessage(chatId, 'Tavo companion duomenys ištrinti.', env);
}

async function sendDueCheckins(env) {
  const now = isoNow();
  const due = await env.DB.prepare(`
    SELECT chat_id, cadence, started_at, focus_codes, status, next_due_at
    FROM users
    WHERE status IN ('active','waiting')
      AND next_due_at IS NOT NULL
      AND next_due_at <= ?
    ORDER BY next_due_at ASC
    LIMIT 100
  `).bind(now).all();

  for (const user of due.results || []) {
    if (user.status === 'waiting') {
      await sendMessage(
        user.chat_id,
        'Nenoriu tavęs vaikytis. Šiam kartui priminimus sustabdau. Kai norėsi tęsti, parašyk /resume.',
        env
      );
      await env.DB.prepare(`
        UPDATE users
        SET status = 'paused', next_due_at = NULL, awaiting = NULL, updated_at = ?
        WHERE chat_id = ?
      `).bind(isoNow(), user.chat_id).run();
      continue;
    }

    const commitment = await currentCommitment(user.chat_id, env);

    if (!commitment) {
      await env.DB.prepare(`UPDATE users SET next_due_at = NULL, updated_at = ? WHERE chat_id = ?`)
        .bind(isoNow(), user.chat_id).run();
      continue;
    }

    const milestone = milestoneNumber(user.started_at);
    const prefix = milestone ? `${milestone} dienų etapas. ` : '';
    const repeatNote = milestone === 90
      ? '\n\nPo šio check-in jau verta grįžti į pakartotinį Leadership 360° ciklą: https://omesg360.eu/leadership-360/'
      : '';

    await sendMessage(
      user.chat_id,
      `${prefix}Tavo pažadas:\n“${commitment.text}”\n\nKur esi dabar?${repeatNote}`,
      env,
      {
        inline_keyboard: [
          [
            { text: 'Padaryta', callback_data: 'check:done' },
            { text: 'Iš dalies', callback_data: 'check:partial' }
          ],
          [
            { text: 'Dar ne', callback_data: 'check:notyet' },
            { text: 'Po 2 dienų', callback_data: 'check:later' }
          ],
          [{ text: 'Pauzė', callback_data: 'check:pause' }]
        ]
      }
    );

    const silenceDeadline = new Date(Date.now() + SILENCE_GRACE_MS).toISOString();
    await env.DB.prepare(`
      UPDATE users
      SET status = 'waiting', last_checkin_at = ?, next_due_at = ?, updated_at = ?
      WHERE chat_id = ?
    `).bind(now, silenceDeadline, now, user.chat_id).run();
  }
}

async function reschedule(chatId, env) {
  const user = await getUser(chatId, env);
  if (!user || user.status === 'paused') return;

  const nextDue = nextDueAt(user);
  await env.DB.prepare(`
    UPDATE users
    SET status = 'active', next_due_at = ?, last_checkin_at = ?, updated_at = ?
    WHERE chat_id = ?
  `).bind(nextDue, isoNow(), isoNow(), chatId).run();
}

function nextDueAt(user, nowMs = Date.now()) {
  if (user.cadence === 'milestones') {
    const startMs = new Date(user.started_at).getTime();
    if (!Number.isFinite(startMs)) return null;

    for (const day of MILESTONE_DAYS) {
      const dueMs = startMs + day * DAY_MS;
      if (dueMs > nowMs + 60 * 1000) return new Date(dueMs).toISOString();
    }
    return null;
  }

  const interval = CADENCE_MS[user.cadence] || CADENCE_MS.weekly;
  return new Date(nowMs + interval).toISOString();
}

async function currentCommitment(chatId, env) {
  return env.DB.prepare(`
    SELECT id, text FROM commitments
    WHERE chat_id = ? AND status = 'active'
    ORDER BY id ASC LIMIT 1
  `).bind(chatId).first();
}

async function recordCheckin(chatId, commitmentId, statusValue, note, env) {
  return env.DB.prepare(`
    INSERT INTO checkins (chat_id, commitment_id, status, note, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(chatId, commitmentId, statusValue, note, isoNow()).run();
}

async function getUser(chatId, env) {
  return env.DB.prepare(`SELECT * FROM users WHERE chat_id = ?`).bind(chatId).first();
}

function parseFocusCodes(payload) {
  if (!payload || !payload.startsWith('p_')) return [];
  return payload
    .slice(2)
    .split('_')
    .filter(code => Object.prototype.hasOwnProperty.call(FOCUS, code))
    .slice(0, 3);
}

function milestoneNumber(startedAt) {
  if (!startedAt) return null;
  const days = Math.floor((Date.now() - new Date(startedAt).getTime()) / DAY_MS);
  if (days >= 88 && days <= 97) return 90;
  if (days >= 58 && days <= 67) return 60;
  if (days >= 28 && days <= 37) return 30;
  return null;
}

function cadenceLabel(cadence) {
  if (cadence === 'twice') return '2× per savaitę';
  if (cadence === 'milestones') return 'tik 30/60/90 d. etapai';
  return '1× per savaitę';
}

function compactDate(value) {
  if (!value) return 'nenustatyta';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
}

async function sendMessage(chatId, text, env, replyMarkup) {
  const body = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    console.error('Telegram sendMessage failed', res.status, await res.text());
  }
  return res;
}

async function answerCallback(callbackQueryId, env) {
  if (!callbackQueryId) return;
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId })
  });
  if (!res.ok) {
    console.error('Telegram answerCallbackQuery failed', res.status, await res.text());
  }
}

function isoNow() {
  return new Date().toISOString();
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
