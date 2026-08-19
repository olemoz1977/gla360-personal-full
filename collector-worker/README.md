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
- `GET /api/manage/:assessmentId/cycles/:cycle/export` — pseudonymous response bundle
- `POST /api/manage/:assessmentId/cycles/:cycle/send` — send invitation emails when Cloudflare Email Service is configured
- `POST /api/manage/:assessmentId/cycles` — create a later cycle by cloning the prior roster
- `DELETE /api/manage/:assessmentId` — delete identity and response data for an assessment

Management endpoints use `Authorization: Bearer <manageToken>`.

`src/entry.js` is the deployed entry contract. It wraps the core collector and adds:
- exactly one SELF validation,
- duplicate-email validation within one cycle,
- `assessmentId` in invite context,
- one-time submit claim using the intermediate `submitting` invitation state.

## Browser V2 integration completed in code

The legacy public LT flow remains untouched while Collector infrastructure is not deployed.

V2 files:

- `v2-i18n.js` — shared LT/EN manager-side language state.
- `collector-client.js` — shared Collector API client; management key stays in URL fragment, not query string.
- `setup-v2.html` + `setup-v2.js` — SELF + evaluator email/role/LT-EN + guardian + privacy acknowledgement.
- `survey-v2.html` — invitation-language LT/EN submit-first survey with local JSON recovery copy.
- `guardian.html` — LT/EN role-level completion dashboard, invitation trigger, export, C2 creation and full Assessment deletion.
- `report-v2.html` — LT/EN direct Collector report with small-group privacy warnings.
- `compare-v2.html` — LT/EN direct C1/C2 comparison and adaptive-plan handoff.
- `bank/questions.en.json` — English 75-item bank using the same neutral scoring keys and competency order as LT.
- `PRIVACY-v2.html` — bilingual technical privacy/pseudonymity notice matching the Collector architecture.
- `plan-en.html` — controlled English 90-day action layer on the same competency/delta logic.
- `plan.html` — language router: LT uses the existing rich plan; EN routes to `plan-en.html`.
- `bot-sync.js` — bilingual Leadership 360° → OMESG360Bot handoff; maximum 3 selected commitments.
- `FRONTEND_CONTRACTS_V2.md` — frozen first-E2E request/response and privacy invariants.
- `tools/validate-bilingual-bank.mjs` — verifies 15 competencies / 75 keys / LT-EN order parity.
- `tools/validate-v2-contracts.mjs` — static privacy/frontend contract checks.
- `.github/workflows/validate-leadership360-v2.yml` — CI hook for both validators.

The old `index.html`, `survey.html`, `report.html`, `compare.html` and `PRIVACY.html` remain the compatibility baseline until Collector E2E passes.

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

The browser client currently expects `https://leadership-360-collector.olemoz1977.workers.dev`. If deployment yields a different workers.dev hostname, update the default in `collector-client.js` before smoke testing.

## Email sending

Email sending is intentionally disabled until the sending domain is onboarded in Cloudflare Email Service.

After onboarding, add the email binding and `MAIL_FROM` to the existing variables/configuration and test both LT and EN invitation copy. Until then, manual fallback invite URLs are enough for Collector E2E.

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

Legacy `gla360-personal@2` remains a compatibility format and is not deleted.

## Remaining gates before public switch

1. Create both D1 databases and replace placeholder IDs.
2. Add `ROSTER_KEY_HEX` secret.
3. Deploy Collector Worker and verify `/health`.
4. Run no-email E2E: `setup-v2 → C1 → survey-v2 → guardian → report-v2 → 90d plan → OMESG360Bot → C2 → compare-v2`.
5. Fix any runtime issues found by that E2E.
6. Onboard email sending and test LT + EN invitations.
7. Define a production retention period and implement automatic retention/deletion if required by the deployment policy.
8. Decide whether roster editing before C2 belongs in the first public release; current first-E2E contract clones the prior roster exactly.
9. Only after E2E passes, switch public entry from legacy pages to V2 and migrate the public URL.
