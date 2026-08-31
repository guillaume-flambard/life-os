# daily (delta)

## ADDED Requirement: Capture a quick note locally
The user can capture a one-line freeform note with no ceremony. It is timestamped,
stored on device, and screened for distress like any free-text entry.

#### Scenario: A capture is saved and listed
- GIVEN the user types a quick note
- WHEN they save it
- THEN it is stored with a timestamp and appears in today's captures, and an event is recorded

#### Scenario: A crisis note routes to help, not storage
- GIVEN a capture containing a crisis signal
- WHEN the user tries to save it
- THEN the distress resources are shown and the coaching flow yields (screened before saving)

## ADDED Requirement: A light daily surface, no streaks
The daily surface shows today's captures and the open next steps, and affirms that a
day with nothing on it is fine. It shows no streak, no missed-day counter, and no
debt language.

#### Scenario: An empty day reads kindly
- GIVEN no captures and no open steps today
- WHEN the user opens the daily surface
- THEN it shows a calm message that nothing today is fine, with no guilt and no streak

## ADDED Requirement: Captures are exported and erasable
Captures are included in the Markdown export and removed by erase-all (FR15).

#### Scenario: Export and erase cover captures
- GIVEN stored captures
- WHEN the user exports then erases
- THEN the export contains the captures and the erase removes them
