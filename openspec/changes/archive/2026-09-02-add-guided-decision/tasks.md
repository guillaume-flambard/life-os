# Tasks: add-guided-decision

## 1. Backend — decision session
- [x] 1.1 `DecisionFull`, `DecisionOption`, `DeltaRow`, `StoryRow`, `DecisionDetail` types
- [x] 1.2 `repo/decision.rs`: open, set-reality, options (add / choose / premortem), distance, alignment, why, confidence, review-date
- [x] 1.3 Deltas add/list; stories add/list; every mutation logs an event
- [x] 1.4 `finalize`: validate (≥3 options incl null, chosen+premortem, 10/10/10, why, ≥1 story) → status `proposed`; else `incomplete`
- [x] 1.5 `get_detail` (decision + options + deltas + stories)

## 2. Backend — AI assists (optional)
- [x] 2.1 `ai/schemas/options.json`, `ai/schemas/align.json`
- [x] 2.2 `suggest_options` (always includes a null option), `align_values` (names fit AND tension), `generate_story`
- [x] 2.3 Assist prompts forbid "you should", require uncertainty + counter-argument (NFR17)
- [x] 2.4 Decision Tauri commands (session steps + assists + finalize + detail)

## 3. Front — guided flow
- [x] 3.1 Home: "quelle décision te trotte ?" opens a session
- [x] 3.2 Guided steps, one focus at a time: reality → options (≥3 incl null) → pre-mortem → 10/10/10 → alignment → why → change → next step
- [x] 3.3 Assist buttons (options / alignment / step) that pre-fill editable fields; manual always works
- [x] 3.4 "Trancher" finalizes; `incomplete` guides back to what's missing (never dead-ends)
- [x] 3.5 Decision log: list past decisions + detail (why, what changed, next step)
- [x] 3.6 Human façade only — no engine jargon

## 4. Verification
- [x] 4.1 Finalize is refused until the debiasing + a story are present (NFR4)   — cargo test
- [x] 4.2 A finalized decision persists why + delta + story + review date; each step logged an event   — cargo test
- [x] 4.3 The null option ("what if none?") is required among options   — cargo test
- [x] 4.4 Alignment note names both fit and tension when AI is available   — qwen3:8b: note named COLLE (should) AND TIRE CONTRE (must)
- [x] 4.5 Human mode: no technical term visible in the flow   — verified on-screen (8-step stepper, options step, in-app AI assist)

## Status
Compiles (commands validated by `generate_handler`); front typechecks. The
finalize gating, the required null option, and event logging pass a headless test
(`decision_finalize_requires_a_complete_debiased_outcome`). Live AI assists and the
visual jargon check need a pulled model / a GUI run.
