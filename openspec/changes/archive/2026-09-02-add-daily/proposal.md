# Change: add-daily

## Why

Phase 2 opens with a light daily surface. The weekly check-in (Epic 5) is the strong
moment; day to day the person just needs somewhere to *capture* a quick thought and,
if they feel like it, do their next small step. This is the "quotidien léger" from
the psychology chain — capture, take the small step, note — and nothing more.

The danger is turning a life into a dashboard, so this surface is designed against
that: it is optional, it never guilt-trips, there is no streak, and a day with
nothing on it is explicitly fine (NFR8–NFR13). The system should feel like it
retreats, not accumulates.

## What changes

- **daily** — a new capability:
  - Capture: a one-line freeform jot, timestamped, stored locally (screened for
    distress like every other free-text entry). Optional, no ceremony.
  - Today surface: today's captures, the open next steps (from Epic 4, markable
    fait/laisser), and a calm "nothing today? that's fine" slack line. Short,
    non-bureaucratic, no streak.

## Impact

- New capability: `daily`.
- New code: **migration `0002`** adding a `captures` table (the migration runner is
  generalized to apply an ordered list of migrations, forward-only); `repo/capture.rs`;
  a `Capture` type; capture commands; an "Aujourd'hui" surface. Export and erase are
  extended to include captures (FR15).
- Reuses Epic 4's open-steps + Epic 8's screening. The daily loop stays deliberately
  thin — it must lighten, not add weight.
