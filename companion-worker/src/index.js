const FOCUS = {
  DI:  { lt: 'Sąžiningumas ir patikimumas', en: 'Demonstrating Integrity' },
  ED:  { lt: 'Dialogo skatinimas', en: 'Encouraging Dialogue' },
  CSV: { lt: 'Bendros krypties kūrimas', en: 'Creating Shared Vision' },
  DTS: { lt: 'Technologinis išprusimas', en: 'Developing Technological Savvy' },
  ECS: { lt: 'Kliento pasitenkinimas', en: 'Ensuring Customer Satisfaction' },
  MCA: { lt: 'Konkurencinis pranašumas', en: 'Maintaining Competitive Advantage' },
  DP:  { lt: 'Žmonių ugdymas', en: 'Developing People' },
  BP:  { lt: 'Partnerystės kūrimas', en: 'Building Partnerships' },
  SL:  { lt: 'Lyderiavimo dalijimasis', en: 'Sharing Leadership' },
  APM: { lt: 'Asmeninis tobulėjimas', en: 'Achieving Personal Mastery' },
  AO:  { lt: 'Galimybių numatymas', en: 'Anticipating Opportunities' },
  LC:  { lt: 'Pokyčių valdymas', en: 'Leading Change' },
  EP:  { lt: 'Žmonių įgalinimas', en: 'Empowering People' },
  TG:  { lt: 'Globalus mąstymas', en: 'Thinking Globally' },
  AD:  { lt: 'Įvairovės vertinimas', en: 'Appreciating Diversity' }
};

