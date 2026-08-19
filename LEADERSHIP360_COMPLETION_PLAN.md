# Leadership 360° completion plan

Status: architecture decision accepted; collector implementation started
Date: 2026-08-19

## Goal
Finish Leadership 360° as one coherent LT/EN product across setup, invitations, survey, response collection, reporting, 90-day plan, Telegram companion, and repeat cycle.

## Accepted product decision
Leadership 360° moves from a strict no-server model to a **minimal pseudonymous backend** so invitations, response collection and repeat cycles can be automated.

The manual JSON-by-email workflow becomes fallback/recovery only. Privacy wording must be rewritten before collector mode is public.

## Current state
- Public product name: Leadership 360°.
- Current public setup still asks for leader/project, evaluator counts by role, and optional guardian name/email.
- Current public survey still downloads one JSON response and instructs the evaluator to send that file to the guardian.
- Current report still requires manual upload of response JSON files.
- Current repeat-cycle comparison still requires two manually saved aggregate JSON files.
- Current privacy page still contains the old no-server promise and therefore must not be treated as final collector privacy copy.
- 90-day plan -> .ics works.
- 90-day plan -> OMESG360Bot handoff works.
- Bot UI has LT/EN support; Leadership 360° itself is still primarily LT.
- `collector-worker/` now contains the first backend implementation with separate identity and response databases.

## Target architecture

### 1. Assessment and cycles
Use a stable `assessment_id` for one leader/project and separate cycle identifiers:
- `C1` = baseline
- `C2` = repeat after ~90 days

Do not create an unrelated new assessment for C2. C1 and C2 belong to the same assessment so comparison is automatic.

### 2. Evaluator roster
Replace numeric role counts with editable evaluator rows:
- email
- role: boss / peer / report / other
- preferred language: LT / EN

SELF remains a separate explicit invitation.

The UI may still show calculated counts by role, but counts are derived from the roster rather than typed manually.

### 3. Guardian
Guardian fields:
- guardian name
- guardian email

Collector mode uses a guardian as the normal privacy path. A future direct/private mode may exist, but it must be clearly labelled as lower anonymity.

### 4. Invitations
Each evaluator gets a unique opaque invite token. The invite URL contains no evaluator email or name.

Invitation email includes:
- leader/project context
- evaluator role phrased naturally
- expected duration
- privacy summary
- survey link
- guardian contact
- language-specific copy

The leader can trigger invitations, but evaluator identity must not be embedded in response data.

### 5. Separation of identity and answers
Identity and responses are stored in **separate D1 databases**.

Identity database may contain:
- assessment_id
- cycle
- encrypted evaluator email
- role
- language
- invitation token hash
- encrypted resendable token
- sent/opened/completed status

Response database contains:
- assessment_id
- cycle
- response_id
- role
- language
- answers
- optional comments
- submitted_at

Response records must not contain evaluator email, evaluator name, invite id, or typed roster index.

### 6. Completion visibility
Leader/guardian operational view shows counts by role, e.g. `Peer 2/3`, not "Jonas completed".

Guardian may manage the invitation roster and reminders, but response content is separated from recipient identity.

This is pseudonymity/confidentiality, not a mathematically absolute anonymity guarantee. Privacy wording must say that plainly.

### 7. Anonymous-group thresholds
Keep/enforce minimum anonymity guidance:
- boss: often identifiable by nature
- peer: show role-level interpretation only if n >= 3
- report: show role-level interpretation only if n >= 3
- other: prefer n >= 2

When a group is below the threshold, merge/suppress role-specific presentation where possible and warn before report release.

Open comments need extra care because wording can identify the writer. For small groups, hide role labels or merge comments into a broader `Others` pool.

### 8. Survey submit flow
Primary flow:
1. evaluator opens tokenized link
2. survey loads context through collector
3. evaluator answers survey
4. presses `Submit`
5. response is posted to the response database
6. evaluator sees confirmation
7. guardian/leader sees only updated completion count

Fallback:
- `Download JSON` remains available for recovery/debug/manual use.

