# Leadership 360° repository inventory

Status: 2026-08-21

This file defines which surfaces belong to the current product and which files are legacy, QA, paused or infrastructure. It exists to prevent old prototype pages from being mistaken for the current flow.

## Archive snapshot

The complete repository state before this cleanup is preserved on branch:

`archive/legacy-v1-2026-08-21`

Do not use that branch as the live product. It is a recovery/reference snapshot only.

## ACTIVE — public entry surfaces

- `index.html` — public home / route selector
- `audit.html` — 3-minute audit
- `setup-v2.html` + `setup-v2.js` — create C1
- `plan-direct.html` — standalone 90-day plan
- `README.html` — public description
- `PRIVACY-v2.html` — current privacy/pseudonymity page
- `site-nav.js`, `v2-i18n.js`, `styles.css` — shared public UI layer

## ACTIVE — assessment flow

- `survey-v2.html` — only current evaluator/SELF survey; requires a valid invite token
- `survey-recovery.js`
- `survey-enhancements-safe.js`
- `survey-self-reflection.js`
- `report-v2.html`
- `report-coverage.js`
- `report-interpretation.js`
- `report-plan-link.js`
- `report-radar-missing-style.js`
- `compare-v2.html`
- `compare-radar-safe.js`
- `reflect-v2.html`
- `plan.html` — cycle-aware 90-day plan entry
- `plan-en.html` — active EN plan implementation/data source
- `plan-core.html` — active LT plan core
- `plan-cycle.js`
- `plan-recommendation-nudge.js`
- `plan-selection-check.js`
- `plan-priority-guard.js`
- `plan-export-fixes.js`
- `plan-actions-bottom.js`
- `bot-sync.js`
- `gla-global-bridge.js`
- `app.js`
- `collector-client.js`

## ACTIVE — Guardian administration

- `guardian.html` — one assessment/cycle administration
- `guardian-dashboard.html` — Guardian administration workspace
- `guardian-nav.js`
- `guardian-workspace.js`
- `setup-created-mode.js`
- `invite-recovery.js`
- `invite-open-mode.js`
- `collector-diagnostics.js`

Guardian is an administration role only. Current Guardian UI must not expose evaluator survey URLs/tokens, response content, report, plan or C1/C2 result comparison.

## ACTIVE — data and infrastructure

- `bank/questions.json` — LT question bank
- `bank/questions.en.json` — EN question bank with matching item keys
- `collector-worker/` — identity/response collector and policy layer
- `companion-worker/` — companion/bot infrastructure
- `.github/workflows/` — validation
- `tools/` — validators/build helpers

## EXPERIMENTAL / PAUSED — keep, but not a public route

- `organization-analytics.html`
- `organization-analytics.js`
- `ORGANIZATION_ANALYTICS_ARCHITECTURE.md`
- architecture/method documents (`*_ARCHITECTURE.md`, `*_METHOD.md`, completion/status docs)

These are preserved for later product development but are not part of the current public navigation.

## QA ONLY

- `guardian-policy-check.html`
- `guardian-test-console.js`

QA tools must not be linked from normal production UX.

## LEGACY V1 — archived, not current product

The original implementations are preserved on `archive/legacy-v1-2026-08-21`.
On `main`, legacy public URLs are reduced to safe redirect/retirement stubs.

- `survey.html` → legacy offline/file-based survey
- `report.html` → legacy file-based report
- `compare.html` → legacy comparison
- `reflect.html` → legacy reflection
- `PRIVACY.html` → legacy privacy page; redirect to `PRIVACY-v2.html`

## REMOVED FROM MAIN — archived on snapshot branch

These files had no active loader/reference in the current flow and were kept only by historical iterations:

- `survey-enhancements.js` — superseded by `survey-enhancements-safe.js`
- `report-radar-safe.js` — superseded by current report radar/missing-data handling
- `bank/questions2.json` — unused alternate/legacy question bank; active banks are `questions.json` and `questions.en.json`
- `guardian-invites.js` — old per-recipient Guardian UI; conflicts with the current aggregate-only Guardian boundary and is not loaded by current Guardian pages

## Freeze rule

After this cleanup, do not rename/restructure more files simply for tidiness. Further repository changes should be limited to:

1. critical bugs,
2. security/privacy defects,
3. changes required to complete Guardian email onboarding,
4. explicitly resumed product work.