const TEXT = {
  lt: {
    choose_language: 'Pasirinkite kalbą / Choose language',
    intro: 'Šis palydovas nėra treneris ir nesiųs kasdienių motyvacinių žinučių.',
    focus_heading: 'Tavo 360° fokusas:',
    cadence_question: 'Kaip dažnai galiu trumpai priminti apie tavo pasirinktą pažadą?',
    cadence_weekly: '1× per savaitę',
    cadence_twice: '2× per savaitę',
    cadence_milestones: 'Tik 30/60/90 d. etapai',
    enter_commitment: 'Gerai. Dabar įrašyk vieną konkretų pažadą sau artimiausiam etapui. Trumpai, vienu sakiniu.',
    commitment_short: 'Pažadas per trumpas. Parašyk vieną konkretų veiksmą.',
    commitment_limit: 'Jau turi 3 aktyvius pažadus. Pirmiau užbaik bent vieną su /done.',
    commitment_saved: 'Užfiksuota. Priminsiu pagal tavo pasirinktą ritmą. Jei nori pridėti dar vieną pažadą, naudok /add.',
    add_commitment: 'Įrašyk dar vieną konkretų pažadą. Daugiausia gali būti 3 aktyvūs.',
    no_active: 'Aktyvaus pažado neradau. Pridėk jį su /add.',
    done_logged: 'Užfiksuota: padaryta.',
    blocker_prompt: 'Jei nori, vienu sakiniu užfiksuok kas sutrukdė. Jei nenori rašyti, siųsk „-“.',
    later: 'Gerai. Grįšiu prie šio pažado po 2 dienų.',
    blocker_saved: 'Kliūtis užfiksuota.',
    blocker_skipped: 'Gerai, be papildomo komentaro.',
    focus: 'Fokusas',
    cadence: 'Ritmas',
    next_checkin: 'Kitas check-in',
    paused: 'pauzė',
    waiting: 'laukiu tavo atsakymo',
    not_set: 'nenustatyta',
    not_passed: 'neperduotas',
    active_commitments: 'Aktyvūs pažadai:',
    no_commitments: 'Aktyvių pažadų nėra.',
    pause_on: 'Pauzė įjungta. Kol neparašysi /resume, priminimų nebus.',
    cycle_finished: '90 dienų ciklas jau pasibaigęs. Laikas pakartotiniam Leadership 360° vertinimui.',
    resumed: 'Tęsiam. Priminsiu pagal tavo pasirinktą ritmą.',
    completed: 'Užbaigta',
    add_after_completed: 'Jei reikia naujo pažado, naudok /add.',
    no_companion_data: 'Companion duomenų šiam pokalbiui nėra.',
    data_deleted: 'Tavo companion duomenys ištrinti.',
    silence_pause: 'Nenoriu tavęs vaikytis. Šiam kartui priminimus sustabdau. Kai norėsi tęsti, parašyk /resume.',
    milestone: 'dienų etapas.',
    promise: 'Tavo pažadas:',
    where_now: 'Kur esi dabar?',
    repeat_note: 'Po šio check-in jau verta grįžti į pakartotinį Leadership 360° ciklą:',
    btn_done: 'Padaryta',
    btn_partial: 'Iš dalies',
    btn_notyet: 'Dar ne',
    btn_later: 'Po 2 dienų',
    btn_pause: 'Pauzė',
    unknown: 'Galiu sekti tik tavo pasirinktus įsipareigojimus. Naudok /status, /add, /pause, /resume arba /language.',
    language_changed: 'Kalba pakeista į lietuvių.',
    start_required: 'Pradėkite nuo /start.'
  },
  en: {
    choose_language: 'Choose language / Pasirinkite kalbą',
    intro: 'This companion is not a coach and will not send daily motivational messages.',
    focus_heading: 'Your 360° focus:',
    cadence_question: 'How often may I briefly check in on the commitment you chose?',
    cadence_weekly: 'Once a week',
    cadence_twice: 'Twice a week',
    cadence_milestones: '30/60/90-day milestones only',
    enter_commitment: 'Good. Now write one specific commitment for the next stage. Keep it to one sentence.',
    commitment_short: 'That commitment is too short. Write one specific action.',
    commitment_limit: 'You already have 3 active commitments. Complete at least one with /done first.',
    commitment_saved: 'Saved. I will check in according to the cadence you chose. Use /add if you want to add another commitment.',
    add_commitment: 'Write one more specific commitment. You can have up to 3 active commitments.',
    no_active: 'I could not find an active commitment. Add one with /add.',
    done_logged: 'Logged: done.',
    blocker_prompt: 'If useful, capture what got in the way in one sentence. If you do not want to add a note, send “-”.',
    later: 'Okay. I will come back to this commitment in 2 days.',
    blocker_saved: 'Blocker recorded.',
    blocker_skipped: 'Okay, no additional note.',
    focus: 'Focus',
    cadence: 'Cadence',
    next_checkin: 'Next check-in',
    paused: 'paused',
    waiting: 'waiting for your reply',
    not_set: 'not set',
    not_passed: 'not provided',
    active_commitments: 'Active commitments:',
    no_commitments: 'No active commitments.',
    pause_on: 'Paused. I will not send reminders until you use /resume.',
    cycle_finished: 'The 90-day cycle has ended. It is time for a repeat Leadership 360° assessment.',
    resumed: 'Continuing. I will check in according to your chosen cadence.',
    completed: 'Completed',
    add_after_completed: 'Use /add if you need a new commitment.',
    no_companion_data: 'There is no companion data for this chat.',
    data_deleted: 'Your companion data has been deleted.',
    silence_pause: 'I do not want to chase you. I am pausing reminders for now. Use /resume whenever you want to continue.',
    milestone: 'day milestone.',
    promise: 'Your commitment:',
    where_now: 'Where are you now?',
    repeat_note: 'After this check-in, it is worth returning to a repeat Leadership 360° cycle:',
    btn_done: 'Done',
    btn_partial: 'Partly',
    btn_notyet: 'Not yet',
    btn_later: 'In 2 days',
    btn_pause: 'Pause',
    unknown: 'I only track the commitments you choose. Use /status, /add, /pause, /resume or /language.',
    language_changed: 'Language changed to English.',
    start_required: 'Start with /start.'
  }
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
      return json({ ok: true, service: 'leadership-360-companion', languages: ['lt', 'en'] });
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
  if (update.callback_query) return handleCallback(update.callback_query, env);

  const message = update.message;
  if (!message?.chat?.id || !message.from) return;

  const chatId = String(message.chat.id);
  const userId = String(message.from.id);
  const text = (message.text || '').trim();

  if (text.startsWith('/start')) {
    const payload = text.split(/\s+/, 2)[1] || '';
    return startFlow(chatId, userId, message.from.language_code || null, payload, env);
  }

  if (text === '/language') return chooseLanguage(chatId, env);
  if (text === '/pause') return pause(chatId, env);
  if (text === '/resume') return resume(chatId, env);
  if (text === '/status') return status(chatId, env);
  if (text === '/add') return beginAdd(chatId, env);
  if (text === '/done') return markCurrentDone(chatId, env);
  if (text === '/delete') return deleteUser(chatId, env);

  const user = await getUser(chatId, env);
  if (!user) return sendMessage(chatId, 'Pradėkite nuo /start. / Start with /start.', env);

  if (user.awaiting === 'commitment') return saveCommitment(chatId, text, env);
  if (user.awaiting === 'blocker') return saveBlocker(chatId, text, env);

  return sendMessage(chatId, tx(langOf(user), 'unknown'), env);
}

