# sync (delta)

## ADDED Requirement: Encrypted snapshot export
The user can export an encrypted snapshot of all their data to a local file,
encrypted with a passphrase. The file never touches any server and is unreadable
without the passphrase.

#### Scenario: Export writes an encrypted file
- GIVEN stored data and a passphrase
- WHEN the user exports a snapshot
- THEN a passphrase-encrypted file is written locally and its path is returned

## ADDED Requirement: Import merges by last-write-wins, never overwrites blindly
Importing a snapshot decrypts it with the passphrase and merges it into the local
data: rows are matched by UUID and the newer `updated_at` wins; the append-only
events are unioned. The import runs atomically and reports what it applied.

#### Scenario: Import into a fresh device reproduces the data
- GIVEN a snapshot exported on device A and a fresh device B
- WHEN B imports the snapshot with the passphrase
- THEN B contains A's data

#### Scenario: A newer edit wins on merge
- GIVEN a row edited more recently on the incoming side than locally
- WHEN the snapshot is merged
- THEN the incoming version replaces the local one

#### Scenario: An older edit does not overwrite a newer local one
- GIVEN a row edited more recently locally than in the incoming snapshot
- WHEN the snapshot is merged
- THEN the local version is kept

#### Scenario: Wrong passphrase cannot read the snapshot
- GIVEN an encrypted snapshot
- WHEN import is attempted with the wrong passphrase
- THEN decryption fails and nothing is merged
