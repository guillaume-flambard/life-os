# Harden core — security & data-integrity fixes

## Why

A full project audit (Sept 2026) found real vulnerabilities and integrity gaps:

1. **Snapshot import builds SQL from attacker-controlled column names** (`sync.rs`).
   A malicious `.age` snapshot can write arbitrary columns, bypassing caps,
   enum checks, and event recording.
2. **Byte-slicing of timestamps panics on multi-byte UTF-8** (`admin.rs`) — and the
   timestamps are attacker-controlled via import. A panic while holding the DB
   mutex poisons it and bricks every command until restart.
3. **`LIFEOS_DEV_KEY` keychain bypass is compiled into production builds**
   (`encryption.rs`).
4. **The webview can reach Ollama directly** (CSP `connect-src`), bypassing every
   backend validation gate; the `opener` plugin is granted but never used.
5. **No HTTP timeout on the Ollama client** — a wedged local server hangs commands.
6. **Multi-step mutations are not transactional** — a crash between "mutate row"
   and "record event" leaves committed mutations without their audit event.
7. **`INSERT OR REPLACE` on the merge path breaks the FTS triggers** (no
   `recursive_triggers`) and the rowid recency heuristic.
8. **No-op mutations still record events** (zero `rows_affected` checks), and
   `set_confidence` records no event at all — both violate "every mutation
   records one event".
9. **The Guide reports success it did not achieve** — six `await x().catch(() => {})`
   sites followed by an unconditional "C'est noté" line. A failed `captureAdd` /
   `createDomain` / `decisionFinalize` tells the user their data is saved when it
   is not. Same pattern in `Compass.tsx` (priority cycle, archive) and the
   clipboard export in `Settings.tsx`.
10. **Façade leak + gated safety affordance** — the "Niveau de détail" hint names
    engine vocabulary (`spec, delta, revue`) in human mode, and the distress
    ("Besoin de parler") heart is hidden behind onboarding, so a user in crisis
    before finishing the Guide cannot reach local resources.

## What changes

- Import sanitization: columns validated against `PRAGMA table_info`, timestamps
  validated as RFC3339, upsert via `ON CONFLICT DO UPDATE` (never REPLACE).
- Boundary-safe date truncation in the Markdown export.
- Dev-key override gated to debug builds only.
- CSP tightened (no webview→Ollama lane); unused `opener` plugin removed.
- Reqwest client bounded by connect + request timeouts (env-overridable).
- Every repo mutation wrapped in a transaction with its event; no-op updates
  error out instead of recording phantom events; `set_confidence` records its
  event; new indexes migration.
- Honest UI: every Guide/Compass/Settings mutation that can fail now surfaces a
  real error (`humanError`) instead of a canned success; pending `setTimeout`s
  cleaned up on unmount; the Guide flow guards against `setState` after unmount.
- Façade + safety: the detail-level hint speaks human, and the distress heart is
  always reachable regardless of onboarding state.

## Impact

- Affected specs: `sync` (ADDED sanitization requirement), `secure-storage`
  (ADDED atomic-mutations requirement), `local-ai` (ADDED bounded-calls
  requirement), `app-shell` (ADDED honest-feedback + always-reachable-safety
  requirements). Deltas are ADDED-only because no `specs/` baseline exists yet
  (see the pending reconciliation of the OpenSpec backbone).
- UI: error toasts and honest failure copy in the Guide/Compass/Settings; the
  distress heart is now always visible. Existing snapshots produced by
  `sync_export` remain valid.
