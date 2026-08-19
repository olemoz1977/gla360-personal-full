# Leadership 360° V2 frontend ↔ Collector contracts

Status: frozen for first Collector E2E
Date: 2026-08-19

## Invariants

1. One `assessmentId` owns all cycles for one assessment (`C1`, `C2`, ...).
2. C1 roster must contain exactly one `self` row.
3. Evaluator email is invitation metadata only. It must never be present in a response row or cycle bundle response.
4. Raw 360° answers and evaluator identities never go to OMESG360Bot.
5. Management secrets travel in the browser URL fragment (`#aid=...&key=...`), not in query parameters.
6. Evaluator invitation URLs contain only an opaque invite token.
7. `role` and scoring keys are language-neutral. UI and question text may be LT or EN.
8. Manual JSON remains fallback/recovery only; normal V2 flow is Collector-first.
9. Reflection is based only on derived C1/C2 delta and stays in browser session state; it does not call Collector or Telegram.

## UI language contract

Manager-facing V2 pages use `lt | en`.

Priority:
1. `lang` in secure management URL fragment,
2. local browser preference `leadership360_ui_lang`,
3. browser language.

Evaluator survey language is not chosen from manager UI state. It comes from that evaluator's invitation record.

## POST /api/assessments

Frontend sends:

```json
{
  "leaderName": "Example Leader",
  "projectName": "2026 C1",
  "guardianName": "Assessment Guardian",
  "guardianEmail": "guardian@example.com",
  "roster": [
    {"email":"leader@example.com","role":"self","language":"lt"},
    {"email":"boss@example.com","role":"boss","language":"en"},
    {"email":"peer1@example.com","role":"peer","language":"lt"}
  ]
}
```

Frontend validation:
- leader required,
- guardian name + valid guardian email required in pseudonymous mode,
- valid email on every roster row,
- no duplicate email in one cycle,
- exactly one SELF row (UI generates SELF separately),
- role ∈ `self|boss|peer|report|other`,
- language ∈ `lt|en`.

Expected response:

```json
{
  "ok": true,
  "assessmentId": "L360-...",
  "cycle": 1,
  "manageToken": "opaque-secret",
  "guardianMode": true,
  "invites": [
    {"row":1,"role":"self","language":"lt","url":"https://.../survey-v2.html?invite=..."}
  ]
}
```

`manageToken` is never placed in a query string. The setup page creates a guardian URL using a fragment.

## GET /api/invite/:token

Expected public survey context:

```json
{
  "ok": true,
  "completed": false,
  "assessmentId": "L360-...",
  "leaderName": "Example Leader",
  "projectName": "2026 C1",
  "role": "peer",
  "language": "en",
  "cycle": 1,
  "guardian": {"name":"Assessment Guardian","email":"guardian@example.com"}
}
```

Must NOT return evaluator email, evaluator name, invite ID, roster index or manage token.

## POST /api/invite/:token/submit

Frontend sends:

```json
{
  "answers": {"COMM_INT_1":4,"COMM_INT_2":3},
  "open": {"strengths":"...","develop":"..."},
  "bankVersion": "1.1.1-en"
}
```

Collector derives `assessmentId`, cycle, role and language from the invitation. The browser does not send evaluator identity with answers.

Expected response:

```json
{"ok":true,"receipt":"R-...","cycle":1}
```

Second submit with the same invite must return `409 already_submitted`.

## GET /api/manage/:assessmentId/cycles/:cycle/status

Requires `Authorization: Bearer <manageToken>`.

Expected response contains group counts only:

```json
{
  "ok": true,
  "assessmentId": "L360-...",
  "cycle": 1,
  "groups": [
    {"role":"peer","total":3,"completed":2,"sent":3,"opened":2}
  ]
}
```

Manager UI must not render person-level completion such as “John completed”.

## GET /api/manage/:assessmentId/cycles/:cycle/export

Requires manage token.

Expected bundle:

```json
{
  "ok": true,
  "schema": "leadership360-cycle-bundle@1",
  "assessment_id": "L360-...",
  "cycle": 1,
  "exported_at": "...",
  "responses": [
    {
      "response_id":"R-...",
      "role":"peer",
      "language":"en",
      "schema_version":"leadership360-response@3",
      "bank_version":"1.1.1-en",
      "answers":{},
      "open":{},
      "submitted_at":"..."
    }
  ]
}
```

A response object must NOT contain:
- email,
- evaluator name,
- invite token,
- invite ID,
- roster row/index.

## POST /api/manage/:assessmentId/cycles/:cycle/send

Requires manage token.

Normal success:

```json
{"ok":true,"sent":5,"failedCount":0,"failed":[]}
```

Before Email Service is configured, frontend handles `503 email_not_configured` as an infrastructure state, not a survey failure.

## POST /api/manage/:assessmentId/cycles

Requires manage token.

Current first-E2E behaviour:
- clones the previous cycle roster,
- keeps role + language + encrypted email,
- creates fresh invite tokens,
- does not copy responses.

Request:

```json
{"fromCycle":1}
```

Response returns new `cycle` and fallback invitation links.

Roster editing before C2 is a separate post-E2E enhancement; it is not silently simulated in this contract.

## DELETE /api/manage/:assessmentId

Requires manage token.

Deletes both:
- Response DB rows for the Assessment ID,
- Identity DB assessment, with cycles/invitations cascading.

Expected response:

```json
{"ok":true,"deleted":"L360-..."}
```

## Reflection session contract

`reflect-v2.html` reads only the derived `gla360_delta` object already present in `sessionStorage` after C1/C2 comparison.

It must never fetch or submit raw Collector responses.

For each regressed competency it saves:

```json
{
  "schema":"gla360-reflect@1",
  "completedAt":"2026-08-19",
  "items":[
    {
      "name":"Demonstrating Integrity",
      "cluster":"Communication",
      "delta":-0.4,
      "c1":3.8,
      "c2":3.4,
      "reflections":["...","...","...","..."],
      "cause":"plan_not_executed",
      "causeText":""
    }
  ]
}
```

Allowed cause codes remain compatible with the existing LT adaptive-plan logic:
- `circumstances`
- `plan_wrong`
- `plan_not_executed`
- `other`

The result is stored only in `sessionStorage.gla360_reflect`. Reflection is optional and is relevant when C1/C2 contains regressions.

## Anonymity presentation contract

- `boss`: normally identifiable by context.
- `peer`: warn when completed n < 3.
- `report`: warn when completed n < 3.
- `other`: warn when completed n < 2.
- Small-group free-text comments use a broader `Others` label rather than exposing a narrow role label.
- No UI makes an absolute-anonymity promise.

## LT/EN bank parity

LT and EN banks must have:
- the same 15 competencies,
- the same 75 item keys,
- the same key order,
- the same 1–5 scoring semantics.

Only user-facing text changes by language.

## E2E acceptance path

Normal path:

`setup-v2 → C1 invitations → survey-v2 submit → guardian counts → report-v2 → 90d plan → OMESG360Bot → create C2 → survey-v2 → compare-v2 → adapted plan`

Optional regression path after `compare-v2`:

`compare-v2 → reflect-v2 → adapted plan`

The old `index.html / survey.html / report.html` path remains the compatibility baseline until Collector infrastructure is deployed and this E2E passes.
