# memory (delta)

## ADDED Requirements

### Requirement: Remember decisions and intentions locally
When an intention is created or a decision is finalized, the system stores a local,
searchable memory of it. Storage is on-device; no data leaves the machine.

#### Scenario: A finalized decision becomes recallable
- GIVEN a finalized decision
- WHEN the memory is searched for words from its title
- THEN a memory item for that decision is returned

#### Scenario: One item per source
- GIVEN an intention that is edited
- WHEN the memory is searched
- THEN the intention appears once, not duplicated

### Requirement: Recall relevant items in a new conversation
Given a query, the system recalls the most relevant past items using both keyword
and semantic search, fused and weighted by recency. Without a local embedding
model, keyword recall still works.

#### Scenario: Keyword recall works offline
- GIVEN no embedding model is available
- WHEN the user recalls with a query that matches stored words
- THEN relevant items are still returned by keyword search

#### Scenario: Semantic recall finds the nearest item
- GIVEN stored items with embeddings
- WHEN the user recalls with a semantically related query
- THEN the nearest item is returned even without exact word overlap

### Requirement: Surface tension as a question, never a judgment
When what the user is weighing has tension with their history, the system asks
exactly one gentle question and never states a verdict or tells the user what to do.
When there is no related history or no tension, it stays silent.

#### Scenario: A gentle question on tension
- GIVEN a decision that pulls against a recorded intention
- WHEN the system checks for contradiction
- THEN it returns a single question, phrased without judgment and without "you should"

#### Scenario: Silent when there is nothing to raise
- GIVEN a decision with no related history
- WHEN the system checks for contradiction
- THEN it returns no question
