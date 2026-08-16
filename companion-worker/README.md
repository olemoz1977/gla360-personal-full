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

## Product rules

- No daily reminders by default.
- The user chooses cadence during onboarding: once a week, twice a week, or milestones only.
- A check-in should be answerable in a few seconds.
- No motivational spam.
- No raw 360° responses are stored here.
- Store only what the companion needs: Telegram chat/user ID, selected focus codes, commitments, reminder state and check-in history.
- `/pause` must immediately stop reminders. `/resume` restarts them.
- If a user ignores a check-in, the companion waits seven days, sends one short non-judgemental closing message, then auto-pauses. It does not keep chasing.
- Milestone-only mode is anchored to the original cycle start: day 30, day 60 and day 90. It does not drift just because a user answered late.

## Telegram start payload

The current `plan.html` builds a `start=` value from full competency names. That is not suitable for Telegram deep links because the start parameter is limited to 64 characters and only `A-Z`, `a-z`, `0-9`, `_` and `-` are allowed.

Use short codes instead. Example:

`https://t.me/personalGLABot?start=p_DI_ED_CSV`

Supported focus codes:

| Code | Competency |
|---|---|
| DI | Demonstrating Integrity |
| ED | Encouraging Dialogue |
| CSV | Creating Shared Vision |
| DTS | Developing Technological Savvy |
| ECS | Ensuring Customer Satisfaction |
| MCA | Maintaining Competitive Advantage |
| DP | Developing People |
| BP | Building Partnerships |
| SL | Sharing Leadership |
| APM | Achieving Personal Mastery |
| AO | Anticipating Opportunities |
| LC | Leading Change |
| EP | Empowering People |
| TG | Thinking Globally |
| AD | Appreciating Diversity |

The plan-page integration can be changed later to emit these codes. The Worker already understands them.

## User flow

### 1. Start

`/start p_DI_ED_CSV`

Bot replies with the detected focus areas and asks how often it may check in:

- Once a week
- Twice a week
- Milestones only

### 2. First commitment

After cadence selection the bot asks:

`Koks vienas konkretus pažadas sau artimiausiam etapui?`

The user writes a short commitment. More can be added later with `/add`.

### 3. Check-in

A scheduled check-in shows the current commitment and buttons:

- Padaryta
- Iš dalies
- Dar ne
- Po 2 dienų
- Pauzė

`Iš dalies` and `Dar ne` can be followed by one short blocker note.

If the check-in is ignored, the bot does not continue indefinitely. After seven days it sends one short message explaining that reminders are being paused. The user can restart them with `/resume`.

### 4. Milestones

At roughly 30, 60 and 90 days the bot marks the milestone in the check-in. In milestone-only mode those dates are calculated from the original cycle start. At day 90 it points the user back to the repeat Leadership 360° cycle.

## Commands

- `/start` - onboarding or restart
- `/add` - add another commitment
- `/status` - show focus, active commitments and next check-in
- `/pause` - stop reminders
- `/resume` - resume reminders
- `/done` - mark the current commitment complete
- `/delete` - remove companion data for this Telegram chat

## Technical shape

- Telegram Bot API webhook for incoming updates.
- Cloudflare Worker for webhook and scheduled jobs.
- D1 for small persistent state.
- Cron Trigger runs hourly and sends only reminders that are due.
- Secrets are stored as Worker secrets, never in GitHub:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_WEBHOOK_SECRET`
- D1 binding name: `DB`.

## Files

- `src/index.js` - webhook, onboarding, check-ins, scheduler.
- `schema.sql` - D1 tables.
- `wrangler.toml` - Worker configuration template.

## Deployment checklist

1. Create D1 database.
2. Put its `database_id` into `wrangler.toml`.
3. Apply `schema.sql`.
4. Add Worker secrets.
5. Deploy Worker.
6. Set Telegram webhook with the same secret token.
7. Smoke-test `/start`, cadence, one commitment, `/pause`, `/resume`, one forced due reminder, ignored-reminder auto-pause, and the 30/60/90 schedule.
8. Only after that change `plan.html` from the legacy deep-link format to short focus codes.

## Not in MVP

- LLM coaching.
- Payment/subscription flow.
- Full Telegram Mini App.
- Storage of survey answers or open 360° comments.
- HR dashboards.
- Automatic judgement of whether behaviour really improved.

Those can be considered only after the low-friction reminder/progress loop proves useful.
