# Design: add-compass

## Caps (NFR8) enforced in the backend
Caps live in the repo, not the UI, so they can't be bypassed:
- `DOMAIN_ACTIVE_CAP = 5` active life areas (PRD says 3–5; 5 is the ceiling).
- `INTENTION_ACTIVE_CAP = 3` active intentions per area.

Creating past a cap returns a typed, gentle error (`CapReached`) the front turns
into "you're full here — remove one before adding". Friction increases with
structure; it never decreases. Archiving frees a slot (archived ≠ deleted).

## Intention reformulation is assistive, never required
The user always types free natural language and can enter `situation` / `action`
by hand. A "reformulate" action asks the local model for a
`{ situation, action, statement }` object (schema `ai/schemas/intention.json`),
which pre-fills the editable fields. If no model is pulled or the call fails, the
manual path is unaffected — value never depends on the AI (NFR3, onboarding-by-value).

Validation is typed deserialization into `Intention` reformulation struct; a
malformed AI output is surfaced, never auto-saved (NFR4).

## States, not deletion
Areas and intentions carry `status` (`active` / `archived`) *and* the shared
`deleted_at` soft-delete. Archiving is the normal "put aside" gesture (keeps
history, frees a cap slot); delete is rare. Active lists filter
`status='active' AND deleted_at IS NULL`.

## Façade (no jargon)
UI strings use the human façade only: "pan de vie", "ce qui compte", "quand …, je
…", and priorities "ligne rouge / j'aimerais / bonus". The engine terms
(domain, requirement, MUST/SHOULD/MAY, scenario) never appear in human mode.

## Out of scope
Decision conversation and value-alignment scoring (Epic 3 / add-guided-decision),
review (Epic 5), memory recall over intentions (Epic 6). No new migration.
