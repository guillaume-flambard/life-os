# Change: add-next-step

## Why

A decision that isn't executed produced no clarity. Every finalized decision already
yields at least one self-contained next step (FR6), but a step is far more likely to
happen when it is pre-wired to a concrete trigger — an implementation intention
("si [situation], alors [action]"), the best-evidenced behaviour mechanism in the
foundations (Gollwitzer, Oettingen's WOOP). And a step only closes the loop if the
person can come back to it and mark it done. This change enriches the next step with
an if-then plan and a light follow-through list. This is Epic 4.

## What changes

- **next-step** — a new capability:
  - Attach an if-then plan to a step: "si [situation], alors [action]", optionally
    with the WOOP frame (wish / outcome / obstacle). An optional AI assist turns a
    step into a proposed if-then the user edits.
  - Follow-through: the open next-steps across all decisions are listed on the home
    surface, each markable "fait" or "laisser". Marking done closes it; history is
    kept.

## Impact

- New capability: `next-step`.
- New code: `IfThenPlan` type; `repo/story.rs` (list open steps, set status, add and
  list if-then plans over the existing `if_then_plans` table); an Ollama WOOP
  assist; new commands; an if-then capture in the decision flow's step, and a "tes
  prochains pas" list on the home surface.
- No migration — `stories` and `if_then_plans` already exist. The AI assist is
  optional; the manual path always works (NFR3).
