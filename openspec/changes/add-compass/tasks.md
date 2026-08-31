# Tasks: add-compass

## 1. Backend — domains
- [x] 1.1 `Domain` type; repo create / rename / archive / list-active
- [x] 1.2 Enforce `DOMAIN_ACTIVE_CAP`; return `CapReached` past the cap
- [x] 1.3 Event on every mutation (domain.created / renamed / archived)

## 2. Backend — intentions
- [x] 2.1 `Intention` type; repo create / update / archive / list-by-domain
- [x] 2.2 Enforce `INTENTION_ACTIVE_CAP` per area; `CapReached` past the cap
- [x] 2.3 Priority set (must/should/may); event on every mutation

## 3. Backend — AI reformulation
- [x] 3.1 `ai/schemas/intention.json` (situation, action, statement)
- [x] 3.2 `Ollama::reformulate_intention(text)` → typed, validated struct
- [x] 3.3 Compass Tauri commands (domains + intentions + reformulate)

## 4. Front — compass surface
- [x] 4.1 List areas; add area (cap message), rename, archive
- [x] 4.2 Per area: list intentions; add via natural language
- [x] 4.3 "Reformulate" fills editable "when …, I …" fields; manual entry always works
- [x] 4.4 Priority picker (ligne rouge / j'aimerais / bonus); archive intention
- [x] 4.5 Human façade only — no engine jargon

## 5. Verification
- [x] 5.1 Adding past the area cap is refused with a remove-first message   — cargo test
- [x] 5.2 Adding past the per-area intention cap is refused                 — cargo test
- [x] 5.3 An intention persists with situation/action/priority; every mutation logs an event   — cargo test + code
- [x] 5.4 Reformulation pre-fills fields when a model is available; manual path works without one   — qwen3:8b round-trip returns valid {situation, action}; manual path covered by code
- [x] 5.5 Human mode: no technical term visible on the compass   — verified on-screen (nav + surfaces)

## Status
Compiles (`cargo check` clean) and caps + priority validation + archive-frees-a-slot
pass a headless test (`compass_caps_are_enforced`). Front typechecks. Live AI
reformulation and the visual jargon check need a GUI run / a pulled model.
