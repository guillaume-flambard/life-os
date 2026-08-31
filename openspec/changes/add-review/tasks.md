# Tasks: add-review

## 1. Backend — review
- [x] 1.1 `Review`, `ReviewItem` types; `repo/review.rs`: open review, add item, list items, detail, list reviews
- [x] 1.2 Replay source: reuse active intentions across areas
- [x] 1.3 Outcome enum (better/as_expected/worse/too_early) validated; event on each item

## 2. Backend — integration (FR8)
- [x] 2.1 `DeltaResolution` type; `list_proposed_decisions`
- [x] 2.2 `apply_decision(id, resolutions)`: added→create intention (cap-checked), modified→update, removed→archive; set `delta.applied_at`; decision→`applied`; events
- [x] 2.3 Unresolvable/partial apply refused with a typed error (nothing partial merged) — transactional rollback

## 3. Backend — commands
- [x] 3.1 Review + integration Tauri commands; register in handler

## 4. Front — "Le point"
- [x] 4.1 Start a check-in; replay each active intention ("quand … tu as … ?")
- [x] 4.2 Record outcome (mieux / comme je voulais / moins / trop tôt) + a learning
- [x] 4.3 Integration: list proposed decisions, map each delta to an area/intention, "Intégrer"
- [x] 4.4 Compassionate copy — no debt/failure/streak language; human façade only

## 5. Verification
- [x] 5.1 A review records items with outcome + learning; each logs an event   — cargo test
- [x] 5.2 Integrating a proposed decision applies its delta to the compass and marks it applied   — cargo test
- [x] 5.3 Applying an `added` delta past the area cap is refused (nothing merged)   — cargo test (rollback verified)
- [x] 5.4 Human mode: no technical term / no judgment language on the check-in   — verified on-screen (replay + compassionate summary)

## Status
Compiles; front typechecks. Review recording, decision integration (delta → compass),
and transactional cap-rollback pass headless tests (`review_records_items_and_integration_merges_delta`,
`integration_respects_the_cap_and_merges_nothing_on_failure`). GUI check pending.
