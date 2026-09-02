# Change: add-foundations

## Why

Life OS needs its engine before any user-facing feature (compass in Epic 2,
guided decision in Epic 3). The engine is: an encrypted local SQLite store that is
the single source of truth, a local AI client that returns schema-validated
structured output, and a Tauri app shell exposing the five surfaces. This change
delivers Epic 1 of the PRD — foundations & engine — and establishes the day-one
conventions (UUIDs, soft-delete, append-only events, forward-only migrations) that
every later change depends on.

Without this, nothing else can be built or tested. It is deliberately scoped to
infrastructure: it stands up the plumbing and proves it works end to end, without
implementing the compass or decision conversations (those are separate changes).

## What changes

- **secure-storage** — encrypted SQLite (SQLCipher) as source of truth; the full
  data model migrated via a forward-only, idempotent migration; UUID + soft-delete
  + append-only `events`; offline open; a Markdown export stub.
- **local-ai** — an Ollama client talking to a local model; JSON output constrained
  and validated by schema (delta, story); no external network call by default; no telemetry.
- **app-shell** — the Tauri app boots; the five surfaces exist as shells (home,
  compass, decision log, check-in, settings); a persisted human/expert mode toggle;
  in human mode no technical term is ever visible.

## Impact

- New capabilities: `secure-storage`, `local-ai`, `app-shell`.
- New code: `src-tauri/` (Rust backend owning the DB), `src/` (TS front shells),
  root tooling (Vite, package.json, tsconfig), `LICENSE` (AGPL-3.0).
- No user data model is broken (greenfield). Later changes (`add-compass`,
  `add-guided-decision`) build on the schema and commands introduced here.
