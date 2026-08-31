# Change: add-safety

## Why

Life OS touches wellbeing, so its guardrails are first-order, not an afterthought.
This change makes the non-negotiable safety posture real: the product says plainly
it is not a therapist; when it detects signs of real distress it steps out of the
coaching flow and shows local crisis resources — without ever sending that text
anywhere; on high-stakes choices (health / money / legal) it helps structure but
points to a human professional; and the user can export all their data in an open
format and erase everything. This is Epic 8 (NFR14–NFR16, FR15; Story 8.2 distress,
plus the export/erase half of FR15). Story 8.1 caps and Story 8.3 two modes already
shipped in earlier changes.

## What changes

- **safety** — a new capability:
  - Distress screening: a *local* detector scans free text the user enters; on a
    crisis signal the flow yields to a calm resources screen (France 3114, SOS
    Amitié, emergency 112, Find A Helpline for other countries). Detection runs
    on-device with no model and no network — the text is never exfiltrated (NFR15).
  - "Not a therapist" disclaimer visible in the app (NFR14).
  - High-stakes notice: money/health/legal decisions get a gentle "a human
    professional is precious here" note; it structures, never decides (NFR16).
  - Export: all data to Markdown (open format), written to a local file (FR15).
  - Erase: wipe all user data, guarded by an explicit confirmation (FR15).

## Impact

- New capability: `safety`.
- New code: `safety.rs` (local screening + curated resources), export-to-Markdown
  and erase-all in the repo, new Tauri commands, a distress/resources screen, a
  persistent disclaimer, a high-stakes banner in the decision flow, and export/erase
  actions in settings.
- No migration. Distress detection is heuristic and conservative — it errs toward
  offering help; it is never a diagnosis.
