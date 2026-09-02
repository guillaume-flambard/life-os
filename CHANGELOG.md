# Changelog

All notable changes to Life OS. The app is local-first and offline; versions
track the desktop app only.

## 0.2.1 — 2026-09-02

Security and data-integrity hardening, plus honest feedback in the UI.

- **Security**: snapshot imports are sanitized (column whitelist, RFC3339
  validation) and merge by upsert instead of delete-and-reinsert; the dev
  keychain bypass is debug-builds-only; the webview can no longer reach the
  local model server directly (tighter CSP, unused opener plugin removed);
  local AI calls are bounded by connect + request timeouts.
- **Integrity**: every mutation is transactional with its audit event; no-op
  updates fail instead of recording phantom events; setting a decision's
  confidence is recorded; new indexes for common lookups.
- **Guided decisions**: the conversation now walks a decision through to a
  real outcome — at least two options plus an explicit "none of these", a
  pre-mortem on the leaning option, the 10 min / 10 month / 10 year look,
  the why, and one next small step. The session can finalize again.
- **Honest feedback**: failed saves say so (in plain words) instead of
  confirming a success that did not happen; compass and settings actions
  report their errors; pending timers are cleaned up on unmount.
- **Safety & facade**: the distress ("Besoin de parler") heart is reachable
  from the first screen, before onboarding; the detail-level hint speaks
  human, no engine vocabulary.

## 0.2.0 — 2026-08-31

The front-end becomes a single guided conversation: onboarding folded into
the first turns, progressive reveal of the world, live reasoning timeline
when the local model assists, screens restyled on one design system, CI
builds for Windows and macOS.

## 0.1.0 — 2026-08-28

First release: the engine (living spec, decisions as change proposals),
compass, notebook, check-in, safety flow, encrypted snapshots, local AI.
