//! Compass data access: life areas and intentions, with caps enforced here (not
//! in the UI) so they can't be bypassed. Every mutation records an event.

use crate::domain::{ApiError, Domain, Intention};
use crate::events;
use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

/// PRD NFR8: 3–5 active areas (5 is the ceiling), ~3 active intentions per area.
pub const DOMAIN_ACTIVE_CAP: i64 = 5;
pub const INTENTION_ACTIVE_CAP: i64 = 3;

const PRIORITIES: [&str; 3] = ["must", "should", "may"];

fn check_priority(p: &str) -> Result<(), ApiError> {
    if PRIORITIES.contains(&p) {
        Ok(())
    } else {
        Err(ApiError::invalid(format!("priorité inconnue: {p}")))
    }
}

// --- Domains --------------------------------------------------------------

pub fn list_domains(conn: &Connection) -> Result<Vec<Domain>, ApiError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, sort_order, status, created_at, updated_at
         FROM domains WHERE status='active' AND deleted_at IS NULL
         ORDER BY sort_order, created_at",
    )?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Domain {
                id: r.get(0)?,
                name: r.get(1)?,
                sort_order: r.get(2)?,
                status: r.get(3)?,
                created_at: r.get(4)?,
                updated_at: r.get(5)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

fn active_domain_count(conn: &Connection) -> Result<i64, ApiError> {
    Ok(conn.query_row(
        "SELECT count(*) FROM domains WHERE status='active' AND deleted_at IS NULL",
        [],
        |r| r.get(0),
    )?)
}

pub fn create_domain(conn: &Connection, name: &str) -> Result<Domain, ApiError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(ApiError::invalid("le nom est vide".to_string()));
    }
    if active_domain_count(conn)? >= DOMAIN_ACTIVE_CAP {
        return Err(ApiError::cap_reached(
            "Tu as déjà assez de pans de vie. Retires-en un avant d'en ajouter.".to_string(),
        ));
    }
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO domains (id, name, sort_order, status, created_at, updated_at)
         VALUES (?1, ?2, (SELECT COALESCE(MAX(sort_order)+1,0) FROM domains), 'active', ?3, ?3)",
        params![id, name, now],
    )?;
    events::record(conn, "domain.created", "domain", &id, Some(name))?;
    Ok(Domain {
        id,
        name: name.to_string(),
        sort_order: 0,
        status: "active".into(),
        created_at: now.clone(),
        updated_at: now,
    })
}

pub fn rename_domain(conn: &Connection, id: &str, name: &str) -> Result<(), ApiError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(ApiError::invalid("le nom est vide".to_string()));
    }
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE domains SET name=?2, updated_at=?3 WHERE id=?1 AND deleted_at IS NULL",
        params![id, name, now],
    )?;
    events::record(conn, "domain.renamed", "domain", id, Some(name))?;
    Ok(())
}

pub fn archive_domain(conn: &Connection, id: &str) -> Result<(), ApiError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE domains SET status='archived', updated_at=?2 WHERE id=?1",
        params![id, now],
    )?;
    events::record(conn, "domain.archived", "domain", id, None)?;
    Ok(())
}

// --- Intentions -----------------------------------------------------------

pub fn list_intentions(conn: &Connection, domain_id: &str) -> Result<Vec<Intention>, ApiError> {
    let mut stmt = conn.prepare(
        "SELECT id, domain_id, statement, situation, action, priority, status, created_at, updated_at
         FROM intentions
         WHERE domain_id=?1 AND status='active' AND deleted_at IS NULL
         ORDER BY created_at",
    )?;
    let rows = stmt
        .query_map([domain_id], |r| {
            Ok(Intention {
                id: r.get(0)?,
                domain_id: r.get(1)?,
                statement: r.get(2)?,
                situation: r.get(3)?,
                action: r.get(4)?,
                priority: r.get(5)?,
                status: r.get(6)?,
                created_at: r.get(7)?,
                updated_at: r.get(8)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

fn active_intention_count(conn: &Connection, domain_id: &str) -> Result<i64, ApiError> {
    Ok(conn.query_row(
        "SELECT count(*) FROM intentions
         WHERE domain_id=?1 AND status='active' AND deleted_at IS NULL",
        [domain_id],
        |r| r.get(0),
    )?)
}

#[allow(clippy::too_many_arguments)]
pub fn create_intention(
    conn: &Connection,
    domain_id: &str,
    statement: &str,
    situation: Option<&str>,
    action: Option<&str>,
    priority: &str,
) -> Result<Intention, ApiError> {
    let statement = statement.trim();
    if statement.is_empty() {
        return Err(ApiError::invalid("dis-moi ce qui compte pour toi".to_string()));
    }
    check_priority(priority)?;
    if active_intention_count(conn, domain_id)? >= INTENTION_ACTIVE_CAP {
        return Err(ApiError::cap_reached(
            "Ce pan est déjà bien rempli. Retire une intention avant d'en ajouter.".to_string(),
        ));
    }
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO intentions
           (id, domain_id, statement, situation, action, priority, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7, ?7)",
        params![id, domain_id, statement, situation, action, priority, now],
    )?;
    events::record(conn, "intention.created", "intention", &id, Some(statement))?;
    Ok(Intention {
        id,
        domain_id: domain_id.to_string(),
        statement: statement.to_string(),
        situation: situation.map(|s| s.to_string()),
        action: action.map(|s| s.to_string()),
        priority: priority.to_string(),
        status: "active".into(),
        created_at: now.clone(),
        updated_at: now,
    })
}

pub fn update_intention(
    conn: &Connection,
    id: &str,
    statement: &str,
    situation: Option<&str>,
    action: Option<&str>,
) -> Result<(), ApiError> {
    let statement = statement.trim();
    if statement.is_empty() {
        return Err(ApiError::invalid("dis-moi ce qui compte pour toi".to_string()));
    }
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE intentions SET statement=?2, situation=?3, action=?4, updated_at=?5
         WHERE id=?1 AND deleted_at IS NULL",
        params![id, statement, situation, action, now],
    )?;
    events::record(conn, "intention.updated", "intention", id, None)?;
    Ok(())
}

pub fn set_intention_priority(conn: &Connection, id: &str, priority: &str) -> Result<(), ApiError> {
    check_priority(priority)?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE intentions SET priority=?2, updated_at=?3 WHERE id=?1 AND deleted_at IS NULL",
        params![id, priority, now],
    )?;
    events::record(conn, "intention.reprioritized", "intention", id, Some(priority))?;
    Ok(())
}

pub fn archive_intention(conn: &Connection, id: &str) -> Result<(), ApiError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE intentions SET status='archived', updated_at=?2 WHERE id=?1",
        params![id, now],
    )?;
    events::record(conn, "intention.archived", "intention", id, None)?;
    Ok(())
}
