# local-ai (delta)

## ADDED Requirement: Local AI by default
Conversation and generation run on a local model via Ollama. No external network
call is made by default, and no telemetry is emitted.

#### Scenario: No external call without opt-in
- GIVEN default settings
- WHEN the AI produces a response
- THEN the request goes only to the local Ollama endpoint and no external host is contacted

## ADDED Requirement: Schema-validated structured output
Structured operations (producing a delta, a story) return JSON constrained by a
declared JSON Schema and validated after parsing. A structured operation never
persists an output that fails validation.

#### Scenario: Valid structured output is returned
- GIVEN a request for a decision delta
- WHEN the local model responds
- THEN the response parses and validates against the delta JSON Schema

#### Scenario: Invalid output is never persisted
- GIVEN a model response that fails schema validation
- WHEN the system processes it
- THEN it is retried or surfaced as an error, and nothing invalid is written to the store
