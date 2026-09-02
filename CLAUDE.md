# Life OS — working rules for this repo

Read `openspec/project.md` and the `docs/` (PRD, blueprint v2, axes psycho,
ressources) as the source of truth before changing anything.

## Method

- **OpenSpec is the artifact backbone.** Current truth lives in `openspec/specs/`;
  every change is a proposal in `openspec/changes/<id>/` with spec deltas
  (ADDED/MODIFIED/REMOVED) and GIVEN/WHEN/THEN scenarios. Never edit `specs/`
  directly — flow through a change, then archive it on apply.
- **BMAD roles are sequential lenses, not a multi-agent debate.** One model adopts
  distinct framings (explore → frame → strategize → shard → review) one at a time.
- **Scope has moved past the original MVP.** Epics 1–3 shipped, then
  `redesign-conversational-ui` rebuilt the human front-end as a guided
  conversation and the app grew into a full first release (compass, daily,
  memory, review, safety, sync, onboarding, guided-decision, next-step,
  release-prep). The current frontier is **verification + release, not new
  features**: an end-to-end run against a live Ollama model, guided-decision
  parity, and applying/archiving `harden-core`. Do not add feature scope beyond
  that without a decision.

## Non-negotiable constraints

- Local-first, privacy-first: on-device, offline, encrypted at rest. No telemetry.
- Local AI by default (Ollama); cloud only opt-in and anonymized.
- Anti-over-systematization: caps on domains/commitments, values over metrics, the
  system lightens when things go well (PRD NFR8–NFR13).
- Safety: not a therapist, distress flow + local resources, never a diagnosis.

## The façade rule (critical)

Two layers on one engine. **In human mode, engine vocabulary never appears in the
UI** — no "spec", "delta", "QA", "scenario". The engine maps to a human façade
(see `openspec/AGENTS.md`). Expert mode reveals the mechanics. When writing any
user-facing string, use the human façade unless it is gated behind expert mode.

## Conventions

- IDs = UUIDv4; timestamps ISO-8601 UTC; soft-delete via `deleted_at`.
- `events` is append-only — never UPDATE/DELETE it. Every mutation records one.
- Migrations forward-only and idempotent.
- Structured AI output is validated (typed deserialization against a JSON Schema)
  before it is ever persisted (NFR4).
- The front never touches the DB directly — only through typed Tauri commands.
