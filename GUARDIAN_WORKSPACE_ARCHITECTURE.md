# Leadership 360° – Role-scoped workspaces and Guardian architecture

Status: current product architecture decision.

## Core product decision

Leadership 360° must not have one omnipotent workspace.

The product has role-scoped surfaces that answer different questions:

- **Guardian administration:** what must I administer so the assessment runs correctly?
- **Assessed leader space:** what did I learn and what should I do next?
- **Organisation analytics:** is the programme being used and what patterns repeat across the organisation?
- **Evaluator:** what survey do I need to complete?

The Guardian workspace is therefore an operational administration surface, not the universal product home and not a report viewer.

The long-term commercial model remains:

`Organization -> User -> Assessment -> Cycle -> Invitation`

The current per-assessment `manageToken` is a prototype access mechanism only. It must not become the final permission model.

## Guardian is a governance role, not a job title

Guardian is assigned in the context of a specific Assessment.

The real-world person may be:

- HR / People partner;
- an organisation owner in a small company;
- another authorised manager;
- coach;
- consultant;
- an external assessment administrator.

Guardian is not defined by hierarchy. The same person may be a manager evaluator in one Assessment, a peer evaluator in another, and a Guardian in a third.

### Non-negotiable conflict rule

The assessed leader cannot be the Guardian of their own Assessment.

Recommended production rule for real multi-rater organisational 360°:

- `assessed_user_id != guardian_user_id`;
- prefer a Guardian who is not an evaluator in the same Assessment;
- if no suitable internal Guardian exists, assign an external Guardian.

A large organisation may maintain a Guardian pool and assign a different Guardian per Assessment.

## Role resolution

Do not model permissions as:

`User -> permanent role -> permissions`

Use:

`User -> Organization -> Assessment -> role assignment -> permissions`

Example:

```text
Jonas
Assessment A -> Guardian
Assessment B -> Peer evaluator
Assessment C -> Assessed leader
Assessment D -> Manager evaluator
```

The same account may hold multiple roles across the organisation, but permissions are evaluated in the active role and Assessment context. Permissions do not merge into a superuser view.

## Guardian permission boundary

Guardian may administer:

- assessment/cycle identity and operational metadata;
- evaluator roster where required;
- evaluator email;
- evaluator relationship/role;
- invitation language;
- invitation state (`pending`, `sent`, `opened`, `completed`, `revoked`);
- deadlines;
- reminders / resend;
- cycle creation;
- operational completion counts.

Guardian must not receive access merely because they administer the process to:

- individual survey answers;
- open comments;
- response bundles;
- report contents;
- the assessed leader's report page;
- 90-day plan;
- reflection flow;
- C1–C2 result comparison;
- “view as assessed leader” capability;
- evaluator invitation secrets / survey URLs in normal product mode.

Product principle:

> The person who administers the 360° process does not automatically get to read what they administer.

## Assessed leader space

The assessed leader receives a separate role-scoped area containing their own authorised outputs, for example:

- current report;
- interpretation;
- reflection where needed;
- selected development priorities;
- 90-day plan;
- C1–C2 comparison;
- progress history.

This area is not reachable because a user has Guardian permission.

## Evaluator experience

Evaluator is usually a one-time participation role, not a workspace role.

The evaluator receives an opaque invitation and sees only the survey they are authorised to complete.

The long-term architecture should not require every evaluator to create an account unless an enterprise customer specifically needs authenticated participation.

## Organisation analytics is a separate permission

Organisation analytics is not a Guardian permission and is not a leader report.

Example permission:

`organization_analytics_viewer`

It may be granted to authorised HR/People leadership, organisation owner, programme owner, coach or consultant.

It receives only suppressed organisation/campaign aggregates. See `ORGANIZATION_ANALYTICS_ARCHITECTURE.md`.

A Guardian does not automatically receive organisation analytics because they manage invitations.

## Organisation / campaign administration

Mass assessment introduces a level above one Guardian.

A future `Organization Admin` or `Campaign Admin` may:

- create a campaign;
- select the population of assessed leaders;
- assign Guardians from a Guardian pool;
- see aggregate programme progress;
- manage organisation settings and policy.

This still does not automatically grant access to individual leader reports or individual evaluator answers.

Destructive permissions such as deleting the entire Assessment should ultimately belong to an audited `Organization Admin / Owner` permission rather than being inherent to Guardian. The current prototype still allows Guardian deletion and records this as migration debt.

## Current prototype implementation

### Guardian administration workspace

`guardian-dashboard.html`

Current purpose:

- list locally registered Assessments;
- show active/completed/needs-attention operational status;
- show completion progress;
- open Guardian cycle administration;
- create another Assessment.

The dashboard must not contain a report button.

`guardian.html`

Current purpose:

