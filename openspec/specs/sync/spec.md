# sync Specification

## Purpose

Encrypted file-based snapshots the user exports and imports across devices: passphrase-only, sanitized on import, last-write-wins per row, events unioned.

## Requirements

### Requirement: Imported snapshots are sanitized

Importing a snapshot never trusts its shape: only tables known to the merger are
read, only columns that exist in the local schema are written, and timestamps
MUST be valid RFC3339 values. The merge updates rows in place (upsert) instead
of deleting-and-reinserting them, so derived indexes (full-text, vector) stay
consistent.

#### Scenario: An unknown column aborts the merge
- GIVEN a snapshot whose `domains` rows contain a column that is not in the local schema
- WHEN the snapshot is imported
- THEN the import fails with an explicit error and nothing is merged

#### Scenario: An invalid timestamp aborts the merge
- GIVEN a snapshot whose rows carry a non-RFC3339 `updated_at`
- WHEN the snapshot is imported
- THEN the import fails with an explicit error and nothing is merged

#### Scenario: A merged update keeps derived indexes consistent
- GIVEN a local memory chunk already indexed for full-text search
- WHEN an incoming snapshot merges a newer version of that row
- THEN the full-text index returns the new content and only the new content
