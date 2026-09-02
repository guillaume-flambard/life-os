//! Typed data access. Every mutation records an append-only event and never
//! physically deletes a row (soft-delete via `deleted_at`).

pub mod admin;
pub mod capture;
pub mod compass;
pub mod decision;
pub mod memory;
pub mod profile;
pub mod review;
pub mod story;

use crate::domain::{ApiError, Decision};
use crate::events;
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

/// Runs `f` inside a transaction: the row change, its audit event, and any
/// derived write (memory chunk) commit together or not at all. Composable —
/// a call nested inside an open transaction (e.g. `apply_decision` calling
/// `compass::create_intention`) simply joins the outer transaction instead of
/// starting a conflicting one.
pub(crate) fn with_tx<T>(
    conn: &Connection,
    f: impl FnOnce(&Connection) -> Result<T, ApiError>,
) -> Result<T, ApiError> {
    if !conn.is_autocommit() {
        // Already inside a transaction: the outer one owns the atomicity.
        return f(conn);
    }
    let tx = conn.unchecked_transaction().map_err(ApiError::db)?;
    let out = f(&tx)?;
    tx.commit().map_err(ApiError::db)?;
    Ok(out)
}

/// Reject a mutation that matched no row: succeeding silently (and recording an
/// event for a change that never happened) is worse than failing loudly.
pub(crate) fn require_affected(n: usize, message: &str) -> Result<(), ApiError> {
    if n == 0 {
        Err(ApiError::invalid(message.to_string()))
    } else {
        Ok(())
    }
}

/// Same as `with_tx` for the legacy functions that surface `rusqlite::Error`.
pub(crate) fn with_tx_rusqlite<T>(
    conn: &Connection,
    f: impl FnOnce(&Connection) -> rusqlite::Result<T>,
) -> rusqlite::Result<T> {
    if !conn.is_autocommit() {
        return f(conn);
    }
    let tx = conn.unchecked_transaction()?;
    let out = f(&tx)?;
    tx.commit()?;
    Ok(out)
}

// --- Settings -------------------------------------------------------------

pub fn get_setting(conn: &Connection, key: &str) -> rusqlite::Result<Option<String>> {
    conn.query_row("SELECT value FROM settings WHERE key = ?1", [key], |r| {
        r.get(0)
    })
    .optional()
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    with_tx_rusqlite(conn, |conn| {
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            params![key, value, now],
        )?;
        events::record(conn, "setting.set", "setting", key, Some(value))?;
        Ok(())
    })
}

// --- Decisions (demonstrates the create / soft-delete + event pattern) -----

pub fn create_decision(conn: &Connection, title: &str) -> rusqlite::Result<Decision> {
    with_tx_rusqlite(conn, |conn| {
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
    })
}

pub fn soft_delete_decision(conn: &Connection, id: &str) -> rusqlite::Result<()> {
    with_tx_rusqlite(conn, |conn| {
        let now = Utc::now().to_rfc3339();
        let n = conn.execute(
            "UPDATE decisions SET deleted_at = ?2, updated_at = ?2 WHERE id = ?1 AND deleted_at IS NULL",
            params![id, now],
        )?;
        if n == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        events::record(conn, "decision.deleted", "decision", id, None)?;
        Ok(())
    })
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
