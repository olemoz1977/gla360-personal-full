# Leadership 360° – Organization Analytics Layer

Status: prototype architecture decision and working Pattern Engine boundary.

## Product purpose

The organisation analytics layer answers a different question from the individual report and from the Guardian workspace:

- **Guardian:** is the assessment process being administered correctly?
- **Assessed leader:** what does my feedback show and what should I do next?
- **Organisation analytics:** is the programme actually being used, and what patterns repeat often enough to deserve organisation-level attention?

This layer must never become a shortcut to individual responses.

## Role boundary

Organisation analytics is a separate permission, for example `organization_analytics_viewer`.

It may be granted to an HR / People leader, organisation owner, authorised coach, consultant or programme owner. It is **not** implied by being a Guardian.

The same account may hold different roles in different assessments, but permissions are evaluated in the current organisation / campaign / assessment context.

A Guardian must not receive organisation analytics merely because they administer invitations.

## Data boundary

### Identity / operational side may contribute only aggregates

Examples:

- assessments planned;
- assessments started;
- assessments completed;
- invitations planned;
- invitations sent;
- invitations opened;
- invitations completed;
- the same counts by evaluator relationship when safe;
- C2 eligible / started / completed counts.

The organisation analytics API should not need evaluator names, email addresses or invitation tokens.

### Response side may contribute only assessment-level aggregates

Examples per assessment / cycle / competency:

- Self mean;
- Others mean;
- observation coverage;
- eligible rater-group coverage;
- C1→C2 delta.

The organisation analytics layer must not receive:

- raw answers;
- response IDs;
- open comments;
- evaluator identity;
- invitation IDs or tokens;
- a mapping from one evaluator to one response.

Open comments are explicitly excluded from organisation analytics because they carry a high re-identification risk.

## Pipeline target

```text
Identity / operational store
        |
        | aggregated participation only
        v
Participation Aggregate ------------------+
                                            |
Response store                              |
        |                                   |
        | assessment-level aggregates       v
        +--> Assessment Aggregate --> Organization Pattern Engine
                                            |
                                            v
                                  Organization Analytics UI
```

The join happens at organisation / campaign aggregate level, not at evaluator-response level.

## Participation / engagement metrics

Do not reduce engagement to one opaque score. Show a transparent funnel.

### Assessment funnel

- planned assessments;
- started assessments;
- completed assessments;
- completion rate = completed / planned.

### Evaluator funnel

- planned invitations;
- sent invitations;
- opened invitations;
- completed invitations;
- invitation coverage = sent / planned;
- open rate = opened / sent;
- completion rate = completed / sent;
- follow-through = completed / opened.

### Repeat-cycle continuity

- C2 eligible;
- C2 started;
- C2 completed;
- continuity = C2 completed / C2 eligible.

The product may show a simple band (`strong`, `moderate`, `needs attention`) but the component rates remain visible and authoritative.

## Organisation pattern signals

The current engine deliberately combines several signals. It must not classify organisations from one average alone.

### Base competency measures

For each competency across current assessment cycles:

- `Others mean`;
- `Self mean`;
- `Self - Others` signed gap;
- mean absolute Self–Others gap;
- prevalence of low Others results;
- prevalence of shared-low Self + Others results;
- prevalence of possible blind-spot pattern;
- recurrence across eligible organisational segments;
- C1→C2 direction where comparable pairs exist.

### Prototype thresholds

The thresholds are directional product heuristics, not validated psychometric cut-offs.

They intentionally reuse the current individual recommendation logic where possible:

- low Others: `<= 3.20`;
- possible blind spot: `Self - Others >= 0.70` while `Others <= 3.80`;
- strong current Others level: `>= 3.75`.

Organisation-level pattern thresholds are provisional:

- minimum organisation display sample: 5 assessments;
- broad low-result prevalence: 40%+;
- stronger systemic recurrence: 50%+;
- mean absolute gap attention level: 0.50+;
- possible blind-spot prevalence attention level: 30%+;
- minimum comparable C1→C2 pairs for persistence logic: 5.

These thresholds must be calibrated with pilot data before commercial claims are made.

## Interpretation classes

### 1. Learning / development direction

Typical evidence:

- Others is broadly low across a meaningful share of assessments;
- the signal is not yet clearly systemic across segments / cycles.

Interpretation:

Targeted learning, coaching or practical development may be appropriate.

