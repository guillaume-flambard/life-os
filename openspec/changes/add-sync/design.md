# Design: add-sync

## Snapshot format
A snapshot is JSON: `{ version, generated_at, tables: { <table>: [ {row}, … ] } }`.
Rows are read generically (`SELECT *`, column names → JSON values), so the snapshot
covers every syncable table without per-table serialization code. Tables carried:
domains, intentions, decisions, decision_options, deltas, stories, if_then_plans,
reviews, review_items, memory_chunks, captures (row-LWW); events (append-only union);
settings (key-LWW). Skipped: `memory_vec` (rebuilt by backfill), `memory_fts` (kept
in sync by its triggers when `memory_chunks` rows are inserted), `_schema_migrations`
(schema is managed locally per device).

## Merge = last-write-wins per row
Because every content row has a UUID `id` and an ISO-8601 `updated_at` (which sorts
chronologically as text), the merge is convergent:
- **row-LWW** (by `id`): insert if absent; replace if the incoming `updated_at` is
  newer than the local one.
- **events** (by `id`): insert if absent — the log is append-only, so union is safe.
- **settings** (by `key`): replace if the incoming `updated_at` is newer.

The whole import runs in one transaction, so a failure leaves the local data
untouched. `INSERT OR REPLACE` rebuilds `memory_fts` via the existing triggers when
`memory_chunks` rows land. Concurrent edits to the *same* row are the only ambiguous
case and are resolved by last-write-wins; the intended one-device-at-a-time usage
converges exactly.

## Encryption (E2E)
The snapshot JSON is encrypted with `age`'s passphrase mode (scrypt +
ChaCha20-Poly1305). The passphrase is the user's; the file is portable across devices
(it does not depend on any device's keychain) and unreadable without the passphrase.
Export writes `life-os-sync-<ts>.age` to Downloads and returns the path; import takes
a file path and the passphrase.

## Front
Settings gets a "Synchroniser" section: an export (passphrase field → writes the
file, shows the path) and an import (file-path field + passphrase → merges, shows a
short summary). After importing on a new device, the user runs "refresh memory" to
rebuild embeddings.

## Out of scope
A hosted sync server, automatic/background sync, CRDTs, and real-time concurrent
editing (deferred until there is genuine concurrent-edit need). This is manual,
file-based, encrypted transfer — the doc-recommended first brick.
