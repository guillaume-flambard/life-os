# Design: harden-core

## Import sanitization (sync.rs)
The merger reads rows generically, so the column names come from the snapshot.
Before building any SQL we fetch the live schema once per table via
`PRAGMA table_info` and keep the column set; `sanitize_row` drops/aborts on any
key not in that set (→ `invalid`), and validates `created_at`/`updated_at`/
`review_at` with `DateTime::parse_from_rfc3339`. Unknown column or bad timestamp
aborts the whole merge (it runs in one transaction), so a hostile snapshot can
never write an arbitrary column, bypass a cap/enum check, or slip a value that
panics a later `&s[..10]`.

## Upsert instead of INSERT OR REPLACE
`INSERT OR REPLACE` deletes then reinserts, which (a) reassigns the rowid and
breaks the "higher rowid = newer" recency heuristic and (b) fires the FTS
delete-then-insert triggers, leaving `memory_fts` with orphan rows because
`recursive_triggers` is off. We use `INSERT … ON CONFLICT(id) DO UPDATE SET …`
for content tables (in-place update, triggers stay consistent) and a plain
guarded `INSERT` for `events` (append-only: insert-if-absent, never update).
LWW comparison parses both timestamps rather than string-comparing.

## Transactions (repo/mod.rs)
`with_tx` opens a transaction, runs the closure, commits on `Ok` / rolls back on
`Err`. Nested calls (e.g. `apply_decision` → `create_intention`) must not start a
second transaction, so `with_tx` checks `conn.is_autocommit()`: if already inside
one, it just runs the closure. `with_tx_rusqlite` keeps the legacy
`rusqlite::Result` signatures honest. `require_affected(n)` turns a zero-row
UPDATE into an `invalid` error so a no-op never records a phantom event.

## Dev key (encryption.rs)
`LIFEOS_DEV_KEY` is read only under `#[cfg(debug_assertions)]`; release builds
compile the branch out and always use the keychain. No env can downgrade a
shipped binary.

## Bounded AI (ollama.rs)
One shared `reqwest::Client` with `connect_timeout(10s)` and `timeout(300s)`
(overridable via `LIFEOS_HTTP_TIMEOUT_SECS`). A wedged local server now errors
instead of hanging the command.

## Honest UI (Guide / Compass / Settings)
The old pattern was `await x().catch(() => {}); say("saved ✓")` — it confirmed a
write that may have failed. Each such site becomes `try { await x(); say(ok) }
catch (e) { say(humanError(e)) }`, and where a later step depends on the id the
failed call returned, we `return` instead of continuing with a null id. Settings
export now reports the file path the backend wrote (it never returned Markdown
content, so the old "copied to clipboard" line was doubly wrong).

## Flow lifecycle (flow.tsx)
Full cancellation would fight React StrictMode (the simulated unmount/re-mount
would kill the one-shot script). We only guard against `setState` after unmount:
a `cancelled` flag set in cleanup gates `push`/`patch`/`typing` and each flow
method returns early when set. Pending `ask`/`input`/`widget` promises simply
stay parked — no timers, no listeners, no state writes — so the leak is bounded
and harmless while the unmount warning disappears.

## Façade & safety (Header / Settings)
The distress heart is moved out of the `revealed` block: reaching crisis
resources must never depend on finishing onboarding. The detail-level hint is
reworded so no engine term (spec/delta/review) appears in human mode.

## Out of scope
A repo-wide `cargo fmt` pass (would bury this security diff in ~1000 lines of
style churn — deferred to a dedicated formatting change), and reconciling the
OpenSpec CLI's expected delta header (`## ADDED Requirements`) with the repo's
documented convention (`## ADDED Requirement: <name>`) — a pre-existing,
repo-wide mismatch, not introduced here.
