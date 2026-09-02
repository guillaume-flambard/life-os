# Change: add-onboarding

## Why

Value first, friction last. A new user must get real value in their very first
session — under five minutes, with no questionnaire and no account (FR11). Life OS
already opens straight on "what decision is on your mind?"; this change makes the
first run deliberate: a short, warm welcome that frames the idea in one line,
reassures on privacy, and drops the person directly into a real decision — never a
personality test. And it honours FR12: any "profile" is *extracted from how the
person actually uses the app*, never asked up front. This is Epic 7.

## What changes

- **onboarding** — a new capability:
  - First-run welcome, shown once (persisted flag): one-line framing, a privacy
    line ("everything stays on your device"), and a single call to action that
    starts a real decision. No form, no account, no personality quiz.
  - Profile by extraction: a gentle "what keeps coming up for you" panel that
    surfaces recurring themes computed from the user's own intentions, decisions,
    and learnings — appearing only once there is enough usage, never a form (FR12).

## Impact

- New capability: `onboarding`.
- New code: a first-run welcome screen gated on a persisted setting, a
  `repo/profile.rs` theme extractor (term frequency over the user's own text, minus
  stopwords), a `profile_themes` command, and a light profile panel on the home
  surface.
- No migration — reuses `settings` for the one-time flag and reads existing
  entities. Nothing is asked of the user that isn't already how the app works;
  onboarding removes friction rather than adding a gate.
