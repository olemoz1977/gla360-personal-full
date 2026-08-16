# Leadership 360° Telegram Companion MVP

Status: prototype scaffold only. Not deployed.

## Purpose

This is not a support bot and not an AI coach. Its first job is much narrower:

1. remember 1-3 commitments chosen after a Leadership 360° review;
2. remind the user at a cadence they choose;
3. record simple progress and blockers;
4. surface 30/60/90-day milestones;
5. stay quiet when paused.

The MVP deliberately does not require an LLM. That keeps cost, complexity and behavioural noise low.

## Language architecture

The companion is one product and one backend with an LT/EN presentation layer.

- One Telegram bot, intended public identity: `@OMESG360Bot`.
- One Worker and one D1 database.
- One shared set of competency codes and reminder states.
- Lithuanian and English labels/messages are rendered from the same state machine.
- A generic `/start` asks the user to choose `LT | EN`.
- A localized product deep link can pass the language directly and skip the language question.
- `/language` lets the user change language later.
- Adding another language later should require copy/localization work, not a new bot or new database schema.

The final Telegram username must be confirmed in BotFather before deployment. Do not expose a public bot link until that is done.

## Product rules

- No daily reminders by default.
- The user chooses cadence during onboarding: once a week, twice a week, or milestones only.
- A check-in should be answerable in a few seconds.
- No motivational spam.
- No raw 360° responses are stored here.
- Store only what the companion needs: Telegram chat/user ID, chosen language, selected focus codes, commitments, reminder state and check-in history.
- `/pause` must immediately stop reminders. `/resume` restarts them.
- If a user ignores a check-in, the companion waits seven days, sends one short non-judgemental closing message, then auto-pauses. It does not keep chasing.
- Milestone-only mode is anchored to the original cycle start: day 30, day 60 and day 90. It does not drift just because a user answered late.

## Telegram start payload

Telegram start parameters are deliberately short and language-aware.

Examples:

- Lithuanian: `https://t.me/OMESG360Bot?start=lt_DI_ED_CSV`
- English: `https://t.me/OMESG360Bot?start=en_DI_ED_CSV`
- Legacy/dev payload without language is still understood: `p_DI_ED_CSV`; the bot then asks the user to choose LT or EN.

Supported focus codes:

| Code | English competency | Lithuanian label |
|---|---|---|
| DI | Demonstrating Integrity | Sąžiningumas ir patikimumas |
| ED | Encouraging Dialogue | Dialogo skatinimas |
| CSV | Creating Shared Vision | Bendros krypties kūrimas |
| DTS | Developing Technological Savvy | Technologinis išprusimas |
| ECS | Ensuring Customer Satisfaction | Kliento pasitenkinimas |
| MCA | Maintaining Competitive Advantage | Konkurencinis pranašumas |
| DP | Developing People | Žmonių ugdymas |
| BP | Building Partnerships | Partnerystės kūrimas |
| SL | Sharing Leadership | Lyderiavimo dalijimasis |
| APM | Achieving Personal Mastery | Asmeninis tobulėjimas |
| AO | Anticipating Opportunities | Galimybių numatymas |
| LC | Leading Change | Pokyčių valdymas |
| EP | Empowering People | Žmonių įgalinimas |
| TG | Thinking Globally | Globalus mąstymas |
| AD | Appreciating Diversity | Įvairovės vertinimas |

The current public `plan.html` still contains the old deep-link implementation, but that legacy bot card is hidden. The public handoff should only be changed after the new Worker and Telegram bot pass a real smoke test.

## User flow

### 1. Start

Generic start:

`/start`

The bot asks:

`🇱🇹 Lietuvių | 🇬🇧 English`

A localized Leadership 360° page can instead open a deep link such as:

`/start lt_DI_ED_CSV`

or

`/start en_DI_ED_CSV`

The language-aware deep link skips the language question and shows the focus areas in the chosen language.

### 2. Cadence

The user chooses one of three low-noise modes:

- once a week / 1× per savaitę;
- twice a week / 2× per savaitę;
- 30/60/90-day milestones only / tik 30/60/90 d. etapai.

### 3. First commitment

After cadence selection the bot asks for one specific commitment in the user's chosen language. More can be added later with `/add`, up to three active commitments.

### 4. Check-in

A scheduled check-in shows the current commitment and localized buttons for:

- Done / Padaryta
- Partly / Iš dalies
- Not yet / Dar ne
- In 2 days / Po 2 dienų
- Pause / Pauzė

`Partly` and `Not yet` can be followed by one short blocker note.

If the check-in is ignored, the bot does not continue indefinitely. After seven days it sends one short message explaining that reminders are being paused. The user can restart them with `/resume`.

### 5. Milestones

At roughly 30, 60 and 90 days the bot marks the milestone in the check-in. In milestone-only mode those dates are calculated from the original cycle start. At day 90 it points the user back to the repeat Leadership 360° cycle.

## Commands

- `/start` - onboarding or restart
- `/language` - switch LT/EN
- `/add` - add another commitment
- `/status` - show focus, active commitments and next check-in
- `/pause` - stop reminders
- `/resume` - resume reminders
- `/done` - mark the current commitment complete
- `/delete` - remove companion data for this Telegram chat

Commands remain the same in both languages so the backend and support documentation do not fork.

## Technical shape

- Telegram Bot API webhook for incoming updates.
- Cloudflare Worker for webhook and scheduled jobs.
- D1 for small persistent state.
- Cron Trigger runs hourly and sends only reminders that are due.
- `language_code` stores the selected product language (`lt` or `en`), not a separate database per language.
- Secrets are stored as Worker secrets, never in GitHub:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_WEBHOOK_SECRET`
- D1 binding name: `DB`.

## Files

- `src/index.js` - webhook, LT/EN localization, onboarding, check-ins and scheduler.
- `schema.sql` - D1 tables.
- `wrangler.toml` - Worker configuration template.

## Deployment checklist

1. Create/confirm the Telegram bot in BotFather. Preferred identity: `@OMESG360Bot` if available.
2. Generate a fresh bot token for deployment.
3. Create D1 database.
4. Put its `database_id` into `wrangler.toml`.
5. Apply `schema.sql`.
6. Add Worker secrets.
7. Deploy Worker.
8. Set Telegram webhook with the same secret token.
9. Smoke-test generic `/start` language choice, direct LT deep link, direct EN deep link, `/language`, cadence, one commitment, `/pause`, `/resume`, one forced due reminder, ignored-reminder auto-pause and the 30/60/90 schedule.
10. Only after that change the public Leadership 360° plan-page handoff to the new language-aware deep link.

## Not in MVP

- LLM coaching.
- Payment/subscription flow.
- Full Telegram Mini App.
- Storage of survey answers or open 360° comments.
- HR dashboards.
- Automatic judgement of whether behaviour really improved.

Those can be considered only after the low-friction reminder/progress loop proves useful.
