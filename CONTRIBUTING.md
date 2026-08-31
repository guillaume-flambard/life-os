# Contributing to Life OS

Thanks for wanting to help. Life OS is a local-first, privacy-first life coach, and
those two words shape everything here — read them before you open a PR.

## Principles that constrain contributions

- **Local-first, privacy-first.** Data lives on the device, works offline, is
  encrypted at rest. No telemetry. AI runs locally by default; any cloud call must
  be opt-in and anonymized. A change that quietly phones home will be rejected.
- **Two layers, one engine.** Human mode (default) shows zero jargon — never
  "spec", "delta", "QA", "scenario" in the UI. Expert mode reveals the mechanics.
  Keep the façade intact (see `openspec/AGENTS.md`).
- **Anti-over-systematization.** Caps on domains/commitments, values over metrics,
  the system lightens when things go well. No streaks, no debt language, no
  guilt (see the PRD NFR8–NFR13).
- **Safety.** Not a therapist, no diagnosis. Distress screening stays on-device and
  routes to local resources without exfiltration.

If a change fights any of these, it doesn't belong here — even if it's clever.

## Workflow

1. Read `openspec/project.md` and the `docs/` (PRD, blueprint, psychology,
   resources). They are the source of truth.
2. Non-trivial work flows through **OpenSpec**: add a change under
   `openspec/changes/<id>/` with `proposal.md`, `design.md`, `tasks.md`, and spec
   deltas (`ADDED/MODIFIED/REMOVED` with GIVEN/WHEN/THEN scenarios). See
   `openspec/AGENTS.md`.
3. Match the surrounding code. Rust in `src-tauri/`, TypeScript in `src/`.
4. Add tests. Backend logic is covered by headless `cargo test`; the DB guarantees,
   caps, safety screening, sync merge, etc. all have tests — follow that bar.
5. Run `cargo test --lib` (in `src-tauri/`) and `npx tsc --noEmit` before pushing.

## Commit & PR

- Conventional-ish subjects: `feat:`, `fix:`, `docs:`, `chore:`.
- Explain the *why* in the body — the reasoning is the knowledge.
- One coherent change per PR. Keep the façade rule and the safety posture in mind
  during review.

## Sign-off (DCO)

Contributions are accepted under the **Developer Certificate of Origin**: add a
`Signed-off-by: Your Name <you@example.com>` line to each commit (`git commit -s`).
See [`CLA.md`](CLA.md) for how your contribution is licensed.

## Code of conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
