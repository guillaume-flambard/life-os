# guided-decision (delta)

## ADDED Requirements

### Requirement: Open and explore a decision
The user opens a decision from a plain prompt ("what's on your mind?"). The system
guides them one step at a time and captures where they are before jumping to options.

#### Scenario: Open a decision
- GIVEN the user has a decision in mind
- WHEN they enter it
- THEN a guided session starts in draft and asks where they are before options

### Requirement: Widen options with a null option
The session requires at least three options, including a "what if none of these?"
option, before deciding.

#### Scenario: The null option is required
- GIVEN a decision with two concrete options
- WHEN the user tries to finalize
- THEN it is refused until at least three options exist, one of them the null option

### Requirement: Debias before deciding
Before finalizing, the leaning option carries a pre-mortem ("in a year this failed
— why?") and the decision carries a 10-min / 10-month / 10-year reflection.

#### Scenario: Finalize is blocked without debiasing
- GIVEN a leaning option with no pre-mortem and no 10/10/10 reflection
- WHEN the user tries to finalize
- THEN finalization is refused and the missing debiasing steps are named

### Requirement: Align to the compass in plain words
The leaning option is compared to the user's intentions and reported in plain
words, naming both where it fits and where it pulls against (never one-sided).

#### Scenario: Alignment names fit and tension
- GIVEN a leaning option and existing intentions
- WHEN the system reports alignment
- THEN it states both what the option fits and what it pulls against

### Requirement: Never end without a valid outcome
A session cannot be finalized without a valid structured outcome: a why, what
changes (a delta), a confidence, a review date, and at least one next small step.

#### Scenario: A finalized decision is complete
- GIVEN a session with ≥3 options (incl. null), a chosen option with a pre-mortem,
  a 10/10/10 reflection, a why, and one next small step
- WHEN the user finalizes
- THEN the decision becomes "proposed" and persists the why, the delta, the story,
  the confidence, and the review date

#### Scenario: Incomplete sessions are guided, not dead-ended
- GIVEN a session missing a next small step
- WHEN the user tries to finalize
- THEN finalization is refused with the missing piece named, and the session stays editable

### Requirement: Anti-sycophancy
The assistant expresses uncertainty and surfaces the counter-argument of the
leaning option; it never tells the user what they should do.

#### Scenario: The counter-argument is surfaced
- GIVEN a leaning option
- WHEN the assistant responds
- THEN it includes the counter-argument and avoids prescriptive "you should" phrasing
