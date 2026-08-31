# Tasks: add-next-step

## 1. Backend
- [x] 1.1 `IfThenPlan` type; `repo/story.rs`: `list_open_stories`, `set_story_status`
- [x] 1.2 `add_if_then` (over `if_then_plans`), `list_if_then` for a story; events on mutation
- [x] 1.3 `Ollama::generate_woop(context)` → { wish, outcome, obstacle, cue, action }
- [x] 1.4 Commands: `list_open_stories`, `set_story_status`, `story_add_if_then`, `story_if_then`, `generate_woop`; register

## 2. Front
- [x] 2.1 Decision flow next-step: capture an if-then ("si … / alors …") on the created step
- [x] 2.2 "Propose-moi un si-alors" assist pre-fills the fields; manual always works
- [x] 2.3 Home landing: "tes prochains pas" list of open stories with fait / laisser

## 3. Verification
- [x] 3.1 An if-then plan persists on a story with cue and action; each logs an event   — cargo test
- [x] 3.2 `list_open_stories` returns only open steps; marking one done removes it from the list   — cargo test
- [ ] 3.3 Live: add a step, pre-wire an if-then, then mark it done from home   — manual (GUI)

## Status
Compiles; front typechecks. 14 headless tests pass, incl. if-then persistence with
an event and follow-through (open list drops a step marked done, record kept). GUI
check pending.