async function startFlow(chatId, userId, telegramLanguageCode, payload, env) {
  const now = isoNow();
  const parsed = parseStartPayload(payload);
  const initialLang = parsed.lang || normalizeTelegramLanguage(telegramLanguageCode);
  const focusCodes = parsed.codes.join(',');

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
      started_at = CASE
        WHEN users.started_at IS NULL THEN excluded.started_at
        ELSE users.started_at
      END,
      updated_at = excluded.updated_at
  `).bind(chatId, userId, initialLang, focusCodes, now, now, now).run();

  if (!parsed.lang) return chooseLanguage(chatId, env);
  return askCadence(chatId, initialLang, parsed.codes, env);
}

async function chooseLanguage(chatId, env) {
  return sendMessage(
    chatId,
    'Pasirinkite kalbą / Choose language',
    env,
    {
      inline_keyboard: [[
        { text: '🇱🇹 Lietuvių', callback_data: 'lang:lt' },
        { text: '🇬🇧 English', callback_data: 'lang:en' }
      ]]
    }
  );
}

async function askCadence(chatId, lang, codes, env) {
  const focusText = codes.length
    ? `\n\n${tx(lang, 'focus_heading')}\n${codes.map((code, i) => `${i + 1}. ${focusLabel(code, lang)}`).join('\n')}`
    : '';

  return sendMessage(
    chatId,
    `${tx(lang, 'intro')}${focusText}\n\n${tx(lang, 'cadence_question')}`,
    env,
    {
      inline_keyboard: [
        [{ text: tx(lang, 'cadence_weekly'), callback_data: 'cadence:weekly' }],
        [{ text: tx(lang, 'cadence_twice'), callback_data: 'cadence:twice' }],
        [{ text: tx(lang, 'cadence_milestones'), callback_data: 'cadence:milestones' }]
      ]
    }
  );
}

async function handleCallback(query, env) {
  const chatId = String(query.message?.chat?.id || '');
  if (!chatId) return;

  await answerCallback(query.id, env);
  const data = query.data || '';

  if (data.startsWith('lang:')) {
    const lang = data.split(':')[1] === 'lt' ? 'lt' : 'en';
    await env.DB.prepare(`UPDATE users SET language_code = ?, updated_at = ? WHERE chat_id = ?`)
      .bind(lang, isoNow(), chatId).run();
    const user = await getUser(chatId, env);
    if (!user) return sendMessage(chatId, tx(lang, 'start_required'), env);
    const codes = (user.focus_codes || '').split(',').filter(Boolean);
    return askCadence(chatId, lang, codes, env);
  }

  if (data.startsWith('cadence:')) {
    const cadence = data.split(':')[1];
    if (![...Object.keys(CADENCE_MS), 'milestones'].includes(cadence)) return;

    const user = await getUser(chatId, env);
    if (!user) return sendMessage(chatId, 'Pradėkite nuo /start. / Start with /start.', env);
    const lang = langOf(user);
    const nextDue = nextDueAt({ ...user, cadence });

    await env.DB.prepare(`
      UPDATE users
      SET cadence = ?, status = 'active', awaiting = 'commitment', next_due_at = ?, updated_at = ?
      WHERE chat_id = ?
    `).bind(cadence, nextDue, isoNow(), chatId).run();

    return sendMessage(chatId, tx(lang, 'enter_commitment'), env);
  }

  if (data.startsWith('check:')) {
    const result = data.split(':')[1];
    return handleCheckinResult(chatId, result, env);
  }
}

async function saveCommitment(chatId, text, env) {
  const user = await getUser(chatId, env);
  const lang = langOf(user);
  if (!text || text.length < 3) return sendMessage(chatId, tx(lang, 'commitment_short'), env);

  const countRow = await env.DB.prepare(`
    SELECT COUNT(*) AS n FROM commitments WHERE chat_id = ? AND status = 'active'
  `).bind(chatId).first();

  if ((countRow?.n || 0) >= 3) {
    await env.DB.prepare(`UPDATE users SET awaiting = NULL, updated_at = ? WHERE chat_id = ?`)
      .bind(isoNow(), chatId).run();
    return sendMessage(chatId, tx(lang, 'commitment_limit'), env);
  }

  await env.DB.prepare(`
    INSERT INTO commitments (chat_id, text, status, created_at)
    VALUES (?, ?, 'active', ?)
  `).bind(chatId, text.slice(0, 500), isoNow()).run();

  await env.DB.prepare(`UPDATE users SET awaiting = NULL, status = 'active', updated_at = ? WHERE chat_id = ?`)
    .bind(isoNow(), chatId).run();

  return sendMessage(chatId, tx(lang, 'commitment_saved'), env);
}

async function beginAdd(chatId, env) {
  const user = await getUser(chatId, env);
  if (!user) return sendMessage(chatId, 'Pradėkite nuo /start. / Start with /start.', env);
  const lang = langOf(user);

  await env.DB.prepare(`UPDATE users SET awaiting = 'commitment', updated_at = ? WHERE chat_id = ?`)
    .bind(isoNow(), chatId).run();

  return sendMessage(chatId, tx(lang, 'add_commitment'), env);
}

async function handleCheckinResult(chatId, result, env) {
  if (result === 'pause') return pause(chatId, env);

  const user = await getUser(chatId, env);
  const lang = langOf(user);
  const commitment = await currentCommitment(chatId, env);
  if (!commitment) return sendMessage(chatId, tx(lang, 'no_active'), env);

  if (result === 'done') {
    await recordCheckin(chatId, commitment.id, 'done', null, env);
    await reschedule(chatId, env);
    return sendMessage(chatId, tx(lang, 'done_logged'), env);
  }

  if (result === 'partial' || result === 'notyet') {
    await recordCheckin(chatId, commitment.id, result, null, env);
    await reschedule(chatId, env);
    await env.DB.prepare(`UPDATE users SET awaiting = 'blocker', updated_at = ? WHERE chat_id = ?`)
      .bind(isoNow(), chatId).run();
    return sendMessage(chatId, tx(lang, 'blocker_prompt'), env);
  }

  if (result === 'later') {
    const nextDue = new Date(Date.now() + 2 * DAY_MS).toISOString();
    await recordCheckin(chatId, commitment.id, 'later', null, env);
    await env.DB.prepare(`
      UPDATE users
      SET status = 'active', awaiting = NULL, next_due_at = ?, updated_at = ?
      WHERE chat_id = ?
    `).bind(nextDue, isoNow(), chatId).run();
    return sendMessage(chatId, tx(lang, 'later'), env);
  }
}

async function saveBlocker(chatId, text, env) {
  const user = await getUser(chatId, env);
  const lang = langOf(user);
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

  return sendMessage(chatId, note ? tx(lang, 'blocker_saved') : tx(lang, 'blocker_skipped'), env);
}

async function status(chatId, env) {
  const user = await getUser(chatId, env);
  if (!user) return sendMessage(chatId, 'Pradėkite nuo /start. / Start with /start.', env);
  const lang = langOf(user);

  const commitments = await env.DB.prepare(`
    SELECT id, text, status, created_at FROM commitments
    WHERE chat_id = ? AND status = 'active'
    ORDER BY id ASC
  `).bind(chatId).all();

  const codes = (user.focus_codes || '').split(',').filter(Boolean);
  const focusText = codes.length ? codes.map(code => focusLabel(code, lang)).join(', ') : tx(lang, 'not_passed');
  const active = commitments.results || [];
  const next = user.status === 'paused'
    ? tx(lang, 'paused')
    : user.status === 'waiting'
      ? tx(lang, 'waiting')
      : compactDate(user.next_due_at, lang);

  const body = [
    `${tx(lang, 'focus')}: ${focusText}`,
    `${tx(lang, 'cadence')}: ${cadenceLabel(user.cadence, lang)}`,
    `${tx(lang, 'next_checkin')}: ${next}`,
    '',
    active.length ? tx(lang, 'active_commitments') : tx(lang, 'no_commitments'),
    ...active.map((commitment, i) => `${i + 1}. ${commitment.text}`)
  ].join('\n');

  return sendMessage(chatId, body, env);
}

async function pause(chatId, env) {
  const user = await getUser(chatId, env);
  if (!user) return sendMessage(chatId, 'Pradėkite nuo /start. / Start with /start.', env);
  const lang = langOf(user);

  await env.DB.prepare(`
    UPDATE users
    SET status = 'paused', next_due_at = NULL, awaiting = NULL, updated_at = ?
    WHERE chat_id = ?
  `).bind(isoNow(), chatId).run();
  return sendMessage(chatId, tx(lang, 'pause_on'), env);
}

async function resume(chatId, env) {
  const user = await getUser(chatId, env);
  if (!user) return sendMessage(chatId, 'Pradėkite nuo /start. / Start with /start.', env);
  const lang = langOf(user);

  const nextDue = nextDueAt(user);
  if (!nextDue && user.cadence === 'milestones') {
    return sendMessage(chatId, tx(lang, 'cycle_finished'), env);
  }

  await env.DB.prepare(`
    UPDATE users
    SET status = 'active', awaiting = NULL, next_due_at = ?, updated_at = ?
    WHERE chat_id = ?
  `).bind(nextDue, isoNow(), chatId).run();
  return sendMessage(chatId, tx(lang, 'resumed'), env);
}

async function markCurrentDone(chatId, env) {
  const user = await getUser(chatId, env);
  const lang = langOf(user);
  const commitment = await currentCommitment(chatId, env);
  if (!commitment) return sendMessage(chatId, tx(lang, 'no_active'), env);

  await env.DB.prepare(`
    UPDATE commitments SET status = 'completed', completed_at = ? WHERE id = ?
  `).bind(isoNow(), commitment.id).run();
  await recordCheckin(chatId, commitment.id, 'completed', null, env);

  return sendMessage(
    chatId,
    `${tx(lang, 'completed')}: ${commitment.text}\n${tx(lang, 'add_after_completed')}`,
    env
  );
}

async function deleteUser(chatId, env) {
  const user = await getUser(chatId, env);
  if (!user) return sendMessage(chatId, 'Companion duomenų nėra. / No companion data found.', env);
  const lang = langOf(user);

  await env.DB.batch([
    env.DB.prepare(`DELETE FROM checkins WHERE chat_id = ?`).bind(chatId),
    env.DB.prepare(`DELETE FROM commitments WHERE chat_id = ?`).bind(chatId),
    env.DB.prepare(`DELETE FROM users WHERE chat_id = ?`).bind(chatId)
  ]);
  return sendMessage(chatId, tx(lang, 'data_deleted'), env);
}

async function sendDueCheckins(env) {
  const now = isoNow();
  const due = await env.DB.prepare(`
    SELECT chat_id, cadence, started_at, focus_codes, language_code, status, next_due_at
    FROM users
    WHERE status IN ('active','waiting')
      AND next_due_at IS NOT NULL
      AND next_due_at <= ?
    ORDER BY next_due_at ASC
    LIMIT 100
  `).bind(now).all();

  for (const user of due.results || []) {
    const lang = langOf(user);

    if (user.status === 'waiting') {
      await sendMessage(user.chat_id, tx(lang, 'silence_pause'), env);
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
    const prefix = milestone ? `${milestone} ${tx(lang, 'milestone')} ` : '';
    const repeatNote = milestone === 90
      ? `\n\n${tx(lang, 'repeat_note')} https://omesg360.eu/leadership-360/`
      : '';

    await sendMessage(
      user.chat_id,
      `${prefix}${tx(lang, 'promise')}\n“${commitment.text}”\n\n${tx(lang, 'where_now')}${repeatNote}`,
      env,
      {
        inline_keyboard: [
          [
            { text: tx(lang, 'btn_done'), callback_data: 'check:done' },
            { text: tx(lang, 'btn_partial'), callback_data: 'check:partial' }
          ],
          [
            { text: tx(lang, 'btn_notyet'), callback_data: 'check:notyet' },
            { text: tx(lang, 'btn_later'), callback_data: 'check:later' }
          ],
          [{ text: tx(lang, 'btn_pause'), callback_data: 'check:pause' }]
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

function parseStartPayload(payload) {
  if (!payload) return { lang: null, codes: [] };
  const parts = payload.split('_').filter(Boolean);
  let lang = null;

  if (parts[0] === 'lt' || parts[0] === 'en') lang = parts.shift();
  if (parts[0] === 'p') parts.shift();

  const codes = parts
    .filter(code => Object.prototype.hasOwnProperty.call(FOCUS, code))
    .slice(0, 3);

  return { lang, codes };
}

function milestoneNumber(startedAt) {
  if (!startedAt) return null;
  const days = Math.floor((Date.now() - new Date(startedAt).getTime()) / DAY_MS);
  if (days >= 88 && days <= 97) return 90;
  if (days >= 58 && days <= 67) return 60;
  if (days >= 28 && days <= 37) return 30;
  return null;
}

function normalizeTelegramLanguage(languageCode) {
  return String(languageCode || '').toLowerCase().startsWith('lt') ? 'lt' : 'en';
}

function langOf(user) {
  return user?.language_code === 'lt' ? 'lt' : 'en';
}

function tx(lang, key) {
  return TEXT[lang]?.[key] || TEXT.en[key] || key;
}

function focusLabel(code, lang) {
  return FOCUS[code]?.[lang] || FOCUS[code]?.en || code;
}

function cadenceLabel(cadence, lang) {
  if (cadence === 'twice') return tx(lang, 'cadence_twice');
  if (cadence === 'milestones') return tx(lang, 'cadence_milestones');
  return tx(lang, 'cadence_weekly');
}

function compactDate(value, lang) {
  if (!value) return tx(lang, 'not_set');
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

  if (!res.ok) console.error('Telegram sendMessage failed', res.status, await res.text());
  return res;
}

async function answerCallback(callbackQueryId, env) {
  if (!callbackQueryId) return;
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId })
  });
  if (!res.ok) console.error('Telegram answerCallbackQuery failed', res.status, await res.text());
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
