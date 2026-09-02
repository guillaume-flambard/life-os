# Tasks: add-daily

## 1. Backend — migration & capture
- [x] 1.1 Generalize the migration runner to an ordered list; add `0002_captures.sql`
- [x] 1.2 `Capture` type; `repo/capture.rs`: `add_capture`, `list_recent`; event on add
- [x] 1.3 Screen capture text for distress before saving (reuse safety) — done in the command/front path
- [x] 1.4 Capture commands: `capture_add`, `captures_recent`; register

## 2. Backend — export/erase
- [x] 2.1 `export_markdown` gains a Captures section
- [x] 2.2 `erase_all` deletes captures (before decisions/intentions)

## 3. Front — "Aujourd'hui"
- [x] 3.1 New surface + nav entry; capture box (distress-screened) + "Noter"
- [x] 3.2 Today's captures list; open next steps (fait/laisser)
- [x] 3.3 Calm slack copy — no streak, no debt; a quiet day is fine

## 4. Verification
- [x] 4.1 Migration 0002 applies once; re-run is a no-op; captures table exists   — cargo test
- [x] 4.2 A capture persists and is listed; each logs an event   — cargo test
- [x] 4.3 Export includes captures; erase wipes them   — cargo test
- [x] 4.4 Live: capture a note, see it today, do a next step; empty state reads kindly   — verified on-screen: kind empty state ("rien aujourd'hui ? c'est très bien"), then a capture persisted and listed as "aujourd'hui"

## Status
Compiles; front typechecks. 15 headless tests pass, incl. migration 0002 idempotence, capture persistence with an event, and export/erase covering captures. New "Aujourd'hui" surface wired. GUI check (4.4) pending.
