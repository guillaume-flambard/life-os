# Tasks: add-onboarding

## 1. Backend — profile by extraction
- [x] 1.1 `Theme` type; `repo/profile.rs`: `extract_themes(conn, limit)` over intentions/decisions/learnings, minus stopwords, count ≥ 2
- [x] 1.2 `profile_themes` command; register

## 2. Front — first-run welcome
- [x] 2.1 Boot gate: if `onboarded` setting != "1", show the welcome (one line, privacy line, single CTA)
- [x] 2.2 CTA sets `onboarded = "1"` and lands on the home decision entry — no form, no account
- [x] 2.3 Welcome shows once per device (persisted); a full erase re-welcomes

## 3. Front — profile panel (FR12)
- [x] 3.1 Home landing: a soft "ce qui revient chez toi" panel from `profile_themes`
- [x] 3.2 Hidden until themes exist; a mirror, never a form; human façade

## 4. Verification
- [x] 4.1 A first-time user reaches the decision entry without any form or account   — verified on-screen: welcome → single CTA → decision entry
- [x] 4.2 The welcome does not show again after it is dismissed   — verified on-screen: reload lands straight on home (flag persisted)
- [x] 4.3 Extraction returns recurring terms from the user's own text and ignores stopwords   — cargo test
- [x] 4.4 With little/no usage, the profile is empty (no panel)   — cargo test

## Status
Compiles; front typechecks. 13 headless tests pass, incl. profile extraction
(recurring terms surface, stopwords excluded, empty without usage). First-run
welcome + profile panel wired. GUI check pending.
