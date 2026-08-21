# Leadership 360° – C2 plan adaptation method

Status: prototype decision record for the current manufacturing-context E2E.

## Principle

C1→C2 improvement is a direction signal, not proof that a competency has become a strength.

The adapted 90-day plan therefore uses both:

1. change from C1 to C2; and
2. the current C2 `Others` level.

A positive delta by itself must not move a still-low competency into maintenance mode.

## Current rule

For a competency with a comparable C1 and C2 `Others` score:

- `improved` / `mild_improved` AND current `Others >= 3.75` → **maintenance** (short plan);
- `improved` / `mild_improved` AND current `Others < 3.75` → **progressing** (full development plan, positive direction acknowledged);
- `stagnated` → retry / alternative actions;
- `regressed` → regression logic already defined by the existing reflection/cause flow.

Why 3.75 for the prototype: the response scale is behavioural frequency, where 3 = "sometimes" and 4 = "often". Maintenance should begin only when the observed behaviour is approaching "often", not merely because it improved from a lower baseline.

This threshold is provisional and should be calibrated with pilot data before monetization.

## Missing baseline in C2

If C2 has a valid current score but the same competency had no valid C1 `Others` score, the plan must not label it as "First cycle".

Use:

- **No C1 comparison – full plan**

The absence of a comparable C1 value is not evidence of improvement, deterioration, or maintenance readiness.

## Guardrail

Absolute level has priority over delta for maintenance decisions.

Example:

- C1 Others = 3.00
- C2 Others = 3.40
- delta = +0.40

This is real progress, but 3.40 is still below the prototype maintenance threshold. The correct interpretation is **progressing**, not **strength/maintenance**.

## Deferred work

Do not generalize the manufacturing wording at this stage. Cross-industry language/profile support is intentionally deferred until the pre-monetization phase.
