//! Profile by extraction (FR12): recurring themes computed from what the user has
//! written — never a questionnaire. Simple term frequency over their own text,
//! minus stopwords; a mirror, not a verdict.

use crate::domain::{ApiError, Theme};
use rusqlite::Connection;
use std::collections::HashMap;

// A modest FR + EN stopword set. Common function words and filler that would
// otherwise dominate the counts.
const STOPWORDS: &[&str] = &[
    // French
    "avec", "dans", "pour", "plus", "mais", "être", "cette", "chez", "sans", "quand", "tout",
    "toute", "tous", "toutes", "leur", "leurs", "elle", "elles", "nous", "vous", "moi", "toi",
    "mon", "mes", "ton", "tes", "ses", "notre", "votre", "faire", "fait", "aussi", "comme",
    "parce", "donc", "alors", "encore", "très", "bien", "peu", "pas", "oui", "non", "que", "qui",
    "quoi", "cela", "ceci", "vraiment", "peut", "veux", "veut", "vais", "suis",
    // English
    "with", "that", "this", "have", "from", "your", "their", "about", "would", "could", "should",
    "there", "here", "what", "when", "where", "them", "they", "then", "than", "just", "like",
    "really", "want", "wants", "make", "makes", "some", "more", "much",
];

fn is_stop(t: &str) -> bool {
    STOPWORDS.contains(&t)
}

/// Extract up to `limit` recurring terms (count >= 2), most frequent first, drawn
/// from the user's intentions, decisions, and review learnings.
pub fn extract_themes(conn: &Connection, limit: usize) -> Result<Vec<Theme>, ApiError> {
    let mut texts: Vec<String> = Vec::new();

    let mut push = |conn: &Connection, sql: &str| -> Result<(), ApiError> {
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt
            .query_map([], |r| {
                Ok([
                    r.get::<_, Option<String>>(0)?,
                    r.get::<_, Option<String>>(1).unwrap_or(None),
                ])
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        for parts in rows {
            for p in parts.into_iter().flatten() {
                texts.push(p);
            }
        }
        Ok(())
    };

    push(
        conn,
        "SELECT statement, action FROM intentions WHERE deleted_at IS NULL",
    )?;
    push(
        conn,
        "SELECT title, proposal FROM decisions WHERE deleted_at IS NULL",
    )?;
    push(
        conn,
        "SELECT learning, NULL FROM review_items WHERE deleted_at IS NULL",
    )?;

    let mut counts: HashMap<String, i64> = HashMap::new();
    for text in &texts {
        for tok in text.split(|c: char| !c.is_alphanumeric()) {
            let t = tok.to_lowercase();
            if t.chars().count() >= 4 && !is_stop(&t) {
                *counts.entry(t).or_insert(0) += 1;
            }
        }
    }

    let mut themes: Vec<Theme> = counts
        .into_iter()
        .filter(|(_, c)| *c >= 2)
        .map(|(term, count)| Theme { term, count })
        .collect();
    // Most frequent first; alphabetical as a stable tiebreak.
    themes.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.term.cmp(&b.term)));
    themes.truncate(limit);
    Ok(themes)
}
