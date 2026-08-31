# Design: add-foundations

## Key technical decisions

### DB owned by Rust, not tauri-plugin-sql
The database is opened and owned by the Rust backend (`rusqlite` +
`libsqlite3-sys` with the SQLCipher feature), not the front via `tauri-plugin-sql`.
Reason: we need full control over encryption at rest (NFR2), loading the
`sqlite-vec` extension, and FTS5 — none of which `tauri-plugin-sql` exposes
cleanly. The front reaches the DB only through typed `#[tauri::command]` calls.

### Encryption key handling
The SQLCipher key is derived on the device and applied via `PRAGMA key` right
after opening the connection, before any other statement. For the MVP the key is
stored in the OS keychain (via a Tauri plugin) or derived from a user passphrase;
the exact source is a `secure-storage` implementation detail, not exposed to the
front. The DB file must be unreadable without the key.

### Structured AI output (NFR4)
The AI never returns free-form JSON we trust blindly. Each structured operation
(producing a delta, a story) declares a JSON Schema in `ai/schemas/`. We use
Ollama's constrained/structured output, then validate the parsed result against
the schema in Rust. A decision session can never end without a schema-valid
output — invalid responses are retried or surfaced as an error, never persisted.

### BMAD as sequential lenses
Roles (Analyst → PM → Architect …) are distinct prompts in `ai/prompts/` run by a
single model one after another, not agents debating. This change only wires the
client and one round-trip; the role prompts land with `add-guided-decision`.

### Events & longevity
Every mutation through a repo writes an append-only row to `events` and updates
`updated_at`. Soft-delete sets `deleted_at`; rows are never physically removed by
app logic. This keeps the door open for a later sync engine (Phase 2) without a
schema break, per the PRD technical assumptions.

## Local model choice (to confirm at setup)
The docs are inconsistent ("Qwen3.5" does not exist). Target **Qwen3 8B/14B** or
**Gemma 3 12B** for conversation, **EmbeddingGemma** for embeddings (768-dim, which
sets the `memory_vec` column width). No model is pulled by this change's code; the
README documents the `ollama pull` step.

## Out of scope for this change
Compass CRUD and UI (Epic 2 / `add-compass`), decision conversation and debiasing
(Epic 3 / `add-guided-decision`), memory embedding/recall population (Epic 6),
review flow (Epic 5). The `memory_*` and review tables are created now for schema
stability but not exercised.
