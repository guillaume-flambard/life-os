//! Append-only event log. Every mutation records one row here; the table is
//! never updated or deleted, keeping the door open for a future sync engine.

use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

pub fn record(
    conn: &Connection,
    event_type: &str,
    entity_type: &str,
    entity_id: &str,
    payload: Option<&str>,
) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO events (id, ts, type, entity_type, entity_id, payload)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            Uuid::new_v4().to_string(),
            Utc::now().to_rfc3339(),
            event_type,
            entity_type,
            entity_id,
            payload
        ],
    )?;
    Ok(())
}
