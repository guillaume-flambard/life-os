//! Encrypted, file-based multi-device sync. A snapshot is a JSON dump of the
//! syncable tables, encrypted with the user's passphrase (age). Import merges by
//! last-write-wins per row (UUID + updated_at), unioning the append-only events —
//! nothing is blindly overwritten. This is the doc-recommended "encrypted file"
//! brick; the day-one UUID/updated_at/events design is what makes it safe.

use crate::domain::{ApiError, MergeSummary};
use chrono::DateTime;
use rusqlite::types::{Value, ValueRef};
use rusqlite::{params_from_iter, Connection, OptionalExtension};
use serde_json::{json, Map, Value as J};
use std::collections::HashSet;
use std::io::{Read, Write};

/// Row-LWW tables (matched by `id`, newer `updated_at` wins).
const ROW_LWW: &[&str] = &[
    "domains",
    "intentions",
    "decisions",
    "decision_options",
    "deltas",
    "stories",
    "if_then_plans",
    "reviews",
    "review_items",
    "memory_chunks",
    "captures",
];

fn vref_json(v: ValueRef) -> J {
    match v {
        ValueRef::Null => J::Null,
        ValueRef::Integer(i) => json!(i),
        ValueRef::Real(f) => json!(f),
        ValueRef::Text(t) => J::String(String::from_utf8_lossy(t).into_owned()),
        ValueRef::Blob(_) => J::Null, // no blobs in synced tables
    }
}

fn json_sqlite(v: &J) -> Value {
    match v {
        J::Null => Value::Null,
        J::Bool(b) => Value::Integer(*b as i64),
        J::Number(n) => {
            if let Some(i) = n.as_i64() {
                Value::Integer(i)
            } else {
                Value::Real(n.as_f64().unwrap_or(0.0))
            }
        }
        J::String(s) => Value::Text(s.clone()),
        _ => Value::Null,
    }
}

fn dump_table(conn: &Connection, table: &str) -> Result<J, ApiError> {
    let mut stmt = conn.prepare(&format!("SELECT * FROM {table}"))?;
    let cols: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    let mut arr: Vec<J> = Vec::new();
    let mut rows = stmt.query([])?;
    while let Some(r) = rows.next()? {
        let mut obj = Map::new();
        for (i, name) in cols.iter().enumerate() {
            obj.insert(name.clone(), vref_json(r.get_ref(i)?));
        }
        arr.push(J::Object(obj));
    }
    Ok(J::Array(arr))
}

/// A full snapshot of the syncable data as JSON.
pub fn export_json(conn: &Connection) -> Result<J, ApiError> {
    let mut tables = Map::new();
    for t in ROW_LWW {
        tables.insert((*t).to_string(), dump_table(conn, t)?);
    }
    tables.insert("events".to_string(), dump_table(conn, "events")?);
    tables.insert("settings".to_string(), dump_table(conn, "settings")?);
    Ok(json!({ "version": 1, "tables": J::Object(tables) }))
}

/// Column names of a local table — the whitelist an imported row may use.
/// Snapshot tables are static constants, so building this SQL is safe.
fn table_columns(conn: &Connection, table: &str) -> Result<HashSet<String>, ApiError> {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({table})"))
        .map_err(ApiError::db)?;
    let cols = stmt
        .query_map([], |r| r.get::<_, String>(1))
        .map_err(ApiError::db)?
        .collect::<rusqlite::Result<HashSet<_>>>()
        .map_err(ApiError::db)?;
    Ok(cols)
}

/// Reject a row that is not a faithful image of the local table: an unknown
/// column is an identifier-injection vector (it would be interpolated into the
/// INSERT), and timestamps must be valid RFC3339 — the LWW comparison and the
/// Markdown export both rely on that single canonical format.
fn sanitize_row(
    table: &str,
    obj: &Map<String, J>,
    allowed: &HashSet<String>,
) -> Result<(), ApiError> {
    for (col, val) in obj {
        if !allowed.contains(col) {
            return Err(ApiError::invalid(format!(
                "unreadable snapshot: unknown column '{col}' in '{table}'"
            )));
        }
        let is_ts = col == "ts" || col.ends_with("_at");
        if is_ts && !val.is_null() {
            let Some(s) = val.as_str() else {
                return Err(ApiError::invalid(format!(
                    "unreadable snapshot: '{col}' of '{table}' is not a timestamp"
                )));
            };
            if DateTime::parse_from_rfc3339(s).is_err() {
                return Err(ApiError::invalid(format!(
                    "unreadable snapshot: '{col}' of '{table}' is not a valid timestamp"
                )));
            }
        }
    }
    Ok(())
}

/// Insert a row, updating it in place on primary-key conflict. Never REPLACE:
/// delete+insert would bypass the FTS sync triggers and hand the row a new
/// rowid, breaking the recency heuristic of the recall.
fn upsert(conn: &Connection, table: &str, key: &str, obj: &Map<String, J>) -> Result<(), ApiError> {
    let cols: Vec<&String> = obj.keys().collect();
    let placeholders: Vec<String> = (1..=cols.len()).map(|i| format!("?{i}")).collect();
    let sets: Vec<String> = cols
        .iter()
        .filter(|c| c.as_str() != key)
        .map(|c| format!("{c} = excluded.{c}"))
        .collect();
    let on_conflict = if sets.is_empty() {
        format!("ON CONFLICT({key}) DO NOTHING")
    } else {
        format!("ON CONFLICT({key}) DO UPDATE SET {}", sets.join(", "))
    };
    let sql = format!(
        "INSERT INTO {table} ({}) VALUES ({}) {on_conflict}",
        cols.iter()
            .map(|c| c.as_str())
            .collect::<Vec<_>>()
            .join(","),
        placeholders.join(",")
    );
    let vals: Vec<Value> = cols.iter().map(|c| json_sqlite(&obj[*c])).collect();
    conn.execute(&sql, params_from_iter(vals))
        .map_err(ApiError::db)?;
    Ok(())
}

