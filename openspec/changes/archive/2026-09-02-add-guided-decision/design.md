# Design: add-guided-decision

## A structured session, GROW-shaped, persisted incrementally
The decision is a state machine, not an open chat. It advances through GROW phases
(Goal → Reality → Options → Will) as guided steps, one focus at a time. Each step
persists immediately to the existing tables, so a session survives a restart:

| Step | Stored in |
|---|---|
| The decision (Goal) | `decisions.title`, status `draft` |
| Where you are (Reality) | `decisions.emotional_context` |
| Options (≥3, incl. a null option) | `decision_options` (`is_null_option`) |
| Pre-mortem on the leaning option | `decision_options.premortem`, `chosen` |
| 10/10/10 distance | `decisions.distance_10_10_10` |
| Value alignment (plain words) | `decisions.values_alignment_note` |
| Why (final rationale) | `decisions.proposal` |
| What changes | `deltas` (ADDED/MODIFIED/REMOVED) |
| Next small step(s) | `stories` |
| Confidence, review date | `decisions.confidence`, `decisions.review_at` |

Reusing `emotional_context` for "where you are" avoids a migration; it captures the
inner state / situation, which is the GROW Reality in human terms.

## NFR4 — never end without a valid outcome
Finalizing (`finalize`) validates before flipping status `draft → proposed`. It
requires: ≥3 options including one null option, exactly one chosen option, a
pre-mortem on it, a non-empty 10/10/10 reflection, a non-empty why, and ≥1 story.
Missing pieces return `ApiError { code: "incomplete" }` listing what's left, so the
UI guides the user back rather than dead-ending. Nothing partial is ever "proposed".

## AI as optional assist, degrading cleanly (NFR3, NFR17)
Three assists, each schema-validated and never required:
- `suggest_options(context)` → option ideas, always including a "what if none?".
- `align_values(option, intentions)` → a plain-words alignment note that names both
  the fit *and* the tension (anti-sycophancy: it must surface the counter-argument).
- `generate_story(context)` / `generate_delta(situation)` → a proposed next step and
  a proposed change, which the user edits before saving.

If no model is pulled, every step is still doable by hand. The assist prompts
forbid "you should" and require expressing uncertainty and the counter-case.

## Façade
Human mode shows: "une décision qui te trotte", "où tu en es", "tes options",
"et si aucune ?", "dans un an, ça a raté — pourquoi ?", "à 10 minutes / 10 mois /
10 ans", "ce que ça change", "ton prochain petit pas". Never delta / proposal / QA.

## Out of scope
The review that later applies the delta into the compass (Epic 5 / add-review);
memory recall of past decisions during a new one (Epic 6). Deltas are recorded here
but only *applied* to intentions at review time.
