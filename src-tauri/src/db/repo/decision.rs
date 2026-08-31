//! Decision-session data access: a decision (change proposal) built up step by
//! step across `decisions`, `decision_options`, `deltas`, `stories`. Every
//! mutation records an event; finalizing enforces a valid outcome (NFR4).

use crate::db::repo::compass;
use crate::domain::{
    ApiError, DecisionDetail, DecisionFull, DecisionOption, DeltaInput, DeltaResolution, DeltaRow,
    StoryRow,
};
use crate::events;
use chrono::Utc;
use rusqlite::{params, Connection};
use std::collections::HashMap;
use uuid::Uuid;

const PRIORITIES: [&str; 3] = ["must", "should", "may"];
const OPS: [&str; 3] = ["added", "modified", "removed"];

// --- Open & explore -------------------------------------------------------

pub fn open_decision(conn: &Connection, title: &str) -> Result<DecisionFull, ApiError> {
    let title = title.trim();
    if title.is_empty() {
        return Err(ApiError::invalid("dis-moi quelle décision te trotte".to_string()));
    }
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO decisions (id, title, status, created_at, updated_at)
         VALUES (?1, ?2, 'draft', ?3, ?3)",
        params![id, title, now],
    )?;
    events::record(conn, "decision.opened", "decision", &id, Some(title))?;
    get_decision(conn, &id)
}

fn touch(conn: &Connection, id: &str, now: &str) -> Result<(), ApiError> {
    conn.execute("UPDATE decisions SET updated_at=?2 WHERE id=?1", params![id, now])?;
    Ok(())
}

pub fn set_reality(conn: &Connection, id: &str, text: &str) -> Result<(), ApiError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE decisions SET emotional_context=?2, updated_at=?3 WHERE id=?1",
        params![id, text, now],
    )?;
    events::record(conn, "decision.reality_set", "decision", id, None)?;
    Ok(())
}

pub fn set_distance(conn: &Connection, id: &str, text: &str) -> Result<(), ApiError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE decisions SET distance_10_10_10=?2, updated_at=?3 WHERE id=?1",
        params![id, text, now],
    )?;
    events::record(conn, "decision.distance_set", "decision", id, None)?;
    Ok(())
}

pub fn set_alignment(conn: &Connection, id: &str, note: &str) -> Result<(), ApiError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE decisions SET values_alignment_note=?2, updated_at=?3 WHERE id=?1",
        params![id, note, now],
    )?;
    events::record(conn, "decision.alignment_set", "decision", id, None)?;
    Ok(())
}

pub fn set_why(conn: &Connection, id: &str, text: &str) -> Result<(), ApiError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE decisions SET proposal=?2, updated_at=?3 WHERE id=?1",
        params![id, text, now],
    )?;
    events::record(conn, "decision.why_set", "decision", id, None)?;
    Ok(())
}

pub fn set_confidence(conn: &Connection, id: &str, confidence: i64) -> Result<(), ApiError> {
    if !(0..=100).contains(&confidence) {
        return Err(ApiError::invalid("la confiance va de 0 à 100".to_string()));
    }
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE decisions SET confidence=?2, updated_at=?3 WHERE id=?1",
        params![id, confidence, now],
    )?;
    touch(conn, id, &now)?;
    Ok(())
}

pub fn set_review_at(conn: &Connection, id: &str, date: &str) -> Result<(), ApiError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE decisions SET review_at=?2, updated_at=?3 WHERE id=?1",
        params![id, date, now],
    )?;
    events::record(conn, "decision.review_scheduled", "decision", id, Some(date))?;
    Ok(())
}

// --- Options --------------------------------------------------------------

pub fn add_option(
    conn: &Connection,
    decision_id: &str,
    label: &str,
    is_null_option: bool,
) -> Result<DecisionOption, ApiError> {
    let label = label.trim();
    if label.is_empty() {
        return Err(ApiError::invalid("l'option est vide".to_string()));
    }
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO decision_options
           (id, decision_id, label, is_null_option, chosen, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 0, ?5, ?5)",
        params![id, decision_id, label, is_null_option as i64, now],
    )?;
    events::record(conn, "option.added", "decision", decision_id, Some(label))?;
    Ok(DecisionOption {
        id,
        decision_id: decision_id.to_string(),
        label: label.to_string(),
        is_null_option,
        premortem: None,
        chosen: false,
    })
}

