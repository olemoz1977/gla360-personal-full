# Leadership 360° Collector

Minimal pseudonymous backend for Leadership 360°.

## Privacy boundary

The collector intentionally separates evaluator identity from 360° answers:

- `IDENTITY_DB` stores assessment metadata, encrypted evaluator email, role/language, invitation token hashes and completion state.
- `RESPONSE_DB` stores assessment/cycle, role/language, answers, optional comments and timestamps.
- Response rows do **not** contain evaluator email, evaluator name, invite id or roster index.
- Invitation URLs contain only an opaque random token.
- OMESG360Bot is not used for survey answers or evaluator identity.

This is pseudonymous/confidential processing, not an absolute anonymity guarantee. Small groups and free-text comments can still make a person identifiable.

## Current API

- `GET /health`
- `POST /api/assessments` — create C1 and tokenized roster
- `GET /api/invite/:token` — load survey context
- `POST /api/invite/:token/submit` — submit one pseudonymous response
- `GET /api/manage/:assessmentId/cycles/:cycle/status` — role-level completion counts only
- `GET /api/manage/:assessmentId/cycles/:cycle/export` — anonymized response bundle
- `POST /api/manage/:assessmentId/cycles/:cycle/send` — send invitation emails when Cloudflare Email Service is configured
- `POST /api/manage/:assessmentId/cycles` — create a later cycle by cloning the prior roster
- `DELETE /api/manage/:assessmentId` — delete identity and response data for an assessment

Management endpoints use `Authorization: Bearer <manageToken>`.

## Browser integration already staged

The legacy public LT flow remains untouched while the collector path is validated.

New non-default pages/files:

- `collector-client.js` — shared browser API client. Management key stays in URL fragment, not query string.
- `setup-v2.html` — roster setup: SELF + evaluator email/role/LT-EN + guardian.
- `survey-v2.html` — tokenized submit-first survey with local JSON recovery copy.
- `guardian.html` — role-level completion dashboard, invitation trigger, anonymized export and C2 creation.
- `report-v2.html` — loads a collector cycle directly; no multi-JSON drag/drop in the normal path.
- `compare-v2.html` — loads C1/C2 directly and sends delta into the existing adaptive plan through `sessionStorage`.
- `bank/questions.en.json` — EN question bank with the same 75 neutral scoring keys as LT.
- `tools/validate-bilingual-bank.mjs` + GitHub workflow — enforces LT/EN bank parity.

The old `index.html`, `survey.html`, `report.html` and manual JSON path remain available as compatibility fallback until collector E2E passes.

## D1 setup

Create two D1 databases so identity and responses are not stored in the same database:

```bash
npx wrangler d1 create leadership-360-identity
npx wrangler d1 create leadership-360-responses
```

Put the returned IDs into `wrangler.toml`, then apply schemas:

```bash
npx wrangler d1 execute leadership-360-identity --remote --file=schema-identity.sql
npx wrangler d1 execute leadership-360-responses --remote --file=schema-responses.sql
```

## Required secret

Generate 32 random bytes and store them as 64 hexadecimal characters:

```bash
npx wrangler secret put ROSTER_KEY_HEX
```

This key encrypts evaluator email addresses and resendable invitation tokens using AES-GCM.

Do not put the key in GitHub.

## Deploy without email first

The first smoke test does not require an email provider. Assessment creation returns tokenized survey URLs which can be opened manually.

```bash
npm install
npx wrangler deploy --dry-run
npx wrangler deploy
```

Health check:

```bash
curl https://leadership-360-collector.<account-subdomain>.workers.dev/health
```

Expected:

```json
{"ok":true,"service":"Leadership 360 Collector","version":1}
```

The browser client currently expects the production worker name `leadership-360-collector`. If the Cloudflare account uses a different workers.dev subdomain, set `window.LEADERSHIP360_COLLECTOR_API` or update the default in `collector-client.js` before public activation.

## Email sending

Email sending is intentionally disabled until the sending domain is onboarded in Cloudflare Email Service.

After onboarding, add the email binding and `MAIL_FROM` to the **existing** `[vars]` table in `wrangler.toml`:

```toml
[vars]
PUBLIC_SURVEY_BASE = "https://olemoz1977.github.io/gla360-personal-full/survey-v2.html"
MAIL_FROM = "Leadership 360 <noreply@omesg360.eu>"

[[send_email]]
name = "EMAIL"
remote = true
```

Then `/cycles/:cycle/send` can send LT or EN invitation copy based on each roster row.

## Response schema

New responses use `leadership360-response@3` semantics.

Response storage contains:

- `assessment_id`
- `cycle`
- `response_id`
- `role`
- `language`
- `bank_version`
- `answers`
- optional `open`
- `submitted_at`

No evaluator email/name/invite id is stored in the response database.

Legacy `gla360-personal@2` remains a frontend compatibility format and is not deleted.

## Remaining gates before public switch

1. Create both D1 databases and replace placeholder IDs.
2. Add `ROSTER_KEY_HEX` secret.
3. Deploy worker and run manual no-email C1 smoke test.
4. Fix any collector/runtime issues found by that smoke test.
5. Onboard email sending and test LT + EN invitations.
6. Finish full LT/EN UI beyond the survey/question bank (setup, guardian, report, compare, plan and privacy copy).
7. Define and implement retention/deletion schedule.
8. Rewrite the public privacy page to match collector reality.
9. E2E: C1 -> report -> 90d plan -> OMESG360Bot -> C2 -> compare -> adaptive plan.
10. Only then switch the public entry from legacy pages to V2 and migrate the public URL.
