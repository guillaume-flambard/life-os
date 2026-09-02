# Change: add-sync

## Why

Phase 2 needs multi-device without a server and without weakening privacy. The docs
are explicit: no sync engine at MVP — an **encrypted file** the user moves between
their own devices (AirDrop / Syncthing / Tailscale / USB). The day-one investment
(UUID + `updated_at` + append-only `events` on every row) exists precisely to make
this safe: an import can *merge* rather than overwrite, converging by last-write-wins
per row, so moving a snapshot between two devices never loses data.

End-to-end means the snapshot is encrypted with the user's passphrase and never
touches any server; only someone with the passphrase can read it.

## What changes

- **sync** — a new capability:
  - Export an encrypted snapshot (`.age`, passphrase-encrypted) of the whole data
    set to a local file the user can carry to another device.
  - Import a snapshot: decrypt with the passphrase and merge into the local data by
    last-write-wins per row (UUID + `updated_at`), with append-only `events` unioned.
    Nothing is blindly overwritten; the import reports what it applied.

## Impact

- New capability: `sync`.
- New code: `sync.rs` (generic per-table JSON snapshot + LWW merge, passphrase
  encryption via `age`); a `MergeSummary` type; `sync_export` / `sync_import`
  commands; a "Synchroniser" section in settings.
- No migration. Embeddings (`memory_vec`) are not carried in the snapshot — the
  importing device rebuilds them with "refresh memory". Merge runs in a transaction
  (atomic). Concurrent edits to the *same* row are resolved by last-write-wins; the
  single-user, one-device-at-a-time case converges exactly.
