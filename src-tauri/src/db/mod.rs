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
const MIGRATION_0002: &str = include_str!("migrations/0002_captures.sql");
const MIGRATION_0003: &str = include_str!("migrations/0003_indexes.sql");

/// Ordered, forward-only migrations. Each runs once, in order.
const MIGRATIONS: &[(i64, &str)] = &[
    (1, MIGRATION_0001),
    (2, MIGRATION_0002),
    (3, MIGRATION_0003),
];

/// Register the sqlite-vec extension so every new connection exposes `vec0`.
/// Safe to call once at startup, before opening any connection.
pub fn register_vec() {
    #[allow(clippy::missing_transmute_annotations)] // the canonical sqlite-vec pattern
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
    conn.pragma_update(None, "foreign_keys", "ON")
        .map_err(|e| e.to_string())?;
    conn.query_row("SELECT count(*) FROM sqlite_master", [], |r| {
        r.get::<_, i64>(0)
    })
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

    for (version, sql) in MIGRATIONS {
        let applied: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM _schema_migrations WHERE version = ?1)",
                [version],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if !applied {
            conn.execute_batch(sql).map_err(|e| e.to_string())?;
            conn.execute(
                "INSERT INTO _schema_migrations (version, applied_at) VALUES (?1, ?2)",
                rusqlite::params![version, chrono::Utc::now().to_rfc3339()],
            )
            .map_err(|e| e.to_string())?;
        }
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

        assert!(
            repo::list_decisions(&conn).unwrap().is_empty(),
            "soft-deleted excluded"
        );
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
            ids.push(
                compass::create_domain(&conn, &format!("pan {i}"))
                    .unwrap()
                    .id,
            );
        }
        let over = compass::create_domain(&conn, "un de trop").unwrap_err();
        assert_eq!(over.code, "cap_reached");

        // Per-area intention cap: 3 succeed, the 4th is refused.
        let dom = &ids[0];
        for i in 0..compass::INTENTION_ACTIVE_CAP {
            compass::create_intention(&conn, dom, &format!("intention {i}"), None, None, "should")
                .unwrap();
        }
        let over_i =
            compass::create_intention(&conn, dom, "quatrième", None, None, "may").unwrap_err();
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
        assert_eq!(
            decision::finalize(&conn, &d.id).unwrap_err().code,
            "incomplete"
        );

        // Two options, no null option: still refused.
        decision::add_option(&conn, &d.id, "rester", false).unwrap();
        let leaning = decision::add_option(&conn, &d.id, "partir", false).unwrap();
        assert_eq!(
            decision::finalize(&conn, &d.id).unwrap_err().code,
            "incomplete"
        );

        // Add the null option → three options incl. null.
        decision::add_option(&conn, &d.id, "et si aucune ?", true).unwrap();

        // Choose the leaning option but skip debiasing → refused.
        decision::choose_option(&conn, &d.id, &leaning.id).unwrap();
        assert_eq!(
            decision::finalize(&conn, &d.id).unwrap_err().code,
            "incomplete"
        );

        // Pre-mortem + 10/10/10 + why, but no story yet → still refused.
        decision::set_option_premortem(&conn, &leaning.id, "j'ai foncé sans épargne").unwrap();
        decision::set_distance(
            &conn,
            &d.id,
            "10 min: tendu; 10 mois: soulagé; 10 ans: fier",
        )
        .unwrap();
        decision::set_why(&conn, &d.id, "je veux un travail aligné avec mes proches").unwrap();
        assert_eq!(
            decision::finalize(&conn, &d.id).unwrap_err().code,
            "incomplete"
        );

        // Add the next small step and a delta → now complete.
        decision::add_story(
            &conn,
            &d.id,
            "appeler un mentor",
            None,
            Some("vendredi"),
            None,
        )
        .unwrap();
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

    #[test]
    fn guided_decision_flow_finalizes_without_a_delta() {
        // Mirrors exactly what the conversational `branchDecision` writes: two
        // real options + an explicit null option, a chosen option with a
        // pre-mortem, the 10/10/10 distance, the why, and one next small step —
        // and crucially NO delta. Proves the guided path reaches a valid
        // `proposed` decision (the parity the old flow silently failed to hit).
        use repo::decision;
        register_vec();
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();

        let d = decision::open_decision(&conn, "est-ce que je change de job ?").unwrap();
        decision::add_option(&conn, &d.id, "rester un an de plus", false).unwrap();
        let chosen = decision::add_option(&conn, &d.id, "candidater ailleurs", false).unwrap();
        decision::add_option(&conn, &d.id, "aucune de celles-là", true).unwrap();

        decision::choose_option(&conn, &d.id, &chosen.id).unwrap();
        decision::set_option_premortem(&conn, &chosen.id, "j'ai signé sans voir la charge")
            .unwrap();
        decision::set_distance(&conn, &d.id, "10 min: net; 10 mois: posé; 10 ans: logique")
            .unwrap();
        decision::set_why(&conn, &d.id, "retrouver de l'énergie le soir").unwrap();
        decision::add_story(&conn, &d.id, "mettre mon CV à jour", None, None, None).unwrap();

        let finalized = decision::finalize(&conn, &d.id).unwrap();
        assert_eq!(finalized.status, "proposed");

        let detail = decision::get_detail(&conn, &d.id).unwrap();
        assert_eq!(detail.options.len(), 3);
        assert!(detail.options.iter().any(|o| o.is_null_option));
        assert!(detail
            .options
            .iter()
            .any(|o| o.chosen && o.premortem.is_some()));
        assert!(detail.decision.distance_10_10_10.is_some());
        assert!(detail.decision.proposal.is_some());
        assert_eq!(detail.stories.len(), 1);
        assert_eq!(detail.deltas.len(), 0);
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
        let intent =
            compass::create_intention(&conn, &dom, "être présent", None, None, "must").unwrap();

        // 5.1 / 5.2 — replay + record an outcome and a learning, compassionately.
        let rev = review::open_review(&conn, Some("2026-08-24"), Some("2026-08-31")).unwrap();
        review::add_item(
            &conn,
            &rev.id,
            Some(&intent.id),
            None,
            Some("too_early"),
            Some("pas encore l'occasion"),
        )
        .unwrap();
        assert_eq!(review::list_items(&conn, &rev.id).unwrap().len(), 1);
        // Unknown outcome is rejected.
        assert_eq!(
            review::add_item(&conn, &rev.id, Some(&intent.id), None, Some("failed"), None)
                .unwrap_err()
                .code,
            "invalid"
        );
        let recorded: i64 = conn
            .query_row(
                "SELECT count(*) FROM events WHERE type='review.item_recorded'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(recorded, 1);

        // 5.3 / FR8 — integrate a proposed decision: its added delta becomes a new
        // intention in the chosen area, the delta is applied, the decision applied.
        let (dec_id, delta_id) = proposed_decision_with_added_delta(
            &conn,
            "protéger mes soirées ?",
            "protéger mes soirées",
        );
        assert_eq!(decision::list_proposed_decisions(&conn).unwrap().len(), 1);

        let before = compass::list_intentions(&conn, &dom).unwrap().len();
        let applied = decision::apply_decision(
            &conn,
            &dec_id,
            &[DeltaResolution {
                delta_id: delta_id.clone(),
                domain_id: Some(dom.clone()),
                target_intention_id: None,
            }],
        )
        .unwrap();
        assert_eq!(applied.status, "applied");
        assert_eq!(
            compass::list_intentions(&conn, &dom).unwrap().len(),
            before + 1
        );
        let delta_applied: Option<String> = conn
            .query_row(
                "SELECT applied_at FROM deltas WHERE id=?1",
                [&delta_id],
                |r| r.get(0),
            )
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

        let (dec_id, delta_id) =
            proposed_decision_with_added_delta(&conn, "un de plus ?", "encore un");
        let err = decision::apply_decision(
            &conn,
            &dec_id,
            &[DeltaResolution {
                delta_id,
                domain_id: Some(dom.clone()),
                target_intention_id: None,
            }],
        )
        .unwrap_err();
        assert_eq!(err.code, "cap_reached");

        // Rolled back: no extra intention, decision still proposed (nothing merged).
        assert_eq!(
            compass::list_intentions(&conn, &dom).unwrap().len() as i64,
            compass::INTENTION_ACTIVE_CAP
        );
        assert_eq!(
            decision::get_decision(&conn, &dec_id).unwrap().status,
            "proposed"
        );
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
        compass::create_intention(
            &conn,
            &dom,
            "être présent pour mon frère",
            None,
            None,
            "must",
        )
        .unwrap();
        let hits = memory::keyword_search(&conn, "frère", 5).unwrap();
        assert_eq!(hits.len(), 1);
        assert!(memory::fetch_hits(&conn, &hits).unwrap()[0]
            .content
            .contains("frère"));

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
        let ai = crate::ai::Ai::from_env();
        assert!(ai
            .contradiction_question("changer de job", &[])
            .await
            .unwrap()
            .is_none());
    }

    #[test]
    fn sync_roundtrip_merges_and_last_write_wins() {
        use crate::sync;
        use repo::compass;
        use serde_json::json;
        register_vec();

        // Device A with some data.
        let a = Connection::open_in_memory().unwrap();
        migrate(&a).unwrap();
        let dom = compass::create_domain(&a, "Mes proches").unwrap().id;
        compass::create_intention(&a, &dom, "être présent", None, None, "must").unwrap();

        // Fresh device B imports A's snapshot → B reproduces the data.
        let b = Connection::open_in_memory().unwrap();
        migrate(&b).unwrap();
        let snap = sync::export_json(&a).unwrap();
        let sum = sync::import_merge(&b, &snap).unwrap();
        assert!(sum.inserted > 0);
        assert_eq!(compass::list_domains(&b).unwrap().len(), 1);
        assert_eq!(compass::list_intentions(&b, &dom).unwrap().len(), 1);

        // Newer incoming row wins; older does not overwrite.
        let newer = json!({"tables":{"domains":[{
            "id": dom, "name": "Proches (à jour)", "sort_order": 0, "status": "active",
            "created_at": "2026-05-01T00:00:00Z", "updated_at": "2999-01-01T00:00:00Z", "deleted_at": null
        }]}});
        assert_eq!(sync::import_merge(&b, &newer).unwrap().updated, 1);
        assert_eq!(
            compass::list_domains(&b).unwrap()[0].name,
            "Proches (à jour)"
        );

        let older = json!({"tables":{"domains":[{
            "id": dom, "name": "vieux nom", "sort_order": 0, "status": "active",
            "created_at": "2026-05-01T00:00:00Z", "updated_at": "2000-01-01T00:00:00Z", "deleted_at": null
        }]}});
        assert_eq!(sync::import_merge(&b, &older).unwrap().skipped, 1);
        assert_eq!(
            compass::list_domains(&b).unwrap()[0].name,
            "Proches (à jour)"
        );

        // Re-importing the same snapshot unions events without duplicating them.
        let before: i64 = b
            .query_row("SELECT count(*) FROM events", [], |r| r.get(0))
            .unwrap();
        sync::import_merge(&b, &snap).unwrap();
        let after: i64 = b
            .query_row("SELECT count(*) FROM events", [], |r| r.get(0))
            .unwrap();
        assert_eq!(before, after, "events are unioned, not duplicated");
    }

    #[test]
    fn sync_age_encrypt_decrypt_roundtrips_and_rejects_wrong_passphrase() {
        use crate::sync;
        let plain = b"instantane secret";
        let enc = sync::encrypt(plain, "phrase-secrete-123").unwrap();
        assert_ne!(enc, plain);
        assert_eq!(sync::decrypt(&enc, "phrase-secrete-123").unwrap(), plain);
        assert!(sync::decrypt(&enc, "mauvaise").is_err());
    }

    #[test]
    fn daily_capture_migration_persist_export_and_erase() {
        use repo::{admin, capture};
        register_vec();
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();
        migrate(&conn).unwrap(); // 0002 applies once; re-run is a no-op

        // 4.1 — migration 0002 created the captures table.
        let has: i64 = conn
            .query_row(
                "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='captures'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(has, 1);

        // 4.2 — a capture persists, is listed, and logs an event.
        capture::add_capture(
            &conn,
            "pensé à appeler mon frère ce soir",
            "note",
            None,
            None,
        )
        .unwrap();
        assert_eq!(capture::list_recent(&conn, 30).unwrap().len(), 1);
        let ev: i64 = conn
            .query_row(
                "SELECT count(*) FROM events WHERE type='capture.added'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(ev, 1);
        // Empty content is refused.
        assert_eq!(
            capture::add_capture(&conn, "   ", "note", None, None)
                .unwrap_err()
                .code,
            "invalid"
        );

        // 4.3 — export includes captures; erase wipes them.
        assert!(admin::export_markdown(&conn)
            .unwrap()
            .contains("appeler mon frère"));
        admin::erase_all(&conn).unwrap();
        assert!(capture::list_recent(&conn, 30).unwrap().is_empty());
    }

    #[test]
    fn next_step_if_then_and_follow_through() {
        use repo::{decision, story};
        register_vec();
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();

        // A finalized decision yields a story (its "petit pas").
        let (dec, _delta) =
            proposed_decision_with_added_delta(&conn, "reprendre le sport ?", "bouger plus");
        let st = decision::list_stories(&conn, &dec).unwrap();
        assert_eq!(st.len(), 1);
        let story_id = st[0].id.clone();

        // It appears among the open steps on home.
        assert_eq!(story::list_open_stories(&conn).unwrap().len(), 1);

        // 3.1 — pre-wire an if-then; it persists and logs an event.
        story::add_if_then(
            &conn,
            &story_id,
            Some(&dec),
            None,
            None,
            None,
            "il est 7h",
            "je mets mes baskets",
        )
        .unwrap();
        let plans = story::list_if_then(&conn, &story_id).unwrap();
        assert_eq!(plans.len(), 1);
        assert_eq!(plans[0].cue, "il est 7h");
        assert_eq!(plans[0].action, "je mets mes baskets");
        let ev: i64 = conn
            .query_row(
                "SELECT count(*) FROM events WHERE type='if_then.added'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(ev, 1);

        // Empty cue/action is refused.
        assert_eq!(
            story::add_if_then(&conn, &story_id, None, None, None, None, "", "x")
                .unwrap_err()
                .code,
            "invalid"
        );

        // 3.2 — marking it done removes it from the open list, record kept.
        story::set_story_status(&conn, &story_id, "done").unwrap();
        assert!(story::list_open_stories(&conn).unwrap().is_empty());
        let still_there: i64 = conn
            .query_row(
                "SELECT count(*) FROM stories WHERE id = ?1",
                [&story_id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(still_there, 1);
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
        compass::create_intention(
            &conn,
            &dom,
            "être présent pour mon frère",
            None,
            None,
            "must",
        )
        .unwrap();
        compass::create_intention(
            &conn,
            &dom,
            "appeler mon frère plus souvent",
            None,
            None,
            "should",
        )
        .unwrap();

        let themes = profile::extract_themes(&conn, 6).unwrap();
        assert!(
            themes.iter().any(|t| t.term == "frère" && t.count >= 2),
            "recurring term surfaces"
        );
        assert!(
            !themes.iter().any(|t| t.term == "pour" || t.term == "mon"),
            "stopwords excluded"
        );
    }

    #[test]
    fn export_contains_data_and_erase_wipes_everything() {
        use repo::{admin, compass};
        register_vec();
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();

        let dom = compass::create_domain(&conn, "Mes proches").unwrap().id;
        compass::create_intention(
            &conn,
            &dom,
            "être présent pour mon frère",
            None,
            None,
            "must",
        )
        .unwrap();
        let (_dec, _delta) =
            proposed_decision_with_added_delta(&conn, "changer de job ?", "protéger mes soirées");

        // Export (FR15): the Markdown contains the stored data.
        let md = admin::export_markdown(&conn).unwrap();
        assert!(md.contains("Mes proches"));
        assert!(md.contains("être présent pour mon frère"));
        assert!(md.contains("changer de job ?"));

        // Erase (FR15): every user table is emptied.
        admin::erase_all(&conn).unwrap();
        for table in [
            "domains",
            "intentions",
            "decisions",
            "deltas",
            "stories",
            "memory_chunks",
            "events",
            "settings",
        ] {
            let n: i64 = conn
                .query_row(&format!("SELECT count(*) FROM {table}"), [], |r| r.get(0))
                .unwrap();
            assert_eq!(n, 0, "{table} should be empty after erase");
        }
    }

    #[test]
    fn sync_merge_updates_memory_fts_in_place_without_orphans() {
        use crate::sync;
        use repo::memory;
        register_vec();

        let a = Connection::open_in_memory().unwrap();
        migrate(&a).unwrap();
        let b = Connection::open_in_memory().unwrap();
        migrate(&b).unwrap();

        // Chunk created on A, imported into B, updated on A, merged again into B.
        memory::write_chunk(&a, "ancien contenu unique", "note", Some("m1")).unwrap();
        sync::import_merge(&b, &sync::export_json(&a).unwrap()).unwrap();
        let rowid_before: i64 = b
            .query_row(
                "SELECT rowid FROM memory_chunks WHERE source_id = 'm1'",
                [],
                |r| r.get(0),
            )
            .unwrap();

        memory::write_chunk(&a, "nouveau contenu unique", "note", Some("m1")).unwrap();
        sync::import_merge(&b, &sync::export_json(&a).unwrap()).unwrap();

        // The merge updates the row in place (not REPLACE): the FTS index mirrors
        // the content table one-for-one, with no orphaned entry.
        let fts: i64 = b
            .query_row("SELECT count(*) FROM memory_fts", [], |r| r.get(0))
            .unwrap();
        let chunks: i64 = b
            .query_row("SELECT count(*) FROM memory_chunks", [], |r| r.get(0))
            .unwrap();
        assert_eq!(fts, chunks, "FTS entries must match chunks one-for-one");

        // Same rowid preserved: the "larger rowid = newer" recency heuristic holds.
        let rowid_after: i64 = b
            .query_row(
                "SELECT rowid FROM memory_chunks WHERE source_id = 'm1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(
            rowid_before, rowid_after,
            "merge must not hand the row a new rowid"
        );

        assert_eq!(memory::keyword_search(&b, "nouveau", 5).unwrap().len(), 1);
        assert_eq!(memory::keyword_search(&b, "ancien", 5).unwrap().len(), 0);
    }

    #[test]
    fn confidence_is_recorded_and_noop_updates_fail_without_events() {
        use repo::{compass, decision, story};
        register_vec();
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();

        // Setting a confidence records its audit event (it never did before).
        let d = decision::open_decision(&conn, "changer de job ?").unwrap();
        decision::set_confidence(&conn, &d.id, 72).unwrap();
        let (n, payload): (i64, String) = conn
            .query_row(
                "SELECT count(*), MAX(payload) FROM events WHERE type='decision.confidence_set'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(n, 1);
        assert_eq!(payload, "72");

        let events_before: i64 = conn
            .query_row("SELECT count(*) FROM events", [], |r| r.get(0))
            .unwrap();

        // Updating a row that does not exist fails loudly and records nothing.
        assert_eq!(
            compass::rename_domain(&conn, "inexistant", "x")
                .unwrap_err()
                .code,
            "invalid"
        );
        assert_eq!(
            compass::archive_intention(&conn, "inexistant")
                .unwrap_err()
                .code,
            "invalid"
        );
        assert_eq!(
            decision::set_confidence(&conn, "inexistant", 10)
                .unwrap_err()
                .code,
            "invalid"
        );
        assert_eq!(
            story::set_story_status(&conn, "inexistant", "done")
                .unwrap_err()
                .code,
            "invalid"
        );

        let events_after: i64 = conn
            .query_row("SELECT count(*) FROM events", [], |r| r.get(0))
            .unwrap();
        assert_eq!(
            events_before, events_after,
            "no-op updates must not record events"
        );
    }

    #[test]
    fn import_rejects_unknown_columns_and_bad_timestamps() {
        use crate::sync;
        use repo::compass;
        use serde_json::json;
        register_vec();
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();
        let dom = compass::create_domain(&conn, "Mes proches").unwrap().id;

        // An unknown column would be interpolated into the INSERT: refused,
        // and nothing is written (the row would otherwise win by LWW).
        let hostile = json!({"tables":{"domains":[{
            "id": dom, "name": "piraté", "sort_order": 0, "status": "active",
            "created_at": "2026-05-01T00:00:00Z", "updated_at": "2999-01-01T00:00:00Z",
            "deleted_at": null, "evil_col": "x"
        }]}});
        assert_eq!(
            sync::import_merge(&conn, &hostile).unwrap_err().code,
            "invalid"
        );
        assert_eq!(compass::list_domains(&conn).unwrap()[0].name, "Mes proches");

        // A non-RFC3339 timestamp is refused: LWW compares instants and the
        // Markdown export slices the day part out of these values.
        let bad_ts = json!({"tables":{"domains":[{
            "id": dom, "name": "horodatage cassé", "sort_order": 0, "status": "active",
            "created_at": "2026-05-01T00:00:00Z", "updated_at": "pas-une-date", "deleted_at": null
        }]}});
        assert_eq!(
            sync::import_merge(&conn, &bad_ts).unwrap_err().code,
            "invalid"
        );
        assert_eq!(compass::list_domains(&conn).unwrap()[0].name, "Mes proches");
    }

    #[tokio::test]
    #[ignore = "requires a running Ollama with LIFEOS_MODEL pulled"]
    async fn live_guided_decision_end_to_end() {
        // The full guided path against a real model and a real DB file — the
        // exact sequence `branchDecision` drives through the commands: open,
        // AI-suggested options + explicit null, choose, pre-mortem, 10/10/10,
        // why, compass alignment (AI), confidence, AI-suggested step, finalize.
        use crate::ai::Ai;
        use repo::{compass, decision};
        register_vec();
        let path = std::env::temp_dir().join(format!("life-os-e2e-{}.db", std::process::id()));
        let _ = std::fs::remove_file(&path);
        let conn = Connection::open(&path).unwrap();
        migrate(&conn).unwrap();

        // A compass with one intention, so alignment has something to read.
        let dom = compass::create_domain(&conn, "Santé").unwrap();
        compass::create_intention(
            &conn,
            &dom.id,
            "Bouger tous les jours",
            Some("mon réveil sonne"),
            Some("je sors marcher 10 minutes"),
            "should",
        )
        .unwrap();

        let ai = Ai::from_env();
        assert!(ai.health().await.ok, "Ollama injoignable");

        let d = decision::open_decision(&conn, "comment tenir le sport sur une année ?").unwrap();

        // 1) AI widens the doors; the flow keeps the non-empty ones.
        let suggested = ai
            .suggest_options("comment tenir le sport sur une année ?", None)
            .await
            .expect("suggest_options failed");
        let real: Vec<String> = suggested
            .options
            .into_iter()
            .filter(|o| !o.trim().is_empty())
            .take(4)
            .collect();
        assert!(
            real.len() >= 2,
            "expected >=2 AI options, got {}",
            real.len()
        );

        // 2) Persist them + the explicit null option, exactly like the flow.
        let mut opts = Vec::new();
        for label in &real {
            opts.push(decision::add_option(&conn, &d.id, label, false).unwrap());
        }
        opts.push(decision::add_option(&conn, &d.id, "Aucune de celles-là", true).unwrap());
        assert!(opts.len() >= 3);

        // 3) Weigh one, then debias it.
        let chosen = &opts[0];
        decision::choose_option(&conn, &d.id, &chosen.id).unwrap();
        decision::set_option_premortem(
            &conn,
            &chosen.id,
            "j'ai visé sept séances par semaine et tout lâché au mois de février",
        )
        .unwrap();
        decision::set_distance(
            &conn,
            &d.id,
            "10 min: motivé; 10 mois: ça tient; 10 ans: une habitude",
        )
        .unwrap();
        decision::set_why(&conn, &d.id, "de l'énergie pour les gens que j'aime").unwrap();

        // 4) Alignment against the compass (real model), then confidence.
        let intentions = "Bouger tous les jours";
        let note = ai
            .align_values(&chosen.label, intentions, None)
            .await
            .expect("align_values failed");
        assert!(!note.note.trim().is_empty(), "empty alignment note");
        decision::set_alignment(&conn, &d.id, &note.note).unwrap();
        decision::set_confidence(&conn, &d.id, 4).unwrap();

        // 5) One tiny first step (real model), then close the session.
        let step = ai
            .generate_story(&format!("{} — {}", d.title, chosen.label), None)
            .await
            .expect("generate_story failed");
        decision::add_story(&conn, &d.id, &step.title, step.why.as_deref(), None, None).unwrap();

        let finalized = decision::finalize(&conn, &d.id).unwrap();
        assert_eq!(finalized.status, "proposed");
        assert!(finalized.values_alignment_note.is_some());

        // The outcome is remembered for later recall.
        let remembered: i64 = conn
            .query_row(
                "SELECT count(*) FROM memory_chunks WHERE source_type='decision' AND source_id=?1",
                [&d.id],
                |r| r.get(0),
            )
            .unwrap();
        assert!(remembered >= 1, "the finalized decision was not remembered");

        drop(conn);
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(format!("{}-wal", path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", path.display()));
    }
}
