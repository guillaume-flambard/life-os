# app-shell (delta)

## ADDED Requirement: Feedback is honest

Any action that persists something reports what actually happened. A failure is
never dressed up as a success: the user sees a real, human-worded error and the
data is left in a consistent state they can retry from.

#### Scenario: A failed save says so
- GIVEN the user completes a Guide step that writes to the database
- WHEN that write fails
- THEN the app shows an error naming what went wrong, not a confirmation line

#### Scenario: A successful save confirms
- GIVEN the same step
- WHEN the write succeeds
- THEN the app confirms it in plain language

## ADDED Requirement: Safety resources are always reachable

The path to distress resources does not depend on onboarding state. From any
screen, before or after the Guide, the user can reach local help.

#### Scenario: Crisis before finishing onboarding
- GIVEN a user who has not completed the Guide
- WHEN they look for help
- THEN the "Besoin de parler" affordance is visible and opens the resources screen

## ADDED Requirement: Human mode hides engine vocabulary

In human mode no engine term (spec, delta, requirement, review, QA) appears in
the interface. The detail-level control explains itself in everyday words.

#### Scenario: Detail-level hint in human mode
- GIVEN a user in human mode opens Réglages
- WHEN they read the "Niveau de détail" hint
- THEN it describes the expert mode without naming any engine term
