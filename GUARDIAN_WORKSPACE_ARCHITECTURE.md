# Leadership 360° Guardian Workspace

## Product decision

The guardian workspace is the operational centre of the Leadership 360° product.
`setup-v2.html` is a creation flow inside that workspace, not the product home screen.

The long-term commercial architecture is a multi-tenant SaaS model:

`Organization -> User -> Assessment -> Cycle -> Invitation`

The current per-assessment `manageToken` model is a prototype access mechanism only. New product work should not make it harder to replace that mechanism with organization/account authorization later.

## Current prototype layer

The current implementation keeps a registry of assessment management credentials in the guardian's browser (`guardian-workspace.js`) and presents them in `guardian-dashboard.html`.

This solves the immediate UX problem for a guardian who manages many assessments on one device:

- one workspace instead of many secret links;
- search by leader, project or Assessment ID;
- active / completed / needs-attention filters;
- completion progress;
- direct access to cycle management and reports;
- creation of a new assessment from the same workspace.

This browser registry is a bridge for the prototype. It is not the final enterprise authentication model.

## Commercial / SaaS target

For an HR guardian managing 50+ employees, the final model is organization/account based.

### Tenant model

Recommended business entities:

- `organizations`
- `users`
- `organization_memberships`
- `assessments`
- `cycles`
- `invitations`
- `subscriptions`
- `audit_events`

Every business-side record must be scoped by `organization_id` directly or through a parent object.

A signed-in user must never be able to access another organization's records by changing an Assessment ID or URL.

### Authentication and authorization

Do not build a custom password system.

Use a dedicated authentication provider supporting a progression such as:

- magic link / email sign-in for early paid plans;
- Google / Microsoft sign-in;
- later SSO / SAML for enterprise customers.

Suggested application roles:

- Organization Owner
- Guardian / HR
- Coach
- Read-only report viewer
- Participant / leader

Authorization must be enforced server-side. UI hiding is not an authorization boundary.

### Guardian identity

A guardian signs in once and belongs to one or more organizations. The workspace lists every assessment the guardian is authorized to manage.

The browser must not need to retain one permanent management token per assessment once account authentication exists.

### Workspace list

Each row represents one leader assessment and should show only operational identity data:

- leader name;
- project / cohort;
- current cycle;
- invited count;
- completed count;
- deadline;
- status (`draft`, `collecting`, `completed`, `closed`);
- whether reminders are needed.

### Invitation management

Inside one assessment the guardian may see:

- evaluator email;
- evaluator role;
- language;
- invitation state (`pending`, `sent`, `opened`, `completed`);
- resend action.

The guardian must not be able to map an evaluator identity to an individual response.

## Privacy architecture

### Identity and response separation

Identity and responses remain separate as a core product invariant.

**Identity side** may contain:

- organization and membership data;
- leader names;
- evaluator names/emails where needed;
- roles;
- invitation tokens and delivery state;
- completion state;
- deadlines and reminder state.

**Response side** may contain:

- Assessment ID;
- cycle;
- role;
- language;
- numeric answers;
- open comments;
- response timestamp;
- question-bank version;
- no evaluator email, name, account id, invitation id or roster index.

There must be no normal application path from an invitation/email record to that person's response record.

### Submission grant target

For the commercial version, prefer a short-lived submission grant between identity and response services.

Expected flow:

1. evaluator opens an opaque invitation token;
2. identity service validates invitation and role;
3. identity service issues a short-lived signed submission grant containing only assessment, cycle, role and expiry;
4. survey submits the response using that grant;
5. response service stores no evaluator identity;
6. identity service learns only that the invitation completed.

This reduces the ability of application code to correlate identity and response content even accidentally.

### Report boundary

Reports operate on pseudonymous response bundles and enforce anonymity rules server-side before role-level presentation.

Rules include:

- peer role interpretation only when the configured minimum group threshold is met;
- direct-report role interpretation only when the configured minimum group threshold is met;
- small groups merged or suppressed where required;
- open comments handled more conservatively than numeric answers;
- `Not observed / cannot assess` treated as missing observation data, not a sixth score;
- observation coverage reported alongside score averages.

Client-side JavaScript may display these rules, but it must not be the only enforcement layer in a paid product.

## Practical infrastructure direction

The existing Cloudflare architecture is suitable for the product's next phase and should not be replaced prematurely.

Recommended progression:

- Frontend: Cloudflare Pages
- API/business logic: Cloudflare Workers
- Identity/operational data now: D1
- Response data now: separate D1
- generated exports / PDFs later: R2
- background reminders / jobs: Queues
- transactional email: dedicated provider or supported Cloudflare delivery integration
- authentication: specialist identity provider
- billing: Stripe or equivalent payment provider

If organization/account data becomes substantially more complex, PostgreSQL is the preferred long-term system of record for tenant, membership, billing and operational workflow data. Response storage may remain separately isolated.

Do not migrate to PostgreSQL merely for architecture aesthetics; migrate when the account/tenant model or operational workload justifies it.

## Monetization boundary

The primary paid object is not the questionnaire itself. The commercial value is the managed workflow:

`Invitations -> confidentiality controls -> completion monitoring -> aggregation -> report -> 90-day plan -> repeat cycle -> progress comparison`

Suggested future packaging:

- Individual: one leader / limited assessment cycles
- Team: a defined annual number of assessments
- Business: organization workspace, multiple guardian users, history and repeat cycles
- Enterprise: SSO, audit log, configurable retention, DPA/security controls, branding and enterprise administration

Billing and entitlements must be organization-scoped rather than tied to individual invitation links.

## Security requirements before paid launch

Minimum non-negotiable controls:

- tenant-scoped server-side authorization;
- external authentication provider;
- separate identity and response stores;
- encrypted sensitive identity fields at rest where applicable;
- no identity fields in response rows;
- secure invitation-token lifecycle and expiration policy;
- audit log for guardian/admin actions, not raw survey answers;
- configurable retention/deletion policy;
- rate limiting and abuse controls;
- backups/recovery plan;
- server-side anonymity threshold enforcement;
- documented privacy/data-processing model;
- no secrets in public URLs as the normal long-term guardian authentication method.

## Migration path

1. **Now:** finish current C1 end-to-end flow and validate the browser guardian workspace.
2. **Next:** deadlines, reminder queue, assessment lifecycle states and workspace UX.
3. **Then:** introduce `organization_id`, account identity and organization memberships without changing response semantics.
4. **Then:** replace per-assessment browser secrets with server-authorized workspace access.
5. **Then:** add short-lived submission grants and harden report-side anonymity enforcement.
6. **Then:** billing/entitlements, audit logs, retention controls and account recovery.
7. **Enterprise:** SSO/SAML, organization policy controls, security documentation and contractual data-processing support.

## Rule for current development

Do not interrupt the current E2E test by prematurely rebuilding authentication.

However, all new work should respect these boundaries:

- do not bind response records to evaluator identities;
- do not make `manageToken` a permanent product concept;
- do not make the setup page the product home screen;
- model the guardian workspace as the future organization workspace;
- keep business identity/operational data separable from survey response data.
