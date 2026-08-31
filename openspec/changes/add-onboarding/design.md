# Design: add-onboarding

## First run is a threshold, not a wizard
On boot, if the `onboarded` setting is not `"1"`, the app shows a single welcome
screen: one line of framing ("un compagnon pour tes décisions — pas un test, pas de
compte"), a privacy line, and one button that starts a real decision. Pressing it
sets `onboarded = "1"` and navigates to the home decision entry. There is no
multi-step wizard, no personality quiz, no sign-up. The setting lives in the
existing `settings` table, so the welcome never shows twice on the same device.
Erasing all data (Epic 8) clears the flag, so a fresh start welcomes again — which
is the right behaviour.

## Profile by extraction, never a form (FR12)
The "profile" is computed from what the person has already written: the statements
of their intentions, the titles and rationales of their decisions, and their review
learnings. `extract_themes` tokenizes that text, drops stopwords (FR + EN) and very
short tokens, counts term frequency, and keeps only terms that recur (count ≥ 2),
returning the top handful. It is shown as a soft "ce qui revient chez toi" panel on
the home surface, and only once there is enough material — early on there is
nothing to show, which is correct. It is a mirror, not a verdict, and never asks the
user anything.

This is deliberately simple (frequency, not embeddings clustering): it is honest
about being a light reflection of usage, and it needs no model. A richer,
value-clustered profile can come later without changing the contract.

## Surfacing
- The welcome replaces the whole view on first run only.
- The profile panel is additive on the home landing (below the decision starter),
  hidden until themes exist — it never competes with the primary action (start a
  decision).

## Out of scope
Big Five / VIA / any formal personality instrument (explicitly rejected by the
PRD), embeddings-based value clustering, and any onboarding that blocks reaching a
first decision. No migration.
