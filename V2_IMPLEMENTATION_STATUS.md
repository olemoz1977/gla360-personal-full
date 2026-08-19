# Leadership 360° V2 implementation status

Date: 2026-08-19
Status: frontend/privacy/contracts complete in repository; infrastructure E2E pending

## Completed in code

### LT / EN
- Shared manager-side language state (`v2-i18n.js`).
- Bilingual roster setup (`setup-v2.html` + `setup-v2.js`).
- Per-evaluator LT/EN survey language from invitation record (`survey-v2.html`).
- LT and EN 75-item banks with neutral scoring keys.
- Bilingual guardian/cycle management (`guardian.html`).
- Bilingual collector report (`report-v2.html`).
- Bilingual C1/C2 comparison (`compare-v2.html`).
- English 90-day plan layer (`plan-en.html`) plus language routing in `plan.html`.
- Bilingual Telegram handoff states/errors (`bot-sync.js`).
- Collector invitation email copy is LT/EN based on each roster row.

### Privacy / pseudonymity
- Separate Identity DB and Response DB schemas.
- Response DB schema has no evaluator email/name/invite-id columns.
- Invitation email/token metadata lives on the Identity side.
- Evaluator email and resendable token are designed for AES-GCM encryption in Identity DB.
- Manager secret is carried in a URL fragment, not a query string.
- Role-level completion view only; no person-level “who answered what” UI.
- Small-group warnings for peer/report/other presentation.
- Small-group free-text labels can be broadened to `Others`.
- Full Assessment deletion endpoint is exposed in guardian UI and deletes both response and identity layers.
- `PRIVACY-v2.html` truthfully describes pseudonymity, small-group/free-text limits, current beta retention state and deployment-specific controller responsibilities.
- Legacy `PRIVACY.html` remains unchanged because the current public legacy flow is still local/no-server.

### Frontend ↔ Collector contracts
- `FRONTEND_CONTRACTS_V2.md` freezes request/response shapes and forbidden identity fields.
- `collector-client.js` is the single browser API client.
- Collector middleware `collector-worker/src/entry.js` enforces exactly one SELF and no duplicate emails in C1 creation.
- Collector middleware uses a `submitting` claim to prevent concurrent double-submit of one invitation.
- Invite context is augmented with `assessmentId` without exposing evaluator identity.
- Normal survey flow is Submit-first; JSON is recovery/fallback only.
- Normal report flow reads the collected cycle directly; multi-file upload is legacy fallback only.
- C2 currently clones C1 roster with fresh invite tokens and no responses.

### Static checks staged
- `tools/validate-bilingual-bank.mjs` checks 15 competencies, 75 items, key/order parity and duplicate keys.
- `tools/validate-v2-contracts.mjs` checks key privacy/frontend invariants.
- `.github/workflows/validate-leadership360-v2.yml` is configured to run both validators on relevant changes.

## Not claimed complete yet

The following require the real Cloudflare runtime and therefore are **not** marked PASS:

- physical creation of both D1 databases,
- real D1 schema application,
- `ROSTER_KEY_HEX` secret,
- Collector Worker deployment,
- runtime one-time-submit behaviour,
- runtime delete across both DBs,
- Cloudflare Email Service sending,
- full C1 → C2 E2E,
- GitHub Actions PASS status (not observable through the current connector after workflow creation).

## First infrastructure smoke test

1. Create/bind Identity and Response D1.
2. Apply both schemas.
3. Add `ROSTER_KEY_HEX`.
4. Deploy Collector through `src/entry.js`.
5. Verify `/health`.
6. Open `setup-v2.html`, create one small C1 with manual fallback invite links.
7. Complete SELF + test evaluators through LT and EN survey links.
8. Verify guardian counts and that no person-level identity is exposed.
9. Generate `report-v2` and 90-day plan; send 1–3 commitments to OMESG360Bot.
10. Create C2, submit again and verify `compare-v2` + adapted plan.
11. Only then enable/test automatic email invitations and switch the public entry to V2.

## Deferred product decision after first E2E

C2 roster editing is intentionally not simulated yet. The first E2E clones the C1 roster exactly. After the basic chain is proven, decide whether the first public release needs a `keep / remove / add` roster editor before C2 invitations are sent.
