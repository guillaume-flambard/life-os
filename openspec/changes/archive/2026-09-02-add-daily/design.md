# Design: add-daily

## Migration 0002, runner generalized
This is the first schema change after foundations, so the migration runner moves
from a single hardcoded version to an ordered list `[(1, sql), (2, sql)]` applied
forward-only: each version runs only if it isn't already in `_schema_migrations`.
`0002_captures.sql` adds a `captures` table (id, content, kind, optional
decision/intention link, timestamps, soft-delete). Re-running remains a no-op.

## Capture is a jot, not a form
A capture is one freeform line with a `kind` (`note` by default, `reflection` for a
one-line end-of-day note). It is timestamped and stored locally; like every other
free-text entry it is screened for distress before saving, and nothing is sent
anywhere. It can optionally reference a decision or intention, but by default it is
unattached — the point is zero friction.

## The "Aujourd'hui" surface stays thin (NFR8–NFR13)
The surface shows: a capture box, today's captures, the open next steps (reused from
Epic 4, markable fait/laisser), and one calm line. There is **no streak**, no counter
of missed days, no debt language. When there is nothing to do, the copy affirms that
("rien aujourd'hui ? c'est très bien — reviens quand tu veux"). The system is meant
to feel like it retreats when things are going well, not to demand daily feeding.

## Export & erase include captures (FR15)
`export_markdown` gains a "Captures" section; `erase_all` deletes captures first
(before the decisions/intentions they may reference, so foreign keys stay satisfied).

## Out of scope
Reminders, notifications, scheduling, or any cadence enforcement (the daily surface
is pull, never push); streaks or habit tracking (explicitly unwanted); syncing
(that is a separate Phase-2 change). Captures are not embedded into memory in this
change — they are a lightweight inbox, not part of recall yet.