Do not make evaluators download a JSON and manually email an attachment in the normal product flow.

### 9. Guardian delivery
Do not email every raw JSON attachment to the guardian by default.

Preferred flow:
- guardian gets completion notification(s) or a digest
- guardian can open a protected cycle page
- guardian can export an anonymized response bundle if needed
- report generator can read the collected cycle directly

### 10. Report generation
Normal flow should no longer require manual drag-and-drop of many rater JSON files.

Report page loads one completed cycle by `assessment_id + cycle` and aggregates it.

Manual JSON upload remains as compatibility/fallback mode.

### 11. Cycle 2 / 90-day repeat
At or near day 90:
- guardian/leader reviews the previous roster
- can keep, remove, or add evaluators
- system sends C2 invitations
- C2 uses the same question model and role structure
- responses are collected into C2
- C1 vs C2 comparison is generated automatically

Do not require the user to manually upload two aggregate JSON files in the normal path.

### 12. OMESG360Bot role
Bot remains the 90-day execution companion, not the survey-data store.

Bot may:
- hold selected 1-3 development commitments
- remind about them
- remind the leader/guardian that C2 is due

Bot must not receive raw 360 answers or evaluator identities.

### 13. LT/EN completion
Create one bilingual product rather than parallel copies.

Must cover:
- home/setup
- invitation emails
- survey UI
- question bank
- privacy/consent copy
- report labels
- compare labels
- reflection UI
- 90-day plan UI
- plan action library
- .ics copy
- OMESG360Bot handoff copy

Response payload stores `language` but scoring keys remain language-neutral.

### 14. Data schema migration
New collector semantics use `leadership360-response@3` with at least:
- assessment_id
- cycle
- role
- language
- response_id
- answers
- open
- submitted_at

Continue reading old `gla360-personal@2` files for backward compatibility, but do not emit the old brand in new exports.

### 15. Privacy rewrite
Before enabling collector mode publicly, replace all claims that answers "never leave the browser".

New privacy copy must explain:
- what is sent
- what is not collected
- why evaluator email is separated from response content
- guardian/leader visibility
- retention period
- deletion method
- limits of anonymity for small groups and free-text comments

## Implementation status

### Completed / implemented in repo
- [x] Architecture decision accepted: minimal pseudonymous backend.
- [x] Current LT prototype kept intact as compatibility baseline.
- [x] New neutral response semantics defined: `leadership360-response@3`.
- [x] Separate identity and response D1 schemas created.
- [x] Tokenized invitation model implemented in `collector-worker`.
- [x] Collector API implemented for assessment creation, invite context, submit, role-level status and anonymized export.
- [x] Management bearer token implemented.
- [x] Evaluator emails and resendable invitation tokens encrypted with AES-GCM using a Worker secret.
- [x] C2-style later cycle creation implemented by cloning the previous roster.
- [x] Assessment deletion implemented across both databases.
- [x] Email-send endpoint implemented, gated until Cloudflare Email Service is configured.

### Next
- [ ] Configure two D1 databases and collector Worker deployment.
- [ ] Configure Cloudflare Email Service sender/binding.
- [ ] Replace role-count UI with evaluator roster + language + guardian.
- [ ] Wire setup UI to collector assessment creation.
- [ ] Change survey from download-first to submit-first, keeping JSON fallback.
- [ ] Build guardian/cycle collection view.
- [ ] Make report read a collected cycle directly.
- [ ] Add roster editing before C2 and direct C1/C2 comparison.
- [ ] Complete full LT/EN layer.
- [ ] Rewrite privacy/README to match real data flow.
- [ ] E2E test: C1 -> report -> 90d plan -> bot -> C2 -> compare.
- [ ] Only after E2E pass, migrate public URL from old `gla360-personal-full` path.

## Explicitly not doing
- No raw 360 answers in Telegram.
- No evaluator email inside response JSON/database rows.
- No response row linked by invite id or roster index.
- No leader-facing "who answered what" view.
- No cosmetic redesign until the data flow is stable.
- No deletion of legacy JSON support until old C1 data can still be imported.
