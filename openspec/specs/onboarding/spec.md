# onboarding Specification

## Purpose

Value first: no form, no account — the profile is extracted from usage, never asked.

## Requirements

### Requirement: Value first, no form, no account
A new user reaches a real decision in their first session without any
questionnaire and without creating an account. The first run shows a brief welcome
and a single call to action that starts a decision.

#### Scenario: First run lands on a real decision
- GIVEN a fresh install
- WHEN the user opens the app for the first time
- THEN a short welcome is shown and one action takes them straight into a real decision, with no form and no account

#### Scenario: The welcome shows once
- GIVEN the user has passed the welcome
- WHEN they reopen the app
- THEN the welcome is not shown again

### Requirement: Profile is extracted from usage, never asked
Any profile of the person is computed from what they have written (intentions,
decisions, learnings); the app never presents a personality questionnaire.

#### Scenario: Recurring themes surface from usage
- GIVEN the user has written several intentions and decisions sharing a theme
- WHEN the profile is computed
- THEN the recurring theme appears, drawn from their own words

#### Scenario: Nothing to show early on
- GIVEN little or no usage
- WHEN the profile is computed
- THEN it is empty and no profile panel is shown
