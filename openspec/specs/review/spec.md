# review Specification

## Purpose

The weekly check-in: replay intentions compassionately and integrate confirmed decisions into the compass.

## Requirements

### Requirement: Replay intentions compassionately
A check-in replays each active intention in plain words ("when [situation]
happened, did you [action]?") and records, without judgment, whether life
followed. The outcome is one of: better, as intended, less than I'd have liked,
too early. A learning may be recorded. No debt, failure, or streak language.

#### Scenario: Record an outcome and a learning
- GIVEN an active intention and an open check-in
- WHEN the user marks it "too early" and writes a learning
- THEN a review item is stored with that outcome and learning, and an event is logged

#### Scenario: "Too early" is a first-class answer
- GIVEN an intention the user hasn't had a chance to live yet
- WHEN they review it
- THEN they can answer "too early" without any negative framing

### Requirement: Integrate a confirmed decision into the compass
Integrating a proposed decision applies each of its deltas to the compass: added
creates a new intention, modified updates an existing one, removed archives one.
Each delta is marked applied, the decision becomes applied, and history is kept.

#### Scenario: An added delta becomes a new intention
- GIVEN a proposed decision with an "added" delta and a chosen area
- WHEN the user integrates it
- THEN a new intention exists in that area, the delta is marked applied, and the
  decision becomes "applied"

#### Scenario: Integration respects the compass cap
- GIVEN an area already at its active-intention cap
- WHEN the user integrates a decision whose added delta targets that area
- THEN the integration is refused and nothing is merged

#### Scenario: History is kept
- GIVEN an integrated decision
- WHEN the user views the decision log
- THEN the decision and its applied change remain visible
