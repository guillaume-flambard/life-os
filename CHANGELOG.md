# Changelog

All notable changes to Life OS. The app is local-first and offline; versions
track the desktop app only.

## 0.2.2 — 2026-09-02

A full dogfooding pass over every surface, found and fixed.

- **Two lost features restored**: the guided-decision flow offers the "when …,
  I …" anchor again (with the optional assist pre-filling it, manual always
  works), and the anchor now shows on Today and in the thread's follow-through;
  Settings can import an encrypted snapshot again and refresh the memory after
  a restore. Both had been dropped by the conversational rebuild while their
  specs still required them.
- **Erase unblocked**: the confirmation word the UI asks for ("ERASE") now
  matches what the backend accepts — erasing was failing in both languages.
- **Safety**: screening catches more real phrasings ("ending it all", "can't
  go on", French variants) and typographic apostrophes; a miss is the one
  thing this screen must not do.
- **AI output**: reformulations no longer stutter ("When when I…, I I…"),
  suggested options and next steps are short and concrete, and leaked
  `\uXXXX` escapes from small models are decoded before anything is shown.
- **Language & dates**: menu labels translate in French mode; dates follow the
  UI language instead of hardcoding French; the Markdown export is
  consistently English; curly quotes render as quotes, not `\u201c`.
- **Composer**: send buttons carry their contextual label ("Keep", "Anchor
  it", "That's my step") instead of a bare arrow.
- **Dev bridge**: compiles against the current AI client and announces its
  address only after binding.

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