- group-level completion status;
- refresh status;
- send/resend invitations when email delivery becomes available;
- create the next cycle;
- show privacy / access boundary;
- prototype deletion action.

It must not contain report, response-bundle export or C1–C2 comparison actions.

### Browser registry

`guardian-workspace.js` keeps a local prototype registry containing management credentials and display metadata. This is only a bridge while account authentication does not exist.

In the commercial product, the browser must not persist one permanent `manageToken` per Assessment.

## QA invitation links are not a Guardian feature

Automatic email delivery is not configured in the current prototype, so manual survey links remain necessary for E2E testing.

They are therefore isolated as an explicit QA capability:

- GitHub Pages / localhost only;
- explicit `?qa=1` mode;
- never part of normal Guardian UI;
- never enabled on production domains;
- never treated as a Guardian permission.

`guardian-test-console.js` and `invite-recovery.js` are QA helpers only.

The Worker entrypoint `collector-worker/src/policy.js` strips invitation URLs/tokens from normal management responses even on the GitHub test origin. It preserves them only for explicit QA requests from allowed test origins.

Until that Worker entrypoint is deployed, normal Guardian frontends avoid the legacy `/invites` recovery route and use the aggregate `/status` route instead.

## Privacy architecture

### Identity side

May contain:

- organisation / membership data;
- assessed leader identity;
- evaluator email and relationship;
- invitation secret/token;
- invitation delivery and completion state;
- Guardian assignment;
- deadline/reminder state.

### Response side

May contain:

- Assessment ID;
- cycle;
- evaluator relationship/role;
- language;
- numeric answers;
- open comments;
- response timestamp;
- question-bank version.

It must not contain:

- evaluator email or name;
- evaluator account ID;
- invitation ID/token;
- roster position capable of reconstructing identity.

There must be no normal application path from one identity/invitation record to that person's response row.

## Submission grant target

For the commercial version, prefer a short-lived submission grant between identity and response services:

1. evaluator opens opaque invitation token;
2. Identity service validates invitation and relationship;
3. Identity service issues short-lived grant containing only Assessment, cycle, relationship and expiry;
4. survey submits using that grant;
5. Response service stores no evaluator identity;
6. Identity service learns only that the invitation completed.

## Authentication / authorization target

Do not build a custom password system.

Use a specialist identity provider with a progression such as:

- magic link/email sign-in;
- Google/Microsoft;
- later SSO/SAML.

Possible application roles/permissions:

- Organization Owner / Admin;
- Campaign Admin;
- Guardian;
- Coach;
- Report Viewer;
- Assessed Leader;
- Organization Analytics Viewer;
- Evaluator invitation grant.

Authorization must be enforced server-side. Hiding a UI button is not an authorization boundary.

## Infrastructure direction

The current Cloudflare architecture remains appropriate for the next phase:

- frontend: Cloudflare Pages;
- API/business logic: Cloudflare Workers;
- identity/operational data now: D1;
- response data now: separate D1;
- generated exports later: R2;
- reminders/jobs: Queues;
- transactional email: dedicated provider / supported delivery integration;
- authentication: specialist identity provider;
- billing: Stripe or equivalent.

If tenant/account complexity later justifies it, PostgreSQL is the preferred system of record for organisations, memberships, billing and operational workflow. Response storage should remain separately isolated.

## Security requirements before paid launch

Non-negotiable controls:

- tenant-scoped server authorization;
- role/Assessment-context authorization;
- assessed leader cannot be own Guardian;
- separate identity and response stores;
- no identity fields in response rows;
- invitation-token lifecycle and expiration;
- no invitation secret exposure to Guardian;
- report permission separate from Guardian;
- organisation analytics permission separate from Guardian;
- server-side anonymity/suppression rules;
- audit log for admin/Guardian actions, not raw answers;
- retention/deletion policy;
- rate limiting and abuse controls;
- account recovery and backup plan;
- no permanent management secrets as the normal workspace authentication model.

## Migration path

1. **Now:** keep current C1/C2 prototype working while enforcing role-scoped UI boundaries.
2. **Now:** isolate manual invitation links behind explicit QA mode.
3. **Next:** deploy the Worker policy wrapper so normal management responses cannot expose invitation secrets on the GitHub test origin.
4. **Next:** deadlines, reminder queue, lifecycle states and safe per-recipient invitation-status endpoint.
5. **Then:** introduce `organization_id`, authenticated users and Assessment-level role assignments.
6. **Then:** split Guardian, leader report and organisation analytics authorization server-side.
7. **Then:** short-lived evaluator submission grants, audit logs, retention and billing.
8. **Enterprise:** SSO/SAML, policy controls, security documentation and contractual data-processing support.

## Current rule

Guardian is a durable product concept. `manageToken` is not.

The Guardian is an Assessment governance role whose purpose is to run the process without acquiring privileged access to the feedback itself.
