# Tasks: add-safety

## 1. Backend — screening
- [x] 1.1 `safety.rs`: local `screen(text) -> Screen { distress, high_stakes }` (curated FR/EN patterns, no model, no network)
- [x] 1.2 Curated crisis resources (3114, SOS Amitié, 112, Find A Helpline)
- [x] 1.3 `safety_screen` command returning distress flag, high-stakes category, and resources

## 2. Backend — export & erase (FR15)
- [x] 2.1 `export_markdown(conn) -> String`: all entities in Markdown
- [x] 2.2 `export_data` command: write the Markdown to a file under Downloads, return the path
- [x] 2.3 `erase_all(conn)`: wipe all user rows (keep schema); `erase_all` command guarded by a confirmation token

## 3. Front
- [x] 3.1 Persistent "not a therapist" disclaimer (footer) + resources in settings (NFR14)
- [x] 3.2 Distress screen: on a hit, leave the flow and show calm local resources; do not run coaching AI on that text
- [x] 3.3 Screen the decision title/reality/why, new intention, review learning
- [x] 3.4 High-stakes gentle banner in the decision flow (non-blocking, NFR16)
- [x] 3.5 Settings: "export my data" (shows the path) and "erase everything" (two-step confirm)

## 4. Verification
- [x] 4.1 A crisis phrase is detected and the resources are returned; the text is never sent anywhere   — cargo test
- [x] 4.2 A neutral phrase is not flagged (no over-firing on ordinary sadness words)   — cargo test
- [x] 4.3 A high-stakes phrase is flagged as such (not as distress)   — cargo test
- [x] 4.4 Export produces Markdown containing the stored data; erase wipes all rows   — cargo test
- [x] 4.5 Live: distress screen replaces the flow; disclaimer visible; export/erase work   — verified on-screen: a crisis phrase yielded to the resources screen (no decision created), disclaimer footer present, export wrote a real .md to Downloads, two-step erase completed

## Status
Compiles; front typechecks. 12 headless tests pass, incl. distress detection,
no-over-fire on ordinary sadness, high-stakes flagging, and export/erase. Screening
is local-only (no model, no network). GUI check pending.
