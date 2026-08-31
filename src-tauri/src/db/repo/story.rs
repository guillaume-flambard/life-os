//! Next steps (stories) and their if-then plans. Execution is where clarity
//! becomes real: open steps can be followed through, and a step can be pre-wired
//! to a concrete trigger (implementation intention / WOOP).

use crate::domain::{ApiError, IfThenPlan, OpenStory};
use crate::events;
use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

const STATUSES: [&str; 3] = ["open", "done", "dropped"];

/// Every open next step across all decisions, newest first, with its decision title.
pub fn list_open_stories(conn: &Connection) -> Result<Vec<OpenStory>, ApiError> {
    let mut stmt = conn.prepare(
        "SELECT s.id, s.decision_id, d.title, s.title, s.when_cue, s.done_when
         FROM stories s
         LEFT JOIN decisions d ON d.id = s.decision_id
         WHERE s.status = 'open' AND s.deleted_at IS NULL
         ORDER BY s.created_at DESC",
    )?;
    let rows = stmt
        .query_map([], |r| {
            Ok(OpenStory {
                id: r.get(0)?,
                decision_id: r.get(1)?,
                decision_title: r.get(2)?,
                title: r.get(3)?,
                when_cue: r.get(4)?,
                done_when: r.get(5)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn set_story_status(conn: &Connection, id: &str, status: &str) -> Result<(), ApiError> {
    if !STATUSES.contains(&status) {
        return Err(ApiError::invalid(format!("état inconnu: {status}")));
    }
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE stories SET status = ?2, updated_at = ?3 WHERE id = ?1 AND deleted_at IS NULL",
        params![id, status, now],
    )?;
    events::record(conn, "story.status_set", "story", id, Some(status))?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn add_if_then(
    conn: &Connection,
    story_id: &str,
    decision_id: Option<&str>,
    wish: Option<&str>,
    outcome: Option<&str>,
    obstacle: Option<&str>,
    cue: &str,
    action: &str,
) -> Result<IfThenPlan, ApiError> {
    let cue = cue.trim();
    let action = action.trim();
    if cue.is_empty() || action.is_empty() {
        return Err(ApiError::invalid("il faut un « si » et un « alors »".to_string()));
    }
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO if_then_plans
           (id, story_id, decision_id, wish, outcome, obstacle, cue, action, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
        params![id, story_id, decision_id, wish, outcome, obstacle, cue, action, now],
    )?;
    events::record(conn, "if_then.added", "story", story_id, Some(cue))?;
    Ok(IfThenPlan {
        id,
        story_id: Some(story_id.to_string()),
        decision_id: decision_id.map(str::to_string),
        wish: wish.map(str::to_string),
        outcome: outcome.map(str::to_string),
        obstacle: obstacle.map(str::to_string),
        cue: cue.to_string(),
        action: action.to_string(),
        created_at: now.clone(),
        updated_at: now,
    })
}

pub fn list_if_then(conn: &Connection, story_id: &str) -> Result<Vec<IfThenPlan>, ApiError> {
    let mut stmt = conn.prepare(
        "SELECT id, story_id, decision_id, wish, outcome, obstacle, cue, action, created_at, updated_at
         FROM if_then_plans WHERE story_id = ?1 AND deleted_at IS NULL ORDER BY created_at",
    )?;
    let rows = stmt
        .query_map([story_id], |r| {
            Ok(IfThenPlan {
                id: r.get(0)?,
                story_id: r.get(1)?,
                decision_id: r.get(2)?,
                wish: r.get(3)?,
                outcome: r.get(4)?,
                obstacle: r.get(5)?,
                cue: r.get(6)?,
                action: r.get(7)?,
                created_at: r.get(8)?,
                updated_at: r.get(9)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}
