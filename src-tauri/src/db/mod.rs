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

    // Builds a minimal proposed decision carrying one `added` delta, returns
    // (decision_id, delta_id).
    #[cfg(test)]
    fn proposed_decision_with_added_delta(
        conn: &Connection,
        title: &str,
        statement: &str,
    ) -> (String, String) {
        use crate::domain::DeltaInput;
        use repo::decision;
        let d = decision::open_decision(conn, title).unwrap();
        decision::add_option(conn, &d.id, "a", false).unwrap();
        let ch = decision::add_option(conn, &d.id, "b", false).unwrap();
        decision::add_option(conn, &d.id, "et si aucune ?", true).unwrap();
        decision::choose_option(conn, &d.id, &ch.id).unwrap();
        decision::set_option_premortem(conn, &ch.id, "raison").unwrap();
        decision::set_distance(conn, &d.id, "10/10/10").unwrap();
        decision::set_why(conn, &d.id, "pourquoi").unwrap();
        decision::add_story(conn, &d.id, "petit pas", None, None, None).unwrap();
        let delta = decision::add_delta(
            conn,
            &d.id,
            &DeltaInput {
                op: "added".into(),
                target_intention_id: None,
                domain_id: None,
                payload_statement: Some(statement.into()),
                payload_situation: None,
                payload_action: None,
                payload_priority: Some("should".into()),
            },
        )
        .unwrap();
        decision::finalize(conn, &d.id).unwrap();
        (d.id, delta.id)
    }

    #[test]
    fn review_records_items_and_integration_merges_delta() {
        use crate::domain::DeltaResolution;
        use repo::{compass, decision, review};
        register_vec();
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();

        let dom = compass::create_domain(&conn, "Mes proches").unwrap().id;
        let intent = compass::create_intention(&conn, &dom, "être présent", None, None, "must").unwrap();

        // 5.1 / 5.2 — replay + record an outcome and a learning, compassionately.
        let rev = review::open_review(&conn, Some("2026-08-24"), Some("2026-08-31")).unwrap();
        review::add_item(&conn, &rev.id, Some(&intent.id), None, Some("too_early"), Some("pas encore l'occasion")).unwrap();
        assert_eq!(review::list_items(&conn, &rev.id).unwrap().len(), 1);
        // Unknown outcome is rejected.
        assert_eq!(
            review::add_item(&conn, &rev.id, Some(&intent.id), None, Some("failed"), None).unwrap_err().code,
            "invalid"
        );
        let recorded: i64 = conn
            .query_row("SELECT count(*) FROM events WHERE type='review.item_recorded'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(recorded, 1);

        // 5.3 / FR8 — integrate a proposed decision: its added delta becomes a new
        // intention in the chosen area, the delta is applied, the decision applied.
        let (dec_id, delta_id) = proposed_decision_with_added_delta(&conn, "protéger mes soirées ?", "protéger mes soirées");
        assert_eq!(decision::list_proposed_decisions(&conn).unwrap().len(), 1);

        let before = compass::list_intentions(&conn, &dom).unwrap().len();
        let applied = decision::apply_decision(
            &conn,
            &dec_id,
            &[DeltaResolution { delta_id: delta_id.clone(), domain_id: Some(dom.clone()), target_intention_id: None }],
        )
        .unwrap();
        assert_eq!(applied.status, "applied");
        assert_eq!(compass::list_intentions(&conn, &dom).unwrap().len(), before + 1);
        let delta_applied: Option<String> = conn
            .query_row("SELECT applied_at FROM deltas WHERE id=?1", [&delta_id], |r| r.get(0))
            .unwrap();
        assert!(delta_applied.is_some());
        assert!(decision::list_proposed_decisions(&conn).unwrap().is_empty());
    }

    #[test]
    fn integration_respects_the_cap_and_merges_nothing_on_failure() {
        use crate::domain::DeltaResolution;
        use repo::{compass, decision};
        register_vec();
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();

        // Fill an area to its intention cap.
        let dom = compass::create_domain(&conn, "Plein").unwrap().id;
        for i in 0..compass::INTENTION_ACTIVE_CAP {
            compass::create_intention(&conn, &dom, &format!("i{i}"), None, None, "should").unwrap();
        }

        let (dec_id, delta_id) = proposed_decision_with_added_delta(&conn, "un de plus ?", "encore un");
        let err = decision::apply_decision(
            &conn,
            &dec_id,
            &[DeltaResolution { delta_id, domain_id: Some(dom.clone()), target_intention_id: None }],
        )
        .unwrap_err();
        assert_eq!(err.code, "cap_reached");

        // Rolled back: no extra intention, decision still proposed (nothing merged).
        assert_eq!(
            compass::list_intentions(&conn, &dom).unwrap().len() as i64,
            compass::INTENTION_ACTIVE_CAP
        );
        assert_eq!(decision::get_decision(&conn, &dec_id).unwrap().status, "proposed");
    }

    fn unit_vec(idx: usize) -> Vec<f32> {
        let mut v = vec![0.0f32; 768];
        v[idx] = 1.0;
        v
    }

    #[test]
    fn memory_indexes_on_create_and_recalls_by_keyword_and_vector() {
        use repo::{compass, memory};
        register_vec();
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();

        // 5.1 — creating an intention writes a chunk found by keyword search.
        let dom = compass::create_domain(&conn, "Mes proches").unwrap().id;
        compass::create_intention(&conn, &dom, "être présent pour mon frère", None, None, "must").unwrap();
        let hits = memory::keyword_search(&conn, "frère", 5).unwrap();
        assert_eq!(hits.len(), 1);
        assert!(memory::fetch_hits(&conn, &hits).unwrap()[0].content.contains("frère"));

        // 5.2 — vector KNN returns the nearest chunk for a query embedding.
        let a = memory::write_chunk(&conn, "orienté axe 0", "note", Some("a")).unwrap();
        let b = memory::write_chunk(&conn, "orienté axe 1", "note", Some("b")).unwrap();
        memory::insert_vec(&conn, &a, &unit_vec(0)).unwrap();
        memory::insert_vec(&conn, &b, &unit_vec(1)).unwrap();
        let mut query = unit_vec(0);
        query[1] = 0.1; // closest to `a`
        let near = memory::semantic_search(&conn, &query, 2).unwrap();
        assert_eq!(near.first().map(String::as_str), Some(a.as_str()));
    }

    #[test]
    fn fusion_unions_both_searches_and_recency_breaks_ties() {
        use repo::memory;
        use std::collections::HashMap;
        // A found only by keyword, B only by semantic — both rank 0, equal RRF score.
        let kw = vec!["A".to_string()];
        let sem = vec!["B".to_string()];
        let mut rec = HashMap::new();
        rec.insert("A".to_string(), 1i64);
        rec.insert("B".to_string(), 2i64); // B is newer
        let fused = memory::fuse(&kw, &sem, &rec);
        assert_eq!(fused, vec!["B".to_string(), "A".to_string()]); // union, newer first on tie
    }

    #[tokio::test]
    async fn contradiction_is_silent_without_related_history() {
        // No related history → no model call, no question (FR10).
        let ai = crate::ai::Ollama::from_env();
        assert!(ai.contradiction_question("changer de job", &[]).await.unwrap().is_none());
    }

    #[test]
    fn profile_extracts_recurring_terms_and_is_empty_without_usage() {
        use repo::{compass, profile};
        register_vec();
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();

        // 4.4 — no usage yet → no themes.
        assert!(profile::extract_themes(&conn, 6).unwrap().is_empty());

        // 4.3 — a term the user repeats surfaces; stopwords do not.
        let dom = compass::create_domain(&conn, "Mes proches").unwrap().id;
        compass::create_intention(&conn, &dom, "être présent pour mon frère", None, None, "must").unwrap();
        compass::create_intention(&conn, &dom, "appeler mon frère plus souvent", None, None, "should").unwrap();

        let themes = profile::extract_themes(&conn, 6).unwrap();
        assert!(themes.iter().any(|t| t.term == "frère" && t.count >= 2), "recurring term surfaces");
        assert!(!themes.iter().any(|t| t.term == "pour" || t.term == "mon"), "stopwords excluded");
    }

    #[test]
    fn export_contains_data_and_erase_wipes_everything() {
        use repo::{admin, compass};
        register_vec();
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();

        let dom = compass::create_domain(&conn, "Mes proches").unwrap().id;
        compass::create_intention(&conn, &dom, "être présent pour mon frère", None, None, "must").unwrap();
        let (_dec, _delta) = proposed_decision_with_added_delta(&conn, "changer de job ?", "protéger mes soirées");

        // Export (FR15): the Markdown contains the stored data.
        let md = admin::export_markdown(&conn).unwrap();
        assert!(md.contains("Mes proches"));
        assert!(md.contains("être présent pour mon frère"));
        assert!(md.contains("changer de job ?"));

        // Erase (FR15): every user table is emptied.
        admin::erase_all(&conn).unwrap();
        for table in ["domains", "intentions", "decisions", "deltas", "stories", "memory_chunks", "events", "settings"] {
            let n: i64 = conn
                .query_row(&format!("SELECT count(*) FROM {table}"), [], |r| r.get(0))
                .unwrap();
            assert_eq!(n, 0, "{table} should be empty after erase");
        }
    }
}
