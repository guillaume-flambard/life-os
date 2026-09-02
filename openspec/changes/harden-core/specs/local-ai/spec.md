# local-ai (delta)

## ADDED Requirement: Local AI calls are bounded

Every HTTP call to the local model server has a connection timeout and a request
timeout. A wedged or absent server surfaces an error to the user within seconds
or minutes instead of hanging the command forever.

#### Scenario: A wedged local server fails fast
- GIVEN the local model server accepts the TCP connection but never answers
- WHEN an AI-assisted command runs
- THEN it fails with a timeout error instead of waiting forever
