//! Daily captures: a lightweight local inbox. One freeform jot per row; optional
//! link to a decision or intention. Deliberately thin — no cadence, no streak.

use crate::domain::{ApiError, Capture};
use crate::events;
use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

const KINDS: [&str; 2] = ["note", "reflection"];

pub fn add_capture(
    conn: &Connection,
    content: &str,
    kind: &str,
    decision_id: Option<&str>,
    intention_id: Option<&str>,
) -> Result<Capture, ApiError> {
    let content = content.trim();
    if content.is_empty() {
        return Err(ApiError::invalid("there is nothing to note".to_string()));
    }
    if !KINDS.contains(&kind) {
        return Err(ApiError::invalid(format!("type inconnu: {kind}")));
    }
    super::with_tx(conn, |conn| {
        let now = Utc::now().to_rfc3339();
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO captures (id, content, kind, decision_id, intention_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
            params![id, content, kind, decision_id, intention_id, now],
        )?;
        events::record(conn, "capture.added", "capture", &id, Some(kind))?;
        Ok(Capture {
            id,
            content: content.to_string(),
            kind: kind.to_string(),
            decision_id: decision_id.map(str::to_string),
            intention_id: intention_id.map(str::to_string),
            created_at: now.clone(),
            updated_at: now,
        })
    })
}

pub fn list_recent(conn: &Connection, limit: i64) -> Result<Vec<Capture>, ApiError> {
    let mut stmt = conn.prepare(
        "SELECT id, content, kind, decision_id, intention_id, created_at, updated_at
         FROM captures WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?1",
    )?;
    let rows = stmt
        .query_map([limit], |r| {
            Ok(Capture {
                id: r.get(0)?,
                content: r.get(1)?,
                kind: r.get(2)?,
                decision_id: r.get(3)?,
                intention_id: r.get(4)?,
                created_at: r.get(5)?,
                updated_at: r.get(6)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}
