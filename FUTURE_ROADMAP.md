# Leadership 360° — Future Roadmap / Backlog

Status: FROZEN after clean beta E2E PASS on 2026-08-22. Durable backlog for ideas and work explicitly discussed but intentionally not implemented now.

Last updated: 2026-08-22

## Operating rule

Leadership 360° beta is frozen after critical E2E blockers are closed. New ideas go here by default instead of being implemented immediately.

Implement now only when an item is:
- a critical bug,
- a security/privacy issue,
- or required to complete the core E2E path.

Everything else stays in this file until the project is intentionally reopened.

## Current freeze gate — PASS

Final clean C1 E2E test passed on 2026-08-22:
1. C1 was created successfully.
2. Guardian received a separate magic-link email automatically.
3. SELF and evaluator invitations were sent automatically without Guardian pressing the send button.
4. Guardian could open the administration workspace.
5. Guardian remained process-only and had no access to individual answers, comments, report, 90-day plan, or C1–C2 comparison.
6. Survey invitation links were delivered for SELF and evaluator roles.
7. Worker health showed `policy: guardian-v6`, Guardian email ready via Resend, and invitation email ready via Resend.

Observed deliverability note: the SELF invitation sent to Gmail was delivered but classified as Spam. This is treated as sender reputation/deliverability hardening, not a core functional failure.

Result: stop feature work and return focus to 2rasi / 2Pair unless a critical bug appears.

## Organization Campaign mode — future

### Goal
Support scheduled, repeatable, large-scale Leadership 360° programs for organizations without requiring each assessed leader to manually create and launch their own cycle.

### Initiation model
Individual mode:
- Assessed leader may create their own C1 and nominate Guardian/evaluators.

Organization mode:
- Organization Admin / HR defines the campaign and rules.
- Guardian reviews exceptions and launches/administers the campaign.
- Assessed leaders receive a prepared assessment rather than independently building the process.

### People Directory
Future organization-level identity directory should include at minimum:
- stable employee/person ID,
- name,
- work email,
- job title,
- department/unit,
- preferred language,
- active/inactive status.

This belongs in the Organization / Identity layer, never in the Responses database.

### Reporting structure
Store a relationship such as `manager_id` so the system can derive:
- SELF,
- direct manager / boss,
- direct reports,
- possible peers.

Do not derive historical cycles dynamically after launch. Each cycle must keep a roster snapshot.

### Rater rules
Future configurable rules may include:
- boss = direct manager,
- reports = direct reports,
- peers = employees sharing the same manager or manually selected peers,
- other = manually selected additional stakeholders,
- minimum group-size/privacy thresholds.

### Campaign entity
A campaign should eventually define:
- organization,
- assessed population,
- Guardian(s),
- C1 start date,
- deadline,
- reminder policy,
- C2 date or repeat interval,
- rater selection rules,
- language defaults,
- privacy thresholds.

### Pre-launch validation
Before mass launch, show Guardian/Admin a summary such as:
- number of assessed leaders,
- total invitations,
- people missing a manager,
- invalid/missing email addresses,
- duplicate relationships,
- groups below anonymity threshold,
- other exceptions requiring manual review.

Then allow `Launch campaign` only after review.

### Roster snapshots
At cycle launch, persist the exact roster and relationship roles used for that cycle.

Reason: if the org chart changes later, historical C1/C2 composition must not silently change.

## Roles and authorization — future

Long-term hierarchy:
`Organization → User → Assessment → Cycle → Invitation`

Potential roles:
- Organization Owner / Organization Admin,
- Guardian / HR,
- Coach,
- Read-only report viewer,
- assessed leader / participant,
- evaluator.

Rules:
- permissions are contextual per assessment/campaign,
- one person may have different roles in different assessments,
- never union all contextual roles into an omnipotent superuser,
- assessed leader must not be Guardian for the same assessment,
- Guardian is a process administrator, not a result consumer.

## Guardian workspace — future extensions

Keep Guardian operational only:
- invitation status,
- completion status,
- resend/revoke,
- deadlines/reminders,
- cycle creation/closure,
- exception handling.

Do not give Guardian access to:
- individual answers,
- free-text comments,
- leader report/results,
- 90-day development plan,
- C1–C2 comparison,
- raw response bundle,
- “preview as leader”.

## Scheduling and reminders — future

Organization mode should support:
- scheduled campaign start,
- deadline reminders,
- periodic reminder cadence,
- C2/repeat-cycle scheduling,
- notification to Guardian when a cycle becomes ready/overdue.

A queue/scheduler should handle mass sends instead of one synchronous request when scale grows.

## Email / deliverability — future hardening

Current beta transport uses Resend with `noreply@omesg360.eu`.

Known beta observation:
- Gmail delivered a SELF invitation to Spam during the final E2E test even though sending succeeded.

Future hardening:
- monitor delivery/bounce/suppression status,
- improve sender reputation,
- consider branded HTML templates,
- support transactional event logs,
- avoid duplicate sends on retries,
- add idempotency for campaign launch,
- distinguish initial invite from resend in audit log.

## Import / HRIS — future

Start simple:
- CSV/XLSX people import,
- CSV/XLSX reporting-line import,
- validation preview before commit.

Later, if justified:
- HRIS connectors/sync,
- SCIM/directory sync,
- organization SSO.

Do not build these before real organizational demand is validated.

## Organization analytics — backlog / concept proven

Aggregate organization analytics may use:
- participation/completion,
- competency-level Others means,
- Self–Others gap,
- C1→C2 trends,
- aggregated organizational signals.

Privacy rules:
- aggregate only,
- suppress small samples,
- no individual response drill-down,
- no individual free-text exposure,
- no “view as leader”.

This area is concept-proven and intentionally paused. Do not polish now.

## C2 / repeat cycle — future refinements

Current principle:
- same Guardian role persists across C1/C2,
- C2 should be easy to create from the previous roster.

Possible future refinements:
- notify Guardian when C2 is due/created,
- roster review/editor for legitimate org changes,
- controlled replacement of departed evaluators,
- scheduled repeat cadence.

Do not change historical C1 roster when preparing C2.

## SaaS / account architecture — future

Not for current beta.

Possible later architecture:
- persistent accounts,
- organization workspaces,
- role-scoped dashboards,
- PostgreSQL as long-term primary relational store,
- transactional email provider + queues,
- billing/subscription layer,
- audit logs,
- organization-level access control.

Monetization should be based primarily on organization workspace / cycles, not on selling a questionnaire by itself.

## Data separation invariant

Maintain physical/logical separation between identity/process data and response data.

Identity / organization side may know:
- who is assessed,
- who was invited,
- relationship role,
- status,
- deadlines,
- Guardian/admin context.

Response side stores:
- answers,
- comments,
- response metadata needed for aggregation.

Do not collapse these layers merely for convenience when scaling.

## Cross-project boundary

Do not use this repo as the source of truth for OMESG360 Wave1/Calibration or 2Pair runtime assets.

Leadership 360° should remain isolated from those satellites so deploys/restores cannot accidentally overwrite them.

A separate project-level roadmap should be maintained for 2rasi / 2Pair / OMESG360 infrastructure when those projects are actively resumed.

## Maintenance rule for future chats

Whenever a new idea is explicitly accepted as “later”, “backlog”, “not now”, or “after beta”, append it here before ending the work session.

When an item is implemented, mark it completed or move it to an implementation/changelog document rather than silently deleting the history.