### 2. Organisation-context signal

Typical evidence:

- a low pattern is broad;
- and it repeats across at least two eligible organisational segments, or persists across C1→C2 despite individual interventions.

Interpretation:

Before defaulting to training, inspect organisational constraints, process design, leadership norms and cultural practices.

This is intentionally **not** labelled “bad culture” or “culture change required”. The 360° data is a signal for investigation, not proof of root cause.

### 3. Needs attention

Typical evidence:

- repeated Self–Others misalignment;
- emerging low Others scores;
- possible blind-spot prevalence;
- but not enough breadth or persistence for an organisation-level conclusion.

Interpretation:

Gather context and watch the next cycle.

### 4. Organisational strength

Typical evidence:

- high Others level;
- low prevalence of weak assessments;
- no large recurring Self–Others mismatch.

Interpretation:

Preserve and spread working practices.

## Why averages are not enough

A single signed Self–Others average can cancel opposite patterns. For example, +0.8 and -0.8 average to zero even though both are meaningful disagreements.

Therefore the engine tracks both:

- signed gap for direction; and
- absolute gap for disagreement magnitude.

It also uses prevalence, breadth, segment recurrence and C1→C2 persistence.

## Privacy and suppression

Current prototype guardrails:

- no organisation interpretation when fewer than 5 assessments contribute a valid Others score;
- segment-level recurrence only uses segments with at least 5 contributing assessments;
- no individual leader ranking;
- no list of “weakest leaders”;
- no raw response access;
- no open-comment aggregation;
- missing / Not observed values do not become zero;
- the UI labels the output as heuristic and directional, not diagnostic.

The final paid product should enforce suppression server-side, not only in browser JavaScript.

## Data contracts

### Assessment aggregate

Schema: `leadership360-org-assessment@1`

```json
{
  "schema": "leadership360-org-assessment@1",
  "assessment_id": "...",
  "cycle": 2,
  "segment": {
    "department": "Operations",
    "location": "Vilnius",
    "level": "Frontline manager"
  },
  "response_count": 8,
  "competencies": [
    {
      "key": "COMM_DIA",
      "name": "Encouraging Dialogue",
      "cluster": "Communication",
      "self": 3.9,
      "others": 3.1
    }
  ]
}
```

Segment fields are optional. Production segmentation must be organisation-controlled and subject to minimum group sizes.

### Participation aggregate

Schema: `leadership360-org-participation@1`

```json
{
  "schema": "leadership360-org-participation@1",
  "campaign_id": "Q4-LEADERSHIP",
  "assessments": {"planned":120,"started":108,"completed":96},
  "invitations": {"planned":864,"sent":842,"opened":718,"completed":631},
  "c2": {"eligible":96,"started":81,"completed":69},
  "by_role": {
    "boss": {"planned":120,"sent":118,"opened":110,"completed":105},
    "peer": {"planned":300,"sent":295,"opened":250,"completed":226}
  }
}
```

No identities are included.

### Organisation analytics summary

Schema: `leadership360-org-analytics@1`

Generated output contains participation metrics, competency patterns, cluster summaries and explicit guardrails. It does not contain raw responses or comments.

## Prototype implementation

Files:

- `organization-analytics.js` – pure Pattern Engine. It has no network access and no Guardian token logic.
- `organization-analytics.html` – isolated analytics lab. It can load existing aggregate report JSON files and an optional participation package, or run a clearly labelled synthetic demo.

The lab is intentionally **not linked from the Guardian workspace or the public navigation**. This avoids implying that Guardian rights include organisation analytics.

Existing `report-v2.html` can export an aggregate JSON compatible with the prototype adapter. Current report access through `manageToken` remains prototype debt and must not be treated as the future permission model.

## Production API direction

After organisation authentication exists, prefer server-authorised endpoints such as:

- `GET /api/org/:orgId/campaigns/:campaignId/analytics/participation`
- `GET /api/org/:orgId/campaigns/:campaignId/analytics/patterns`

Required permission: `organization_analytics_viewer` or equivalent.

The endpoints should return already-suppressed aggregate outputs. Browser code should not download every assessment's raw bundle and aggregate it client-side.

## Product rule

The organisation layer should help answer:

> “What repeats so consistently that we should look beyond one individual?”

It should never answer:

> “Which evaluator said this?”

or silently convert 360° feedback into a ranking / automated decision system for employees.
