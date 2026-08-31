# compass (delta)

## ADDED Requirement: Life areas with a cap
The user can create, rename, and archive life areas. The number of active areas is
capped; adding past the cap is refused with an invitation to remove one first,
never silently allowed.

#### Scenario: Create and rename an area
- GIVEN the compass is below the area cap
- WHEN the user creates an area and later renames it
- THEN the area exists with the new name and is listed among active areas

#### Scenario: Adding past the cap is refused
- GIVEN the number of active areas equals the cap
- WHEN the user tries to add another area
- THEN the addition is refused and the user is invited to remove one first

#### Scenario: Archiving frees a slot
- GIVEN the active areas are at the cap
- WHEN the user archives one area
- THEN a new area can be created and the archived one is kept in history

## ADDED Requirement: Intention as a testable marker
Within an area the user expresses what matters in natural language. The system
offers a "when [situation], I [action]" form to validate or edit. The engine
vocabulary never appears. Manual entry is always available; AI reformulation is
assistive, not required.

#### Scenario: Natural language becomes a testable marker
- GIVEN the user writes "I want to be more present for my brother"
- WHEN the system reformulates it
- THEN a "when [situation], I [action]" form is proposed that the user can validate or edit

#### Scenario: Works without AI
- GIVEN no local model is available
- WHEN the user enters an intention
- THEN they can still set the situation and action by hand and save it

## ADDED Requirement: Priority levels
Each intention is marked red line / would-like / bonus.

#### Scenario: Set a priority
- GIVEN an existing intention
- WHEN the user marks it "red line"
- THEN the intention carries that priority

## ADDED Requirement: Intentions per area are capped
The number of active intentions per area is capped; adding past the cap is refused
with an invitation to remove one first.

#### Scenario: Adding past the per-area cap is refused
- GIVEN an area at its active-intention cap
- WHEN the user tries to add another intention
- THEN the addition is refused and the user is invited to remove one first