pub fn set_option_premortem(conn: &Connection, option_id: &str, text: &str) -> Result<(), ApiError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE decision_options SET premortem=?2, updated_at=?3 WHERE id=?1",
        params![option_id, text, now],
    )?;
    events::record(conn, "option.premortem_set", "option", option_id, None)?;
    Ok(())
}

pub fn choose_option(
    conn: &Connection,
    decision_id: &str,
    option_id: &str,
) -> Result<(), ApiError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE decision_options SET chosen = (id = ?2), updated_at=?3 WHERE decision_id=?1",
        params![decision_id, option_id, now],
    )?;
    events::record(conn, "option.chosen", "decision", decision_id, Some(option_id))?;
    Ok(())
}

pub fn list_options(conn: &Connection, decision_id: &str) -> Result<Vec<DecisionOption>, ApiError> {
    let mut stmt = conn.prepare(
        "SELECT id, decision_id, label, is_null_option, premortem, chosen
         FROM decision_options WHERE decision_id=?1 AND deleted_at IS NULL ORDER BY created_at",
    )?;
    let rows = stmt
        .query_map([decision_id], |r| {
            Ok(DecisionOption {
                id: r.get(0)?,
                decision_id: r.get(1)?,
                label: r.get(2)?,
                is_null_option: r.get::<_, i64>(3)? != 0,
                premortem: r.get(4)?,
                chosen: r.get::<_, i64>(5)? != 0,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

// --- Deltas & stories -----------------------------------------------------

pub fn add_delta(conn: &Connection, decision_id: &str, d: &DeltaInput) -> Result<DeltaRow, ApiError> {
    if !OPS.contains(&d.op.as_str()) {
        return Err(ApiError::invalid(format!("changement inconnu: {}", d.op)));
    }
    if let Some(p) = &d.payload_priority {
        if !PRIORITIES.contains(&p.as_str()) {
            return Err(ApiError::invalid(format!("priorité inconnue: {p}")));
        }
    }
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO deltas
           (id, decision_id, op, target_intention_id, domain_id,
            payload_statement, payload_situation, payload_action, payload_priority,
            created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
        params![
            id, decision_id, d.op, d.target_intention_id, d.domain_id,
            d.payload_statement, d.payload_situation, d.payload_action, d.payload_priority, now
        ],
    )?;
    events::record(conn, "delta.added", "decision", decision_id, Some(&d.op))?;
    Ok(DeltaRow {
        id,
        decision_id: decision_id.to_string(),
        op: d.op.clone(),
        target_intention_id: d.target_intention_id.clone(),
        domain_id: d.domain_id.clone(),
        payload_statement: d.payload_statement.clone(),
        payload_situation: d.payload_situation.clone(),
        payload_action: d.payload_action.clone(),
        payload_priority: d.payload_priority.clone(),
        applied_at: None,
    })
}

pub fn list_deltas(conn: &Connection, decision_id: &str) -> Result<Vec<DeltaRow>, ApiError> {
    let mut stmt = conn.prepare(
        "SELECT id, decision_id, op, target_intention_id, domain_id,
                payload_statement, payload_situation, payload_action, payload_priority, applied_at
         FROM deltas WHERE decision_id=?1 AND deleted_at IS NULL ORDER BY created_at",
    )?;
    let rows = stmt
        .query_map([decision_id], |r| {
            Ok(DeltaRow {
                id: r.get(0)?,
                decision_id: r.get(1)?,
                op: r.get(2)?,
                target_intention_id: r.get(3)?,
                domain_id: r.get(4)?,
                payload_statement: r.get(5)?,
                payload_situation: r.get(6)?,
                payload_action: r.get(7)?,
                payload_priority: r.get(8)?,
                applied_at: r.get(9)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn add_story(
    conn: &Connection,
    decision_id: &str,
    title: &str,
    why: Option<&str>,
    when_cue: Option<&str>,
    done_when: Option<&str>,
) -> Result<StoryRow, ApiError> {
    let title = title.trim();
    if title.is_empty() {
        return Err(ApiError::invalid("le petit pas est vide".to_string()));
    }
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO stories
           (id, decision_id, title, why, when_cue, done_when, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'open', ?7, ?7)",
        params![id, decision_id, title, why, when_cue, done_when, now],
    )?;
    events::record(conn, "story.added", "decision", decision_id, Some(title))?;
    Ok(StoryRow {
        id,
        decision_id: Some(decision_id.to_string()),
        title: title.to_string(),
        why: why.map(str::to_string),
        when_cue: when_cue.map(str::to_string),
        done_when: done_when.map(str::to_string),
        status: "open".into(),
    })
}

pub fn list_stories(conn: &Connection, decision_id: &str) -> Result<Vec<StoryRow>, ApiError> {
    let mut stmt = conn.prepare(
        "SELECT id, decision_id, title, why, when_cue, done_when, status
         FROM stories WHERE decision_id=?1 AND deleted_at IS NULL ORDER BY created_at",
    )?;
    let rows = stmt
        .query_map([decision_id], |r| {
            Ok(StoryRow {
                id: r.get(0)?,
                decision_id: r.get(1)?,
                title: r.get(2)?,
                why: r.get(3)?,
                when_cue: r.get(4)?,
                done_when: r.get(5)?,
                status: r.get(6)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

// --- Read & finalize ------------------------------------------------------

pub fn get_decision(conn: &Connection, id: &str) -> Result<DecisionFull, ApiError> {
    conn.query_row(
        "SELECT id, title, proposal, strategy, status, confidence,
                values_alignment_note, distance_10_10_10, review_at, emotional_context,
                created_at, updated_at
         FROM decisions WHERE id=?1",
        [id],
        |r| {
            Ok(DecisionFull {
                id: r.get(0)?,
                title: r.get(1)?,
                proposal: r.get(2)?,
                strategy: r.get(3)?,
                status: r.get(4)?,
                confidence: r.get(5)?,
                values_alignment_note: r.get(6)?,
                distance_10_10_10: r.get(7)?,
                review_at: r.get(8)?,
                emotional_context: r.get(9)?,
                created_at: r.get(10)?,
                updated_at: r.get(11)?,
            })
        },
    )
    .map_err(ApiError::db)
}

pub fn get_detail(conn: &Connection, id: &str) -> Result<DecisionDetail, ApiError> {
    Ok(DecisionDetail {
        decision: get_decision(conn, id)?,
        options: list_options(conn, id)?,
        deltas: list_deltas(conn, id)?,
        stories: list_stories(conn, id)?,
    })
}

/// Validate the session and mark it `proposed`. Never finalizes something
/// partial (NFR4); returns `incomplete` listing what's missing.
pub fn finalize(conn: &Connection, id: &str) -> Result<DecisionFull, ApiError> {
    let d = get_decision(conn, id)?;
    let options = list_options(conn, id)?;
    let stories = list_stories(conn, id)?;

    let mut missing: Vec<&str> = Vec::new();
    if options.len() < 3 {
        missing.push("au moins trois options");
    }
    if !options.iter().any(|o| o.is_null_option) {
        missing.push("l'option « et si aucune ? »");
    }
    let chosen = options.iter().find(|o| o.chosen);
    match chosen {
        None => missing.push("choisir une option"),
        Some(o) if o.premortem.as_deref().unwrap_or("").trim().is_empty() => {
            missing.push("le pré-mortem de l'option choisie")
        }
        _ => {}
    }
    if d.distance_10_10_10.as_deref().unwrap_or("").trim().is_empty() {
        missing.push("le recul 10 min / 10 mois / 10 ans");
    }
    if d.proposal.as_deref().unwrap_or("").trim().is_empty() {
        missing.push("le pourquoi");
    }
    if stories.is_empty() {
        missing.push("un prochain petit pas");
    }

    if !missing.is_empty() {
        return Err(ApiError::incomplete(format!("Il manque : {}.", missing.join(", "))));
    }

    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE decisions SET status='proposed', updated_at=?2 WHERE id=?1",
        params![id, now],
    )?;
    events::record(conn, "decision.proposed", "decision", id, None)?;
    get_decision(conn, id)
}

// --- Integration (FR8): merge a proposed decision's delta into the compass ---

pub fn list_proposed_decisions(conn: &Connection) -> Result<Vec<DecisionFull>, ApiError> {
    let mut stmt = conn.prepare(
        "SELECT id FROM decisions WHERE status='proposed' AND deleted_at IS NULL ORDER BY created_at DESC",
    )?;
    let ids = stmt
        .query_map([], |r| r.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    ids.iter().map(|id| get_decision(conn, id)).collect()
}

/// Apply every unapplied delta of a proposed decision onto the compass, then mark
/// the decision applied. Transactional: any failure rolls back, so nothing is
/// merged partially. `resolutions` maps each delta to its target (an area for
/// `added`, an existing intention for `modified`/`removed`).
pub fn apply_decision(
    conn: &Connection,
    decision_id: &str,
    resolutions: &[DeltaResolution],
) -> Result<DecisionFull, ApiError> {
    let d = get_decision(conn, decision_id)?;
    if d.status != "proposed" {
        return Err(ApiError::invalid("cette décision n'est pas prête à être intégrée".to_string()));
    }
    let by_delta: HashMap<&str, &DeltaResolution> =
        resolutions.iter().map(|r| (r.delta_id.as_str(), r)).collect();

    let tx = conn.unchecked_transaction().map_err(ApiError::db)?;
    let now = Utc::now().to_rfc3339();

    for delta in list_deltas(&tx, decision_id)? {
        if delta.applied_at.is_some() {
            continue;
        }
        let res = by_delta.get(delta.id.as_str());
        let domain_id = res.and_then(|r| r.domain_id.clone()).or(delta.domain_id.clone());
        let target = res
            .and_then(|r| r.target_intention_id.clone())
            .or(delta.target_intention_id.clone());
        let priority = delta.payload_priority.as_deref().unwrap_or("should");

        match delta.op.as_str() {
            "added" => {
                let dom = domain_id.ok_or_else(|| {
                    ApiError::incomplete("choisis un pan de vie pour ce que tu ajoutes".to_string())
                })?;
                let statement = delta.payload_statement.clone().unwrap_or_default();
                // Reuses the compass cap: adding past it is refused here too.
                compass::create_intention(
                    &tx,
                    &dom,
                    &statement,
                    delta.payload_situation.as_deref(),
                    delta.payload_action.as_deref(),
                    priority,
                )?;
            }
            "modified" => {
                let tgt = target.ok_or_else(|| {
                    ApiError::incomplete("choisis l'intention à changer".to_string())
                })?;
                let statement = delta.payload_statement.clone().unwrap_or_default();
                compass::update_intention(
                    &tx,
                    &tgt,
                    &statement,
                    delta.payload_situation.as_deref(),
                    delta.payload_action.as_deref(),
                )?;
                if delta.payload_priority.is_some() {
                    compass::set_intention_priority(&tx, &tgt, priority)?;
                }
            }
            "removed" => {
                let tgt = target.ok_or_else(|| {
                    ApiError::incomplete("choisis l'intention à arrêter".to_string())
                })?;
                compass::archive_intention(&tx, &tgt)?;
            }
            other => return Err(ApiError::invalid(format!("changement inconnu: {other}"))),
        }

        tx.execute(
            "UPDATE deltas SET applied_at=?2, updated_at=?2 WHERE id=?1",
            params![delta.id, now],
        )
        .map_err(ApiError::db)?;
    }

    tx.execute(
        "UPDATE decisions SET status='applied', updated_at=?2 WHERE id=?1",
        params![decision_id, now],
    )
    .map_err(ApiError::db)?;
    events::record(&tx, "decision.applied", "decision", decision_id, None)?;

    tx.commit().map_err(ApiError::db)?;
    get_decision(conn, decision_id)
}
