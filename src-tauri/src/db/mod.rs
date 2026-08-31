//! Database bootstrap: register sqlite-vec, open the encrypted connection,
//! run forward-only migrations. The connection is owned by the backend and
//! guarded by a Mutex; the front reaches it only through commands.

pub mod encryption;
pub mod repo;

use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

/// Held in Tauri state.
pub struct Db(pub Mutex<Connection>);

const MIGRATION_0001: &str = include_str!("migrations/0001_init.sql");

/// Register the sqlite-vec extension so every new connection exposes `vec0`.
/// Safe to call once at startup, before opening any connection.
pub fn register_vec() {
    unsafe {
        rusqlite::ffi::sqlite3_auto_extension(Some(std::mem::transmute(
            sqlite_vec::sqlite3_vec_init as *const (),
        )));
    }
}

/// Open the encrypted DB at `path`, apply the key, verify readability, migrate.
pub fn open(path: &Path) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|e| e.to_string())?;

    let key = encryption::get_or_create_key()?;
    encryption::apply_key(&conn, &key).map_err(|e| e.to_string())?;

    // Fails here if the key is wrong (file is ciphertext).
    conn.pragma_update(None, "foreign_keys", "ON").map_err(|e| e.to_string())?;
    conn.query_row("SELECT count(*) FROM sqlite_master", [], |r| r.get::<_, i64>(0))
        .map_err(|e| format!("cannot read database (wrong key?): {e}"))?;

    migrate(&conn)?;
    Ok(conn)
}

/// Forward-only, idempotent migration runner.
fn migrate(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        );",
    )
    .map_err(|e| e.to_string())?;

    let applied: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM _schema_migrations WHERE version = 1)",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    if !applied {
        conn.execute_batch(MIGRATION_0001).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO _schema_migrations (version, applied_at) VALUES (1, ?1)",
            [chrono::Utc::now().to_rfc3339()],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::repo;
    use rusqlite::Connection;

    // Headless proof of the storage acceptance criteria: no keychain, no webview.
    #[test]
    fn migrate_is_idempotent_with_vec_fts_events_and_soft_delete() {
        register_vec();
        let conn = Connection::open_in_memory().expect("open");

        // Forward-only + idempotent: running twice is a no-op the second time.
        migrate(&conn).expect("migrate 1");
        migrate(&conn).expect("migrate 2");
        assert!(repo::schema_ready(&conn).unwrap());

        // vec0 and FTS5 virtual tables were created (extensions available).
        let virt: i64 = conn
            .query_row(
                "SELECT count(*) FROM sqlite_master WHERE name IN ('memory_vec','memory_fts')",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(virt, 2, "memory_vec + memory_fts must exist");

        // Mutation writes an event; soft-delete keeps the row but hides it.
        let d = repo::create_decision(&conn, "test").unwrap();
        repo::soft_delete_decision(&conn, &d.id).unwrap();

        assert!(repo::list_decisions(&conn).unwrap().is_empty(), "soft-deleted excluded");
        let physical: i64 = conn
            .query_row("SELECT count(*) FROM decisions", [], |r| r.get(0))
            .unwrap();
        assert_eq!(physical, 1, "row is soft-deleted, not removed");
        let events: i64 = conn
            .query_row("SELECT count(*) FROM events", [], |r| r.get(0))
            .unwrap();
        assert_eq!(events, 2, "create + delete each recorded an event");
    }

    #[test]
    fn compass_caps_are_enforced() {
        use repo::compass;
        register_vec();
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();

        // Area cap: 5 succeed, the 6th is refused with cap_reached.
        let mut ids = Vec::new();
        for i in 0..compass::DOMAIN_ACTIVE_CAP {
            ids.push(compass::create_domain(&conn, &format!("pan {i}")).unwrap().id);
        }
        let over = compass::create_domain(&conn, "un de trop").unwrap_err();
        assert_eq!(over.code, "cap_reached");

        // Per-area intention cap: 3 succeed, the 4th is refused.
        let dom = &ids[0];
        for i in 0..compass::INTENTION_ACTIVE_CAP {
            compass::create_intention(&conn, dom, &format!("intention {i}"), None, None, "should")
                .unwrap();
        }
        let over_i = compass::create_intention(&conn, dom, "quatrième", None, None, "may").unwrap_err();
        assert_eq!(over_i.code, "cap_reached");

        // Archiving frees a slot.
        let first = compass::list_intentions(&conn, dom).unwrap()[0].id.clone();
        compass::archive_intention(&conn, &first).unwrap();
        assert_eq!(compass::list_intentions(&conn, dom).unwrap().len(), 2);
        compass::create_intention(&conn, dom, "de nouveau possible", None, None, "should").unwrap();
        assert_eq!(compass::list_intentions(&conn, dom).unwrap().len(), 3);

        // Bad priority is rejected.
        let bad = compass::create_intention(&conn, dom, "x", None, None, "urgent").unwrap_err();
        assert_eq!(bad.code, "invalid");
    }

    #[test]
    fn decision_finalize_requires_a_complete_debiased_outcome() {
        use crate::domain::DeltaInput;
        use repo::decision;
        register_vec();
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();

        let d = decision::open_decision(&conn, "changer de job ?").unwrap();

        // Empty session: cannot finalize (NFR4).
        assert_eq!(decision::finalize(&conn, &d.id).unwrap_err().code, "incomplete");

        // Two options, no null option: still refused.
        decision::add_option(&conn, &d.id, "rester", false).unwrap();
        let leaning = decision::add_option(&conn, &d.id, "partir", false).unwrap();
        assert_eq!(decision::finalize(&conn, &d.id).unwrap_err().code, "incomplete");

        // Add the null option → three options incl. null.
        decision::add_option(&conn, &d.id, "et si aucune ?", true).unwrap();

        // Choose the leaning option but skip debiasing → refused.
        decision::choose_option(&conn, &d.id, &leaning.id).unwrap();
        assert_eq!(decision::finalize(&conn, &d.id).unwrap_err().code, "incomplete");

        // Pre-mortem + 10/10/10 + why, but no story yet → still refused.
        decision::set_option_premortem(&conn, &leaning.id, "j'ai foncé sans épargne").unwrap();
        decision::set_distance(&conn, &d.id, "10 min: tendu; 10 mois: soulagé; 10 ans: fier").unwrap();
        decision::set_why(&conn, &d.id, "je veux un travail aligné avec mes proches").unwrap();
        assert_eq!(decision::finalize(&conn, &d.id).unwrap_err().code, "incomplete");

        // Add the next small step and a delta → now complete.
        decision::add_story(&conn, &d.id, "appeler un mentor", None, Some("vendredi"), None).unwrap();
        decision::add_delta(
            &conn,
            &d.id,
            &DeltaInput {
                op: "added".into(),
                target_intention_id: None,
                domain_id: None,
                payload_statement: Some("protéger mes soirées".into()),
                payload_situation: None,
                payload_action: None,
                payload_priority: Some("should".into()),
            },
        )
        .unwrap();

        let finalized = decision::finalize(&conn, &d.id).unwrap();
        assert_eq!(finalized.status, "proposed");

        let detail = decision::get_detail(&conn, &d.id).unwrap();
        assert_eq!(detail.options.len(), 3);
        assert!(detail.options.iter().any(|o| o.is_null_option));
        assert_eq!(detail.stories.len(), 1);
        assert_eq!(detail.deltas.len(), 1);
        assert!(detail.decision.proposal.is_some());

        // The proposed event was recorded.
        let proposed: i64 = conn
            .query_row(
                "SELECT count(*) FROM events WHERE type='decision.proposed'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(proposed, 1);
    }
}
