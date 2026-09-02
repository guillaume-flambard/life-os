# secure-storage Specification

## Purpose

The encrypted on-device store: SQLCipher at rest, an append-only audit event per mutation, and mutations that are atomic with everything they derive.

## Requirements

### Requirement: Mutations are atomic with their audit event

Every mutation SHALL write its row change, its audit event, and any derived memory
entry inside a single transaction: the process either sees all of them or
none of them. Updating a row that does not exist (or is soft-deleted) fails
with an explicit error instead of silently doing nothing and recording a
phantom event.

#### Scenario: A crash cannot split a mutation from its event
- GIVEN any mutation that also records an event (e.g. renaming a domain)
- WHEN the mutation runs
- THEN the row change and the event are committed in the same transaction

#### Scenario: Updating a missing row fails cleanly
- GIVEN no domain with the given id
- WHEN a rename is attempted
- THEN the command fails with an explicit error and no event is recorded

#### Scenario: Setting a confidence is recorded
- GIVEN an open decision session
- WHEN the confidence is set
- THEN an audit event records the new confidence
