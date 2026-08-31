# next-step (delta)

## ADDED Requirement: Pre-wire a step with an if-then plan
A next step can carry an implementation intention: "si [situation], alors
[action]", optionally with the WOOP frame. It can be entered by hand or pre-filled
by an optional assist; the manual path always works.

#### Scenario: An if-then plan is saved on a step
- GIVEN a next step from a decision
- WHEN the user adds "si [situation], alors [action]"
- THEN the if-then plan is stored on that step and an event is recorded

#### Scenario: Works without a model
- GIVEN no local model is available
- WHEN the user writes the if-then by hand
- THEN it saves normally

## ADDED Requirement: Follow through on open steps
The open next steps across all decisions are listed on the home surface. Each can be
marked done or dropped; neither deletes it (history is kept).

#### Scenario: Marking a step done removes it from the open list
- GIVEN an open next step shown on home
- WHEN the user marks it done
- THEN it no longer appears among open steps and its record remains

#### Scenario: Only open steps are listed
- GIVEN steps in mixed states (open, done, dropped)
- WHEN the home list is shown
- THEN only the open steps appear
