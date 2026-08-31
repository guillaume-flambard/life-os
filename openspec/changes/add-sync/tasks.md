# Tasks: add-sync

## 1. Backend — snapshot & merge
- [x] 1.1 `sync.rs`: generic `export_json(conn)` over the syncable tables (row → JSON)
- [x] 1.2 `import_merge(conn, json)` → LWW per row / union events / key-LWW settings, in a transaction
- [x] 1.3 `MergeSummary` type (applied / skipped counts)

## 2. Backend — encryption & commands
- [x] 2.1 `age` passphrase encrypt/decrypt wrappers
- [x] 2.2 `sync_export(passphrase)` → writes `.age` to Downloads, returns path
- [x] 2.3 `sync_import(path, passphrase)` → decrypt + merge, returns summary; register

## 3. Front
- [x] 3.1 Settings "Synchroniser": export (passphrase → path) and import (path + passphrase → summary)
- [x] 3.2 Note to run "refresh memory" after importing on a new device

## 4. Verification
- [x] 4.1 Export then import into a fresh DB reproduces the data (rows + events)   — cargo test
- [x] 4.2 A newer row on one side wins on merge; an older one does not overwrite   — cargo test
- [x] 4.3 age encrypt → decrypt round-trips the snapshot   — cargo test
- [x] 4.4 Live: export with a passphrase, import it back, see the summary   — verified on-screen: exported a real age file, erased all data, imported with the passphrase (merge summary shown), and the capture was restored

## Status
Compiles; front typechecks. 17 headless tests pass, incl. an export→import roundtrip into a fresh DB, last-write-wins (newer wins, older skipped), events unioned without duplication, and age encrypt/decrypt round-trip (wrong passphrase rejected). Settings "Synchroniser" section wired. GUI check (4.4) pending.
