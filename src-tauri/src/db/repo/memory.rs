//! Local memory: one chunk per source, keyword-searchable (FTS5) immediately and
//! semantically searchable (sqlite-vec) once embeddings are backfilled. Recall
//! fuses the two with reciprocal-rank fusion and a recency tiebreak.

use crate::domain::MemoryHit;
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashMap;
use uuid::Uuid;

/// Write (or update) the single memory chunk for a source. Returns the chunk id.
/// Atomic: the chunk and its FTS index entry commit together (nested calls join
/// the caller's transaction).
pub fn write_chunk(
    conn: &Connection,
    content: &str,
    source_type: &str,
    source_id: Option<&str>,
) -> rusqlite::Result<String> {
    super::with_tx_rusqlite(conn, |conn| {
        let now = Utc::now().to_rfc3339();
        let existing: Option<String> = conn
            .query_row(
                "SELECT id FROM memory_chunks
                 WHERE source_type = ?1 AND source_id IS ?2 AND deleted_at IS NULL",
                params![source_type, source_id],
                |r| r.get(0),
            )
            .optional()?;

        if let Some(id) = existing {
            conn.execute(
                "UPDATE memory_chunks SET content = ?2, updated_at = ?3 WHERE id = ?1",
                params![id, content, now],
            )?;
            Ok(id)
        } else {
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO memory_chunks (id, content, source_type, source_id, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
                params![id, content, source_type, source_id, now],
            )?;
            Ok(id)
        }
    })
}

/// Turn a free-text query into a safe FTS5 MATCH expression: quoted terms OR-ed.
fn fts_match(query: &str) -> Option<String> {
    let terms: Vec<String> = query
        .split(|c: char| !c.is_alphanumeric())
        .filter(|t| t.chars().count() >= 2)
        .map(|t| format!("\"{}\"", t.replace('"', "")))
        .collect();
    if terms.is_empty() {
        None
    } else {
        Some(terms.join(" OR "))
    }
}

/// Keyword search (FTS5 BM25). Returns chunk ids, best match first.
pub fn keyword_search(conn: &Connection, query: &str, k: i64) -> rusqlite::Result<Vec<String>> {
    let Some(m) = fts_match(query) else {
        return Ok(vec![]);
    };
    let mut stmt = conn.prepare(
        "SELECT c.id FROM memory_fts
         JOIN memory_chunks c ON c.rowid = memory_fts.rowid
         WHERE memory_fts MATCH ?1 AND c.deleted_at IS NULL
         ORDER BY bm25(memory_fts) LIMIT ?2",
    )?;
    let ids = stmt
        .query_map(params![m, k], |r| r.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(ids)
}

fn embedding_json(embedding: &[f32]) -> String {
    let mut s = String::from("[");
    for (i, v) in embedding.iter().enumerate() {
        if i > 0 {
            s.push(',');
        }
        s.push_str(&v.to_string());
    }
    s.push(']');
    s
}

/// Semantic search (sqlite-vec KNN). Returns chunk ids, nearest first.
pub fn semantic_search(
    conn: &Connection,
    query_embedding: &[f32],
    k: i64,
) -> rusqlite::Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT chunk_id FROM memory_vec
         WHERE embedding MATCH ?1 AND k = ?2 ORDER BY distance",
    )?;
    let ids = stmt
        .query_map(params![embedding_json(query_embedding), k], |r| {
            r.get::<_, String>(0)
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(ids)
}

/// Upsert a chunk's embedding. Atomic: the old vector and the new one commit
/// together (nested calls join the caller's transaction).
pub fn insert_vec(conn: &Connection, chunk_id: &str, embedding: &[f32]) -> rusqlite::Result<()> {
    super::with_tx_rusqlite(conn, |conn| {
        conn.execute("DELETE FROM memory_vec WHERE chunk_id = ?1", [chunk_id])?;
        conn.execute(
            "INSERT INTO memory_vec (chunk_id, embedding) VALUES (?1, ?2)",
            params![chunk_id, embedding_json(embedding)],
        )?;
        Ok(())
    })
}

/// Chunks that don't have an embedding yet (id, content).
pub fn chunks_without_vec(conn: &Connection) -> rusqlite::Result<Vec<(String, String)>> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.content FROM memory_chunks c
         WHERE c.deleted_at IS NULL
           AND NOT EXISTS (SELECT 1 FROM memory_vec v WHERE v.chunk_id = c.id)
         ORDER BY c.created_at",
    )?;
    let rows = stmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

/// Recency rank (larger = newer) for a set of chunk ids, via rowid.
fn recency(conn: &Connection, ids: &[String]) -> HashMap<String, i64> {
    let mut map = HashMap::new();
    for id in ids {
        if let Ok(rowid) =
            conn.query_row("SELECT rowid FROM memory_chunks WHERE id = ?1", [id], |r| {
                r.get::<_, i64>(0)
            })
        {
            map.insert(id.clone(), rowid);
        }
    }
    map
}

/// Reciprocal-rank fusion of the keyword and semantic id-lists, with a recency
/// tiebreak (newer first). Pure and deterministic.
pub fn fuse(kw: &[String], sem: &[String], recency: &HashMap<String, i64>) -> Vec<String> {
    const K: f64 = 60.0;
    let mut score: HashMap<&str, f64> = HashMap::new();
    for (rank, id) in kw.iter().enumerate() {
        *score.entry(id).or_insert(0.0) += 1.0 / (K + rank as f64);
    }
    for (rank, id) in sem.iter().enumerate() {
        *score.entry(id).or_insert(0.0) += 1.0 / (K + rank as f64);
    }
    let mut ids: Vec<&str> = score.keys().copied().collect();
    ids.sort_by(|a, b| {
        let sa = score[a];
        let sb = score[b];
        sb.partial_cmp(&sa)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| recency.get(*b).cmp(&recency.get(*a)))
    });
    ids.into_iter().map(String::from).collect()
}

/// Fetch memory hits for the given ids, preserving order.
pub fn fetch_hits(conn: &Connection, ids: &[String]) -> rusqlite::Result<Vec<MemoryHit>> {
    let mut hits = Vec::new();
    for id in ids {
        if let Some(hit) = conn
            .query_row(
                "SELECT id, content, source_type, source_id
                 FROM memory_chunks WHERE id = ?1 AND deleted_at IS NULL",
                [id],
                |r| {
                    Ok(MemoryHit {
                        chunk_id: r.get(0)?,
                        content: r.get(1)?,
                        source_type: r.get(2)?,
                        source_id: r.get(3)?,
                    })
                },
            )
            .optional()?
        {
            hits.push(hit);
        }
    }
    Ok(hits)
}

/// Convenience: fuse two id-lists (fetching recency) and return the top-k hits.
pub fn fuse_and_fetch(
    conn: &Connection,
    kw: &[String],
    sem: &[String],
    k: usize,
) -> rusqlite::Result<Vec<MemoryHit>> {
    let mut all: Vec<String> = kw.to_vec();
    all.extend(sem.iter().cloned());
    let rec = recency(conn, &all);
    let ranked = fuse(kw, sem, &rec);
    fetch_hits(conn, &ranked.into_iter().take(k).collect::<Vec<_>>())
}
