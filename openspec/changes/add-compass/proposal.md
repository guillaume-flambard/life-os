# Change: add-compass

## Why

With the engine standing (add-foundations), the first user-facing value is the
**compass**: the person names a few life areas and, in each, writes what matters —
in their own words. Behind the scenes the AI turns "I want to be more present for
my brother" into a testable marker "when [situation], I [action]", which the user
validates or edits. This is Epic 2 of the PRD (FR1, FR2) and the reference every
later decision is judged against.

The compass is also where the anti-over-systematization guardrails first bite:
few areas, few intentions, friction that *increases* with structure (NFR8). The
compass must never feel bureaucratic (NFR13) and must show zero engine jargon.

## What changes

- **compass** — a new capability:
  - Life areas: create / rename / archive, with a cap on active areas; adding past
    the cap invites removing one first, never silently allows more.
  - Intention capture: the user writes in natural language; the system offers a
    "when [situation], I [action]" reformulation to validate or edit. Works without
    AI (manual entry always available); AI reformulation is assistive, not required.
  - Priority: each intention is red line / would-like / bonus.
  - A cap on active intentions per area (~3).

## Impact

- New capability: `compass`.
- New code: compass repo (domains + intentions CRUD with caps + events), an
  intention JSON schema and an AI reformulation path, compass Tauri commands, and a
  functional compass surface in the front (replacing the shell).
- Builds directly on add-foundations (schema, events, commands, Ollama client).
  No schema migration needed — the `domains` and `intentions` tables already exist.