fn merge_lww(
    conn: &Connection,
    table: &str,
    rows: &[J],
    key: &str,
    sum: &mut MergeSummary,
) -> Result<(), ApiError> {
    let allowed = table_columns(conn, table)?;
    for row in rows {
        let Some(obj) = row.as_object() else { continue };
        let Some(key_val) = obj.get(key).and_then(|v| v.as_str()) else {
            continue;
        };
        sanitize_row(table, obj, &allowed)?;
        let incoming = obj.get("updated_at").and_then(|v| v.as_str()).unwrap_or("");
        let local: Option<String> = conn
            .query_row(
                &format!("SELECT updated_at FROM {table} WHERE {key} = ?1"),
                [key_val],
                |r| r.get(0),
            )
            .optional()
            .map_err(ApiError::db)?;
        // Both sides are validated RFC3339, but offsets can differ; compare as
        // instants rather than trusting the string order.
        let newer = match &local {
            None => true,
            Some(loc) => {
                let (a, b) = (
                    DateTime::parse_from_rfc3339(incoming),
                    DateTime::parse_from_rfc3339(loc),
                );
                matches!((a, b), (Ok(a), Ok(b)) if a > b)
            }
        };
        if newer {
            upsert(conn, table, key, obj)?;
            if local.is_some() {
                sum.updated += 1;
            } else {
                sum.inserted += 1;
            }
        } else {
            sum.skipped += 1;
        }
    }
    Ok(())
}

fn merge_events(conn: &Connection, rows: &[J], sum: &mut MergeSummary) -> Result<(), ApiError> {
    let allowed = table_columns(conn, "events")?;
    for row in rows {
        let Some(obj) = row.as_object() else { continue };
        let Some(id) = obj.get("id").and_then(|v| v.as_str()) else {
            continue;
        };
        sanitize_row("events", obj, &allowed)?;
        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM events WHERE id = ?1)",
                [id],
                |r| r.get(0),
            )
            .map_err(ApiError::db)?;
        if exists {
            sum.skipped += 1;
        } else {
            // Append-only by construction: an existing event is never rewritten.
            let cols: Vec<&String> = obj.keys().collect();
            let placeholders: Vec<String> = (1..=cols.len()).map(|i| format!("?{i}")).collect();
            let sql = format!(
                "INSERT INTO events ({}) VALUES ({}) ON CONFLICT(id) DO NOTHING",
                cols.iter()
                    .map(|c| c.as_str())
                    .collect::<Vec<_>>()
                    .join(","),
                placeholders.join(",")
            );
            let vals: Vec<Value> = cols.iter().map(|c| json_sqlite(&obj[*c])).collect();
            conn.execute(&sql, params_from_iter(vals))
                .map_err(ApiError::db)?;
            sum.inserted += 1;
        }
    }
    Ok(())
}

/// Merge an imported snapshot into the local DB. Transactional and LWW.
pub fn import_merge(conn: &Connection, snapshot: &J) -> Result<MergeSummary, ApiError> {
    let tables = snapshot
        .get("tables")
        .and_then(|v| v.as_object())
        .ok_or_else(|| ApiError::invalid("unreadable snapshot".to_string()))?;

    let tx = conn.unchecked_transaction().map_err(ApiError::db)?;
    let mut sum = MergeSummary::default();

    for t in ROW_LWW {
        if let Some(rows) = tables.get(*t).and_then(|v| v.as_array()) {
            merge_lww(&tx, t, rows, "id", &mut sum)?;
        }
    }
    if let Some(rows) = tables.get("events").and_then(|v| v.as_array()) {
        merge_events(&tx, rows, &mut sum)?;
    }
    if let Some(rows) = tables.get("settings").and_then(|v| v.as_array()) {
        merge_lww(&tx, "settings", rows, "key", &mut sum)?;
    }

    tx.commit().map_err(ApiError::db)?;
    Ok(sum)
}

// --- Passphrase encryption (age) ------------------------------------------

pub fn encrypt(plaintext: &[u8], passphrase: &str) -> Result<Vec<u8>, String> {
    let enc =
        age::Encryptor::with_user_passphrase(age::secrecy::Secret::new(passphrase.to_owned()));
    let mut out = Vec::new();
    let mut w = enc.wrap_output(&mut out).map_err(|e| e.to_string())?;
    w.write_all(plaintext).map_err(|e| e.to_string())?;
    w.finish().map_err(|e| e.to_string())?;
    Ok(out)
}

pub fn decrypt(ciphertext: &[u8], passphrase: &str) -> Result<Vec<u8>, String> {
    let dec = age::Decryptor::new(ciphertext).map_err(|e| e.to_string())?;
    let pass = match dec {
        age::Decryptor::Passphrase(d) => d,
        _ => return Err("unexpected snapshot format".to_string()),
    };
    let mut reader = pass
        .decrypt(&age::secrecy::Secret::new(passphrase.to_owned()), None)
        .map_err(|_| "wrong passphrase".to_string())?;
    let mut out = Vec::new();
    reader.read_to_end(&mut out).map_err(|e| e.to_string())?;
    Ok(out)
}
