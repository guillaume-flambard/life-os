# guided-conversation Specification

## Purpose

The conversational front: a guided home thread, progressive reveal of the user's world, live model reasoning, and safety woven into the flow.

## Requirements

### Requirement: The home is a guided conversation
In human mode the primary surface is a single conversational thread. The system
speaks in short lines and the user answers mostly by tapping choices; free text
is offered only where it adds something. Exactly one interactive step is live at
a time. Engine vocabulary never appears.

#### Scenario: First run has no wizard
- GIVEN a user opening the app for the first time
- WHEN the home loads
- THEN a short greeting appears followed by a single choice (a decision, what
  matters, or a note), with no form and no account step

#### Scenario: One step at a time
- GIVEN the conversation is waiting on the user
- WHEN a choice or input is presented
- THEN only that one interaction is active, and answering it appends the user's
  choice to the thread and advances to the next step

#### Scenario: Every assisted step has a manual fallback
- GIVEN no local model is available
- WHEN a step would normally offer AI help
- THEN the user can complete the step by hand and the flow continues

### Requirement: The world is revealed progressively
Navigation to the other surfaces is hidden until the user has created their
first thing. After the first act, a compact menu appears and the set of offered
choices grows with what the user's world now contains.

#### Scenario: Nothing to navigate before the first act
- GIVEN a first-run user who has created nothing yet
- WHEN they look at the shell
- THEN no navigation menu is shown — only the conversation

#### Scenario: The menu appears after the first act
- GIVEN the user has just created a note, an area, or a decision
- WHEN the step completes
- THEN the navigation menu becomes available and the home offers follow-on
  choices (e.g. resume a pending step, see the notebook)

### Requirement: Returning users re-enter through follow-through
A returning user is greeted with a brief recap and, when a small step is
pending, is offered that step first before the open menu.

#### Scenario: A pending step is offered first
- GIVEN a returning user with at least one open small step
- WHEN the conversation opens
- THEN the recap is shown and the first pending step is offered to tick, snooze,
  or drop before anything else

### Requirement: Live reasoning is shown, then folded
When an AI-assisted moment runs, the local model's streamed reasoning is shown
as a live timeline of short steps, with elapsed time. When it completes, the
trace folds to a quiet "reasoning" summary that the user can re-open. Nothing is
shown when no reasoning is produced.

#### Scenario: Reasoning streams while thinking
- GIVEN an assisted step invokes the local model with thinking enabled
- WHEN reasoning tokens arrive
- THEN they are shown as a growing timeline with a running timer, the current
  step emphasized and past steps dimmed

#### Scenario: Reasoning folds when done
- GIVEN the model has finished thinking
- WHEN the answer is ready
- THEN the timeline folds to a summary line stating how long it thought, which
  the user can expand to re-read the full trace

#### Scenario: No model, no panel
- GIVEN no local model or no reasoning stream
- WHEN an assisted step runs
- THEN no reasoning panel is shown and the step still completes

### Requirement: Safety net inside the thread
Free text the user writes in the conversation is screened locally. On signs of
distress, support resources are surfaced gently in-thread — never a diagnosis,
never blocking the user.

#### Scenario: Distress surfaces resources in the thread
- GIVEN the user writes something that the local screen flags as distress
- WHEN the step completes
- THEN support resources are shown in-thread with an offer to open them, and the
  conversation continues if the user declines
