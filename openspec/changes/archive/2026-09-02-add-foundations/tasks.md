# Tasks: add-foundations

## 1. Repo & tooling
- [x] 1.1 Root config: `package.json`, Vite + TypeScript, `tsconfig.json`, `.gitignore`
- [x] 1.2 `LICENSE` (AGPL-3.0), `README.md`, project `CLAUDE.md` (façade/engine, anti-jargon rules)

## 2. Tauri shell
- [x] 2.1 Scaffold Tauri v2: `src-tauri/Cargo.toml`, `tauri.conf.json`, `build.rs`, `capabilities/`
- [x] 2.2 `main.rs` / `lib.rs` boot; register commands and DB state

## 3. Secure storage
- [x] 3.1 `db/encryption.rs`: key derivation + `PRAGMA key` (SQLCipher)
- [x] 3.2 Load `sqlite-vec` extension at boot; confirm FTS5 available
- [x] 3.3 `db/migrations/0001_init.sql`: full data model (13 tables)
- [x] 3.4 Forward-only migration runner + idempotence test (re-run is a no-op)
- [x] 3.5 `domain/`: Rust types for entities; `events.rs`: append-only helper
- [x] 3.6 `db/repo/`: typed CRUD with soft-delete + event emission on mutation
- [ ] 3.7 Markdown export stub  (deferred: not required to prove the engine; do in add-compass)

## 4. Local AI
- [x] 4.1 `ai/ollama.rs`: local client (OpenAI-compatible endpoint)
- [x] 4.2 `ai/schemas/`: JSON Schema for delta + story
- [x] 4.3 One end-to-end round-trip returning schema-valid JSON (NFR4); invalid → retry/error, never persisted
        (code path done + typed validation; live round-trip pending a pulled model — see 7.5)

## 5. Commands & front
- [x] 5.1 `commands/`: health (DB), health (AI), get/set settings
- [x] 5.2 `src/` shells for the 5 routes (home, compass, decision log, check-in, settings)
- [x] 5.3 `lib/ipc.ts` typed wrappers over `invoke`
- [x] 5.4 Human/expert mode toggle, persisted in `settings`; human mode shows no technical terms

## 6. Setup docs
- [x] 6.1 README: `ollama pull` step for chosen models (Qwen3 / Gemma 3 + EmbeddingGemma)

## 7. Verification
- [x] 7.1 App starts on macOS Apple Silicon (`npm run tauri dev`)   — runs, no panic (PID confirmed)
- [x] 7.2 DB file unreadable without key (SQLCipher at rest)        — header is random bytes, not "SQLite format 3"
- [x] 7.3 `0001_init` re-run twice with no error (idempotent, forward-only)   — cargo test
- [x] 7.4 `sqlite-vec` loaded + FTS5 table created at boot                    — cargo test
- [ ] 7.5 An AI command returns delta-schema-valid JSON            — manual (needs `ollama pull`)
- [x] 7.6 Every mutation writes an `events` row; soft-delete leaves the row present   — cargo test
- [x] 7.7 Human mode: no technical term (spec/delta/QA) visible in the UI      — verified on-screen in bundled app

## Status
Engine compiles (`cargo check` clean) and the storage guarantees (idempotent
migration, vec+FTS, append-only events, soft-delete) pass a headless test.
Remaining boxes need a GUI run / a pulled Ollama model — see README setup.
