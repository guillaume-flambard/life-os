# secure-storage (delta)

## ADDED Requirement: Encrypted local store as source of truth
The system stores all data in a local SQLite database encrypted at rest
(SQLCipher). The database is the single source of truth and opens without any
network connection.

#### Scenario: Database is unreadable without the key
- GIVEN a Life OS database file on disk
- WHEN it is opened by a tool without the correct key
- THEN the contents cannot be read (the file is ciphertext)

#### Scenario: App works offline
- GIVEN no network connection
- WHEN the user opens the app
- THEN the database opens and reads/writes succeed

## ADDED Requirement: Forward-only idempotent migrations
Schema changes are applied by a forward-only migration runner. Re-running an
already-applied migration is a no-op and never errors.

#### Scenario: Re-running the initial migration is safe
- GIVEN a database already migrated to `0001_init`
- WHEN the migration runner runs again
- THEN no schema change occurs and no error is raised

## ADDED Requirement: UUID identity, soft-delete, append-only events
Every entity row has a UUID primary key and `created_at` / `updated_at`
timestamps. Deletion is soft (`deleted_at` set), never physical. Every mutation
appends a row to the `events` table, which is never updated or deleted.

#### Scenario: Deleting an entity keeps its row
- GIVEN an existing decision
- WHEN the user deletes it
- THEN its row remains with `deleted_at` set and it is excluded from normal reads

#### Scenario: A mutation records an event
- GIVEN any create/update/delete on an entity
- WHEN the mutation commits
- THEN a corresponding append-only row exists in `events`

## ADDED Requirement: Markdown export
The user can export all their data to an open Markdown format.

#### Scenario: Export produces Markdown
- GIVEN a database with decisions and intentions
- WHEN the user requests an export
- THEN a Markdown representation of the data is produced
