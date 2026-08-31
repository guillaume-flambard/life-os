# Design: add-review

## Replay is read-then-record, not a quiz
A check-in loads the active intentions and, for each, shows the marker in plain
words ("quand [situation] est arrivée, tu as [action] ?") and records a
`review_item` with an outcome and an optional learning. Outcomes are deliberately
non-punitive:

| Stored | Human façade |
|---|---|
| better | mieux que je pensais |
| as_expected | comme je voulais |
| worse | moins que j'aurais aimé |
| too_early | trop tôt pour le dire |

`too_early` is first-class (slack, NFR11). No streaks, no debt, no "failed".

## Integration resolves each delta onto the compass (FR8)
A decision is `proposed` until integrated. Integration applies each of its deltas:
- `added` → create a new intention in a chosen area (respects the compass cap; a
  cap hit is refused, same as normal adding).
- `modified` → update a chosen existing intention from the delta payload.
- `removed` → archive a chosen existing intention.

Because Epic 3 captured deltas lightly (an op + a statement, no target), the target
is resolved *at integration time*: the UI maps each delta to an area (for added) or
to an existing intention (for modified/removed). The backend takes those mappings
explicitly (`apply_decision(decision_id, resolutions)`), applies every delta, sets
each `delta.applied_at`, flips the decision to `applied`, and records events. This
mirrors OpenSpec: the delta merges into the spec at archive time, not before.

If a delta can't be resolved (e.g. `added` with no area, cap reached), the whole
apply is refused with a typed error naming the problem — nothing partial is merged.

## Tone belongs to copy, not logic
The compassionate framing lives in the UI strings and the outcome labels above;
the engine only stores neutral enums. No judgment text is generated.

## Out of scope
Memory recall of past reviews during a new decision (Epic 6); contradiction
detection (FR10); scheduling/notifications for the cadence (kept manual). No
migration.
