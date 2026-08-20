# Leadership 360° Guardian Workspace

## Product decision

The guardian workspace is the operational centre of the Leadership 360° product.
`setup-v2.html` is a creation flow inside that workspace, not the product home screen.

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

## Enterprise target

For an HR guardian managing 50+ employees, the final model should be organization/account based.

### Guardian identity

A guardian signs in once and belongs to an organization. The workspace lists every assessment the guardian is authorized to manage.

Recommended entities:

- `organizations`
- `guardian_users`
- `organization_memberships`
- `assessments`
- `cycles`
- `invitations`

The browser should not need to retain one permanent management token per assessment once account authentication exists.

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

### Data boundary

Identity and response data remain separate.

**Identity side** may contain:

- names and emails;
- roles;
- invitations;
- delivery/open/completion state.

**Response side** may contain:

- Assessment ID;
- cycle;
- role;
- numeric answers;
- open comments;
- submission metadata that does not identify the evaluator.

There must be no normal application path from an invitation/email record to that person's response record.

### Report boundary

Reports operate on pseudonymous response bundles and apply anonymity thresholds before role-level presentation.

`Not observed / cannot assess` is missing observation data, not a sixth score. It is excluded from averages and should contribute to an observation-coverage indicator.

## Migration path

1. **Now:** browser guardian workspace for end-to-end testing and UX validation.
2. **Next:** deadlines, reminder queue, assessment lifecycle states, workspace sorting/filtering.
3. **Then:** guardian account + organization authentication.
4. **Then:** replace per-assessment browser secrets with server-authorized organization access.
5. **Then:** audit log, role permissions, account recovery and enterprise retention controls.

The prototype should preserve this migration path and avoid coupling report responses to evaluator identities.
