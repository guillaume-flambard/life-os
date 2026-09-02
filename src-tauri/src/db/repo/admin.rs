//! Whole-database operations: export everything to Markdown, and erase everything.
//! Both are user-facing rights (FR15). Erase is irreversible and guarded upstream
//! by an explicit confirmation.

use crate::domain::ApiError;
use chrono::Utc;
use rusqlite::Connection;

fn priority_label(p: &str) -> &str {
    match p {
        "must" => "ligne rouge",
        "should" => "j'aimerais",
        _ => "bonus",
    }
}

/// First 10 chars of an RFC3339 timestamp (the `YYYY-MM-DD` day part).
/// Char-boundary safe: a malformed or multi-byte string falls back to the
/// whole value instead of panicking mid-export.
fn day(s: &str) -> &str {
    s.get(..10).unwrap_or(s)
}

/// Assemble all user data into a single Markdown document (open, portable format).
pub fn export_markdown(conn: &Connection) -> Result<String, ApiError> {
    let mut out = String::new();
    out.push_str(&format!(
        "# Life OS — export\n\n_{}_\n",
        Utc::now().to_rfc3339()
    ));

    // Compass
    out.push_str("\n## Ta boussole\n");
    let mut dstmt = conn.prepare(
        "SELECT id, name, status FROM domains WHERE deleted_at IS NULL ORDER BY sort_order, created_at",
    )?;
    let domains = dstmt
        .query_map([], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
            ))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    for (id, name, status) in &domains {
        out.push_str(&format!(
            "\n### {name}{}\n",
            if status == "archived" {
                " (set aside)"
            } else {
                ""
            }
        ));
        let mut istmt = conn.prepare(
            "SELECT statement, situation, action, priority, status FROM intentions
             WHERE domain_id = ?1 AND deleted_at IS NULL ORDER BY created_at",
        )?;
        let rows = istmt
            .query_map([id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, Option<String>>(1)?,
                    r.get::<_, Option<String>>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, String>(4)?,
                ))
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        for (statement, situation, action, priority, status) in rows {
            let marker = match (situation, action) {
                (Some(s), Some(a)) => format!("{statement} — quand {s}, je {a}"),
                _ => statement,
            };
            out.push_str(&format!(
                "- [{}] {marker}{}\n",
                priority_label(&priority),
                if status == "archived" {
                    " _(set aside)_"
                } else {
                    ""
                }
            ));
        }
    }

    // Decision log
    out.push_str("\n## Your decision notebook\n");
    let mut decstmt = conn.prepare(
        "SELECT id, title, proposal, values_alignment_note, status, review_at
         FROM decisions WHERE deleted_at IS NULL ORDER BY created_at DESC",
    )?;
    let decisions = decstmt
        .query_map([], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, Option<String>>(2)?,
                r.get::<_, Option<String>>(3)?,
                r.get::<_, String>(4)?,
                r.get::<_, Option<String>>(5)?,
            ))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    for (id, title, proposal, alignment, status, review_at) in &decisions {
        out.push_str(&format!("\n### {title} ({status})\n"));
        if let Some(p) = proposal {
            out.push_str(&format!("- Pourquoi : {p}\n"));
        }
        if let Some(a) = alignment {
            out.push_str(&format!("- Against your compass: {a}\n"));
        }
        let mut xstmt = conn.prepare(
            "SELECT op, payload_statement FROM deltas WHERE decision_id = ?1 AND deleted_at IS NULL ORDER BY created_at",
        )?;
        for row in xstmt.query_map([id], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, Option<String>>(1)?))
        })? {
            let (op, stmt) = row?;
            out.push_str(&format!(
                "- What it changes: {op} — {}\n",
                stmt.unwrap_or_default()
            ));
        }
        let mut sstmt = conn.prepare(
            "SELECT title, when_cue FROM stories WHERE decision_id = ?1 AND deleted_at IS NULL ORDER BY created_at",
        )?;
        for row in sstmt.query_map([id], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, Option<String>>(1)?))
        })? {
            let (t, when) = row?;
            out.push_str(&format!(
                "- Prochain pas : {t}{}\n",
                when.map(|w| format!(" ({w})")).unwrap_or_default()
            ));
        }
        if let Some(rv) = review_at {
            out.push_str(&format!("- Check-in planned: {}\n", day(rv)));
        }
    }

    // Reviews
    out.push_str("\n## Le point\n");
    let mut rstmt = conn.prepare(
        "SELECT id, created_at FROM reviews WHERE deleted_at IS NULL ORDER BY created_at DESC",
    )?;
    let reviews = rstmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    for (id, created) in &reviews {
        out.push_str(&format!("\n### {}\n", day(created)));
        let mut istmt = conn.prepare(
            "SELECT outcome, learning FROM review_items WHERE review_id = ?1 AND deleted_at IS NULL ORDER BY created_at",
        )?;
        for row in istmt.query_map([id], |r| {
            Ok((
                r.get::<_, Option<String>>(0)?,
                r.get::<_, Option<String>>(1)?,
            ))
        })? {
            let (outcome, learning) = row?;
            out.push_str(&format!(
                "- {}{}\n",
                outcome.unwrap_or_default(),
                learning.map(|l| format!(" — {l}")).unwrap_or_default()
            ));
        }
    }

    // Captures
    out.push_str("\n## Captures\n");
    let mut cstmt = conn.prepare(
        "SELECT created_at, content FROM captures WHERE deleted_at IS NULL ORDER BY created_at DESC",
    )?;
    for row in cstmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))? {
        let (created, content) = row?;
        out.push_str(&format!("- {} — {content}\n", day(&created)));
    }

    Ok(out)
}

/// Erase every user row (schema and migration record are kept). Irreversible;
/// the caller must have confirmed. Children are deleted before parents so foreign
/// keys stay satisfied; deleting memory_chunks keeps the FTS index in sync via its
/// triggers.
pub fn erase_all(conn: &Connection) -> Result<(), ApiError> {
    conn.execute_batch(
        "BEGIN;
         DELETE FROM captures;
         DELETE FROM review_items;
         DELETE FROM reviews;
         DELETE FROM if_then_plans;
         DELETE FROM stories;
         DELETE FROM deltas;
         DELETE FROM decision_options;
         DELETE FROM decisions;
         DELETE FROM intentions;
         DELETE FROM domains;
         DELETE FROM memory_vec;
         DELETE FROM memory_chunks;
         DELETE FROM events;
         DELETE FROM settings;
         COMMIT;",
    )
    .map_err(ApiError::db)?;
    Ok(())
}
