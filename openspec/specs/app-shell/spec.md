# app-shell Specification

## Purpose

The app the user talks to and lives in: the conversation thread, its honest feedback, always-reachable safety, and the human-mode facade.

## Requirements

### Requirement: Feedback is honest

Any action that persists something SHALL report what actually happened. A failure is
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

### Requirement: Safety resources are always reachable

The path to distress resources SHALL not depend on onboarding state. From any
screen, before or after the Guide, the user can reach local help.

#### Scenario: Crisis before finishing onboarding
- GIVEN a user who has not completed the Guide
- WHEN they look for help
- THEN the "Besoin de parler" affordance is visible and opens the resources screen

### Requirement: Human mode hides engine vocabulary

In human mode no engine term (spec, delta, requirement, review, QA) SHALL appear in
the interface. The detail-level control explains itself in everyday words.

#### Scenario: Detail-level hint in human mode
- GIVEN a user in human mode opens Réglages
- WHEN they read the "Niveau de détail" hint
- THEN it describes the expert mode without naming any engine term

### Requirement: Human/expert mode toggle
The app has a human mode (default) and an expert mode. The choice is persisted.
The same engine feeds both.

#### Scenario: Mode choice persists across restarts
- GIVEN the user switches to expert mode
- WHEN the app is closed and reopened
- THEN expert mode is still active

### Requirement: No jargon in human mode
In human mode, engine vocabulary (spec, delta, QA, scenario) never appears in the UI.

#### Scenario: Human mode hides technical terms
- GIVEN the app is in human mode
- WHEN the user navigates any surface
- THEN no engine term (spec / delta / QA / scenario) is displayed

### Requirement: The shell is conversation-first

The app shell no longer presents an always-visible sidebar of five surfaces. In
human mode it opens on the guided conversation with a slim header. The other
surfaces remain reachable, but through a compact menu that appears only once the
user's world is non-empty. The human/expert toggle and the light/dark control
live in that header or menu. In human mode no engine vocabulary is shown.

#### Scenario: Human mode opens on the conversation
- GIVEN a user in human mode
- WHEN the app opens
- THEN the guided conversation is the home and no engine terms are visible

#### Scenario: Surfaces stay reachable once revealed
- GIVEN the user has created at least one thing
- WHEN they open the header menu
- THEN they can reach the compass, notebook, review, today, and settings, and
  the distress resources remain reachable at all times

#### Scenario: Expert mode still reveals mechanics
- GIVEN the user switches to expert mode
- WHEN they view a decision or an intention
- THEN engine details (status, deltas, counts) are shown inline
