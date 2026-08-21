# Leadership 360° – 90-day plan recommendation method

Status: product heuristic for the prototype. It is **not** a psychometric score and must not be presented as a diagnosis or an objective ranking of a person.

## Product principle

The recommendation layer should nudge, not decide for the leader.

- Never force all three priorities.
- Do not rank only by the lowest `Others` score.
- Do not rank only by the largest Self-vs-Others gap.
- Recommend up to three areas using several transparent signals.
- Encourage the leader to include at least one suggested area, while keeping the visible checkbox choice authoritative.
- If the leader chooses none of the suggested areas, show a soft reflection prompt rather than blocking generation.

## Signals

### 1. Low Others rating

`Others <= 3.20`

Interpretation: the observed behaviour is relatively infrequent. This is the base 360° development signal.

### 2. Shared development signal

`Others <= 3.20` and `Self <= 3.20`

Interpretation: both the leader and observers see the area as relatively weak. A small Self-vs-Others gap does **not** make this signal unimportant.

### 3. Possible blind spot

`Self - Others >= 0.70` and `Others <= 3.80`

Interpretation: the leader sees the behaviour materially more positively than observers do. This is a cue for reflection, not proof of a blind spot.

### 4. C1 → C2 direction

- regression: `delta < -0.10`
- stalled: `-0.05 <= delta <= +0.10` when `Others <= 3.60`
- clearly improving: `delta >= +0.30`

Improvement reduces urgency when the current absolute rating is no longer low. It does not erase a still-low absolute score.

### 5. Agreement across rater groups

When at least two non-self rater groups are available and at least two of them rate the same competency `<= 3.20`, treat the signal as stronger than an equivalent weighted result driven by a single group.

This must only be used when anonymity thresholds allow the relevant group-level data to be used internally.

## Ordering

The implementation uses a transparent heuristic ordering combining:

- absolute Others level,
- shared-low signal,
- possible blind-spot gap,
- C1→C2 regression/stagnation/improvement,
- cross-group agreement when available.

The internal ordering value is an implementation heuristic only. **Do not display it as a validated score.** The UI should display the reasons (badges/signals), not a magic number.

## Evidence strength

If the current `Others` result is based on only one non-self rater group (for example one manager), the UI must explicitly say that the recommendation is directional and not a strong consensus.

With multiple eligible groups, agreement across groups may strengthen the recommendation.

## Behavioural nudge

The page should not auto-select all recommended priorities. The recommendation block should say, in substance:

> We recommend including at least one of these areas in the plan. You can choose the remaining priorities based on your work context.

If the user selects priorities but none of the data-suggested areas, show a non-blocking prompt asking them to check whether they are choosing what matters most or merely what feels most familiar/easiest.

## Missing values

`Cannot assess / not observed` is not 0 and must not enter averages, gaps, trends, or recommendation calculations.

A competency without a valid `Others` value is not eligible for automatic recommendation.
