//! The check-in ("le point"): a compassionate replay of intentions. The engine
//! stores neutral enums; the kind framing lives in the UI copy.

use crate::domain::{ApiError, Review, ReviewItem};
use crate::events;
use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

const OUTCOMES: [&str; 4] = ["better", "as_expected", "worse", "too_early"];

pub fn open_review(
    conn: &Connection,
    period_start: Option<&str>,
    period_end: Option<&str>,
) -> Result<Review, ApiError> {
    let id = super::with_tx(conn, |conn| {
        let now = Utc::now().to_rfc3339();
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO reviews (id, period_start, period_end, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?4)",
            params![id, period_start, period_end, now],
        )?;
        events::record(conn, "review.opened", "review", &id, None)?;
        Ok(id)
    })?;
    get_review(conn, &id)
}

pub fn get_review(conn: &Connection, id: &str) -> Result<Review, ApiError> {
    conn.query_row(
        "SELECT id, period_start, period_end, note, created_at, updated_at
         FROM reviews WHERE id=?1",
        [id],
        |r| {
            Ok(Review {
                id: r.get(0)?,
                period_start: r.get(1)?,
                period_end: r.get(2)?,
                note: r.get(3)?,
                created_at: r.get(4)?,
                updated_at: r.get(5)?,
            })
        },
    )
    .map_err(ApiError::db)
}

pub fn list_reviews(conn: &Connection) -> Result<Vec<Review>, ApiError> {
    let mut stmt = conn.prepare(
        "SELECT id, period_start, period_end, note, created_at, updated_at
         FROM reviews WHERE deleted_at IS NULL ORDER BY created_at DESC",
    )?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Review {
                id: r.get(0)?,
                period_start: r.get(1)?,
                period_end: r.get(2)?,
                note: r.get(3)?,
                created_at: r.get(4)?,
                updated_at: r.get(5)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn add_item(
    conn: &Connection,
    review_id: &str,
    intention_id: Option<&str>,
    decision_id: Option<&str>,
    outcome: Option<&str>,
    learning: Option<&str>,
) -> Result<ReviewItem, ApiError> {
    if let Some(o) = outcome {
        if !OUTCOMES.contains(&o) {
            return Err(ApiError::invalid(format!("issue inconnue: {o}")));
        }
    }
    super::with_tx(conn, |conn| {
        let now = Utc::now().to_rfc3339();
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO review_items
               (id, review_id, intention_id, decision_id, outcome, learning, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
            params![
                id,
                review_id,
                intention_id,
                decision_id,
                outcome,
                learning,
                now
            ],
        )?;
        events::record(conn, "review.item_recorded", "review", review_id, outcome)?;
        Ok(ReviewItem {
            id,
            review_id: review_id.to_string(),
            intention_id: intention_id.map(str::to_string),
            decision_id: decision_id.map(str::to_string),
            outcome: outcome.map(str::to_string),
            learning: learning.map(str::to_string),
            created_at: now.clone(),
            updated_at: now,
        })
    })
}

pub fn list_items(conn: &Connection, review_id: &str) -> Result<Vec<ReviewItem>, ApiError> {
    let mut stmt = conn.prepare(
        "SELECT id, review_id, intention_id, decision_id, outcome, learning, created_at, updated_at
         FROM review_items WHERE review_id=?1 AND deleted_at IS NULL ORDER BY created_at",
    )?;
    let rows = stmt
        .query_map([review_id], |r| {
            Ok(ReviewItem {
                id: r.get(0)?,
                review_id: r.get(1)?,
                intention_id: r.get(2)?,
                decision_id: r.get(3)?,
                outcome: r.get(4)?,
                learning: r.get(5)?,
                created_at: r.get(6)?,
                updated_at: r.get(7)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}
