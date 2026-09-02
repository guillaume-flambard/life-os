# app-shell (delta)

## REMOVED Requirements

### Requirement: App boots with the five surfaces

The Tauri app starts and presents five surfaces as navigable shells: home
(conversation), compass, decision log, check-in, and settings.

#### Scenario: App starts and surfaces are reachable
- GIVEN a freshly installed app
- WHEN the user launches it
- THEN the home surface loads and the other four surfaces are reachable

## ADDED Requirements

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
