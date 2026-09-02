# Change: add-guided-decision

## Why

This is the heart of Life OS: a real decision, treated as a change proposal. With
the compass in place (add-compass), the user brings a decision that's on their
mind; the system guides them — one step at a time, GROW-shaped — through exploring
it, debiasing it, checking it against their compass, and producing a structured
outcome: why, what it changes (a delta on intentions), a confidence, a review
date, and at least one next small step. This is Epic 3 (FR3–FR6, NFR4, NFR17) and
completes MVP Phase 1.

The rigor stays invisible: the user sees a warm, guided conversation, not a form
labelled "change proposal / delta / QA". The engine records a proper proposal
behind the scenes.

## What changes

- **guided-decision** — a new capability:
  - Open a decision from "what's on your mind?".
  - Explore (GROW Reality) and widen options: at least three, including a "what if
    none of these?" option.
  - Debias: a pre-mortem on the leaning option, and a 10-min / 10-month / 10-year
    distance reflection.
  - Align to the compass: the leaning option is compared to intentions and reported
    in plain words ("this fits what you told me you hold to… / this pulls against…").
  - Decide: the session never ends without a valid structured outcome (NFR4) — a
    why, what changes (delta), a confidence, a review date, and ≥1 next small step.
  - Anti-sycophancy (NFR17): the assistant surfaces the counter-argument of the
    leaning option and expresses uncertainty; it never says "you should".

## Impact

- New capability: `guided-decision`.
- New code: a decision repo (session persisted incrementally across the existing
  `decisions`, `decision_options`, `deltas`, `stories` tables), AI assist paths
  (suggest options, align to values, propose a delta + story), decision Tauri
  commands, a guided flow on the home surface, and a read view in the decision log.
- No migration — the tables already exist from add-foundations. AI assists are
  optional; the structured flow works without a model (value without AI, NFR3).
