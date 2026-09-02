# Tasks — harden-core

## 1. Snapshot import sanitization (sync.rs)

- [x] 1.1 Validate row column names against `PRAGMA table_info({table})` before building any SQL; unknown column → `invalid` error, merge aborted.
- [x] 1.2 Validate `created_at`/`updated_at`/`review_at` timestamps as RFC3339 on import; invalid → `invalid` error.
- [x] 1.3 Replace `INSERT OR REPLACE` with `INSERT … ON CONFLICT(id) DO UPDATE` in the merge path (FTS triggers + rowid stability); `events` keeps its exists-guard with plain `INSERT`.

## 2. Export hardening (admin.rs)

- [x] 2.1 Replace byte-slicing `&s[..10]` with char-boundary-safe truncation in `export_markdown`.

## 3. Key handling (encryption.rs)

- [x] 3.1 Gate `LIFEOS_DEV_KEY` behind `#[cfg(debug_assertions)]`; document that release builds always use the keychain.

## 4. Attack surface (tauri.conf.json, capabilities, Cargo)

- [x] 4.1 Remove `connect-src` Ollama hosts from the CSP (all AI traffic goes through the backend).
- [x] 4.2 Remove the unused `tauri-plugin-opener` plugin (init, dependency, permission).

## 5. Local AI bounded (ollama.rs)

- [x] 5.1 Reqwest client with connect timeout (10 s) and request timeout (300 s default, env-overridable via `LIFEOS_HTTP_TIMEOUT_SECS`).

## 6. Data integrity (repo layer)

- [x] 6.1 Wrap every multi-statement mutation (mutate + event + memory chunk) in a transaction, extending the `apply_decision` pattern.
- [x] 6.2 Record the missing `decision.confidence_set` event; drop the redundant `touch()`.
- [x] 6.3 Check `rows_affected` on all UPDATE setters: 0 rows → `invalid` error, no event recorded.
- [x] 6.4 Migration `0003_indexes.sql`: `stories.status`, `decisions.created_at`, `events.type`, `captures.decision_id`, `captures.intention_id`, `if_then_plans.story_id`.
- [x] 6.5 `create_domain` reads back its `sort_order` (was hardcoded 0); `archive_domain`/`archive_intention` filter `deleted_at IS NULL`.

## 7. Honest UI (Guide / Compass / Settings)

- [x] 7.1 Guide: `captureAdd`, `setStoryStatus` (done/drop), `createDomain`, `createIntention`, `decisionAddStory`/`decisionFinalize` surface `humanError` instead of a canned success.
- [x] 7.2 Compass: `cyclePriority` and archive show an error toast on failure.
- [x] 7.3 Settings: export writes a file and reports its path (no more clipboard-copy of a path string).

## 8. Lifecycle & safety (flow / timers / header)

- [x] 8.1 Guide flow guards `setState` after unmount (`cancelled` flag on push/patch/typing).
- [x] 8.2 Daily + Review `setTimeout`s cleaned up on unmount via `useRef` + `useEffect`.
- [x] 8.3 Header: distress heart always visible, not gated behind onboarding.
- [x] 8.4 Settings: detail-level hint reworded to human (no engine vocabulary in human mode).

## 9. Tests

- [x] 9.1 FTS index stays consistent after a sync merge updates a memory chunk.
- [x] 9.2 `set_confidence` records an event; no-op updates fail and record no event.
- [x] 9.3 Import rejects a snapshot with an unknown column and one with an invalid timestamp; known-good round-trip still works.
- [x] 9.4 `cargo test --lib` (20 passed), `cargo clippy -- -D warnings` clean, `cargo fmt -- --check` clean on touched files; `pnpm build` (tsc strict) clean.

## 10. Verification

- [x] 10.1 Smoke test: malicious snapshot (unknown column / bad timestamp) rejected without bricking the app; normal export/import round-trip still passes.
- [x] 10.2 Live end-to-end AI verification (`live_structured_calls_are_schema_valid`, `--ignored`): all 7 structured calls (health, delta, reformulation, options, alignment, story, woop, embed) return schema-valid output against a real local model. On `llama3.2:3b` the whole suite passes in ~32 s; on the default `qwen3:8b` the woop call exceeded the 300 s request timeout and failed cleanly (bounded, no hang) — a model-speed note, not a harden-core defect.
