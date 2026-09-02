# safety (delta)

## ADDED Requirements

### Requirement: Not a therapist, stated plainly
The app makes visible that it is not a therapist and does not diagnose.

#### Scenario: The disclaimer is always present
- GIVEN any surface of the app
- WHEN the user looks at it
- THEN a short "not a therapist" statement is visible

### Requirement: Local distress screening without exfiltration
Free text the user enters is screened on-device for crisis signals. No model and no
network are used; the text is never sent anywhere. On a hit, the coaching flow
yields to a calm screen of local crisis resources.

#### Scenario: A crisis signal shows resources and leaves the flow
- GIVEN the user types text containing a crisis signal
- WHEN it is screened
- THEN distress is detected, local resources are shown, and no coaching AI is run on that text

#### Scenario: Ordinary sadness is not over-flagged
- GIVEN the user types "je suis un peu triste aujourd'hui"
- WHEN it is screened
- THEN distress is not detected and the flow continues normally

#### Scenario: Distress text is not exfiltrated
- GIVEN a crisis signal is detected
- WHEN the app responds
- THEN the text is not sent to any external service and is not persisted

### Requirement: High-stakes decisions point to a professional
Money, health, and legal major decisions are flagged with a gentle note that a
human professional is precious; the app structures the thinking but does not decide.

#### Scenario: A high-stakes decision gets a gentle referral
- GIVEN a decision about a major medical or legal or money matter
- WHEN it is screened
- THEN it is flagged high-stakes (not distress) and a referral note is offered without blocking

### Requirement: Export and erase all data
The user can export all their data to Markdown and erase everything.

#### Scenario: Export produces Markdown of the data
- GIVEN stored areas, intentions, and decisions
- WHEN the user exports
- THEN a Markdown document containing that data is produced

#### Scenario: Erase wipes everything, with confirmation
- GIVEN stored data and an explicit confirmation
- WHEN the user erases
- THEN all user rows are removed and the app returns to an empty state
