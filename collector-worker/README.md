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

## Email sending

Collector code supports a native `EMAIL` binding. Email sending is intentionally disabled in `wrangler.toml` until the sending domain is onboarded in Cloudflare Email Service.

After onboarding, enable:

```toml
[[send_email]]
name = "EMAIL"
remote = true

[vars]
MAIL_FROM = "Leadership 360 <noreply@your-domain>"
PUBLIC_SURVEY_BASE = "https://olemoz1977.github.io/gla360-personal-full/survey.html"
```

Until then, assessment creation still returns tokenized survey URLs for manual E2E testing.

## Response schema

New responses are emitted/stored as `leadership360-response@3` semantics. Legacy `gla360-personal@2` import remains a frontend compatibility concern and is not removed by this worker.

## Next integration steps

1. Replace role-count fields in `index.html` with evaluator roster rows: email + role + LT/EN.
2. Save the returned `assessmentId` and `manageToken` locally for the guardian/setup session.
3. Change `survey.html` to load `/api/invite/:token` and use submit-first flow.
4. Keep JSON download as recovery/debug fallback.
5. Add guardian status page using role-level counts only.
6. Make report load a collector cycle directly, retaining manual JSON upload as fallback.
7. Add roster editing before C2, then automatic C1/C2 comparison.
8. Rewrite privacy copy before collector mode is public.
