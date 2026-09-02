# Design: add-next-step

## If-then plan over the existing table
An if-then plan is stored in `if_then_plans` (already created in foundations),
linked to a story (and its decision). The essential fields are `cue` ("si …") and
`action` ("alors …"); the WOOP frame (`wish`, `outcome`, `obstacle`) is optional
context. The decision flow's next-step already creates a `story`; this change lets
the user pre-wire that story with an if-then, entered by hand or pre-filled by an
optional AI assist (`generate_woop`) which returns the five fields as
schema-validated JSON. Without a model the manual fields are unaffected (NFR3).

## Follow-through on the home surface
Execution is where clarity becomes real, so the open next-steps are surfaced where
the user starts — the home landing lists every open story across decisions with a
"fait" and a "laisser" control. "Fait" sets the story `done`, "laisser" sets it
`dropped`; neither deletes anything (history is kept, per the events log). The list
is additive and sits below the decision starter and the profile — it never competes
with the primary action.

## Why if-then, not more tasks
The foundations are explicit: the lever is *one* small step pre-wired to a trigger,
not ten tasks. So the UI captures a single if-then per step and keeps the step
itself tiny. The AI prompt asks for one concrete cue and one tiny action, and
forbids turning it into a plan of many steps.

## Out of scope
Recurring schedules / reminders / notifications (the cadence stays manual, per the
anti-over-systematization guardrails), habit streaks (explicitly unwanted), and any
calendar integration. No migration.
