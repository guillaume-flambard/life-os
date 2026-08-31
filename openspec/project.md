# Project — Life OS

## What this is

Life OS is a local-first life coach whose **engine** applies spec-driven
(OpenSpec) and agentic-agile (BMAD) logic to a person's life, not to software.
A person's life has a **living spec** (values and commitments written as testable
markers: "when X, I Y", grouped by life domain). Every **decision** is treated as a
*change proposal* that modifies that spec (add / modify / stop). Goals are sharded
into small self-contained steps. The **review** is a compliance QA of what was
lived against the spec. The central object is the **Decision**.

The engine's rigor stays invisible. Two layers run on the same engine:
- **Human mode (default):** warm conversation and simple pages only. No jargon —
  "spec", "delta", "QA", "scenario" never appear. The AI translates what the user
  says into a testable spec behind the scenes and gives everything back in plain words.
- **Expert mode (optional):** reveals the Git-like mechanics (specs, change
  proposals, deltas) for technical users.

## Non-negotiable constraints

- **Local-first, privacy-first:** data lives on device, works offline, encrypted at rest.
- **Local AI by default** (Ollama/MLX); cloud only opt-in and anonymized.
- **Two layers, one engine:** human mode default, expert mode optional.
- **Anti-over-systematization guardrails:** caps on domains/commitments, values over
  metrics, the system lightens when things go well (see PRD NFR8–NFR13).
- **Safety:** "not a therapist", distress flow + local resources, never a diagnosis.
- **Roles = BMAD as sequential lenses**, not a multi-agent debate.

## Scope

- **MVP Phase 1 only: Epics 1–3** of the PRD (foundations + compass +
  decision-as-change-proposal). Do not build beyond.

## Stack

Tauri v2 + TypeScript (front) · SQLite (SQLCipher) source of truth + FTS5 +
sqlite-vec · local AI via Ollama · Markdown export · License AGPL-3.0.

## Source of truth

`docs/life-os-prd.md` (the PRD), `docs/life-os-blueprint-v2.md` (positioning),
`docs/life-os-axes-psycho.md` (psychological foundations),
`docs/life-os-ressources.md` (resources & credibility notes).

## Conventions

- IDs = UUIDv4 (TEXT) from day one; timestamps ISO-8601 UTC (TEXT).
- Soft-delete via `deleted_at`; `events` table is append-only (never UPDATE/DELETE).
- Migrations are forward-only and idempotent.
- Structured AI outputs (deltas, stories) are validated against a JSON Schema before use.
