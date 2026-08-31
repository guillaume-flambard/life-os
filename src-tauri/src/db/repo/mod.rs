//! Typed data access. Every mutation records an append-only event and never
//! physically deletes a row (soft-delete via `deleted_at`).

pub mod admin;
pub mod compass;
pub mod decision;
pub mod memory;
pub mod profile;
pub mod review;

use crate::domain::Decision;
use crate::events;
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

// --- Settings -------------------------------------------------------------

pub fn get_setting(conn: &Connection, key: &str) -> rusqlite::Result<Option<String>> {
    conn.query_row("SELECT value FROM settings WHERE key = ?1", [key], |r| r.get(0))
        .optional()
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        params![key, value, now],
    )?;
    events::record(conn, "setting.set", "setting", key, Some(value))?;
    Ok(())
}

// --- Decisions (demonstrates the create / soft-delete + event pattern) -----

pub fn create_decision(conn: &Connection, title: &str) -> rusqlite::Result<Decision> {
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO decisions (id, title, status, created_at, updated_at)
         VALUES (?1, ?2, 'draft', ?3, ?3)",
        params![id, title, now],
    )?;
    events::record(conn, "decision.created", "decision", &id, Some(title))?;
    Ok(Decision {
        id,
        title: title.to_string(),
        status: "draft".into(),
        created_at: now.clone(),
        updated_at: now,
    })
}

pub fn soft_delete_decision(conn: &Connection, id: &str) -> rusqlite::Result<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE decisions SET deleted_at = ?2, updated_at = ?2 WHERE id = ?1",
        params![id, now],
    )?;
    events::record(conn, "decision.deleted", "decision", id, None)?;
    Ok(())
}

pub fn list_decisions(conn: &Connection) -> rusqlite::Result<Vec<Decision>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, status, created_at, updated_at
         FROM decisions WHERE deleted_at IS NULL ORDER BY created_at DESC",
    )?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Decision {
                id: r.get(0)?,
                title: r.get(1)?,
                status: r.get(2)?,
                created_at: r.get(3)?,
                updated_at: r.get(4)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

// --- Health ---------------------------------------------------------------

/// Cheap probe: the schema is present and readable.
pub fn schema_ready(conn: &Connection) -> rusqlite::Result<bool> {
    let n: i64 = conn.query_row(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='decisions'",
        [],
        |r| r.get(0),
    )?;
    Ok(n == 1)
}
