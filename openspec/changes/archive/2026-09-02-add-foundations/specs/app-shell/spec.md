# app-shell (delta)

## ADDED Requirements

### Requirement: App boots with the five surfaces
The Tauri app starts and presents five surfaces as navigable shells: home
(conversation), compass, decision log, check-in, and settings.

#### Scenario: App starts and surfaces are reachable
- GIVEN a freshly installed app
- WHEN the user launches it
- THEN the home surface loads and the other four surfaces are reachable

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
