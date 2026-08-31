//! Pure domain types shared across the backend.

use serde::{Deserialize, Serialize};

/// Result of a health probe, surfaced to the front.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Health {
    pub ok: bool,
    pub detail: String,
}

impl Health {
    pub fn ok(detail: impl Into<String>) -> Self {
        Self { ok: true, detail: detail.into() }
    }
    pub fn ko(detail: impl Into<String>) -> Self {
        Self { ok: false, detail: detail.into() }
    }
}

/// A decision (change proposal) — the central object. Minimal for foundations;
/// later changes extend the fields actually used.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Decision {
    pub id: String,
    pub title: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

/// A life area (engine: domain; façade: "pan de vie").
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Domain {
    pub id: String,
    pub name: String,
    pub sort_order: i64,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

/// An intention (engine: requirement + GWT scenario + priority).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Intention {
    pub id: String,
    pub domain_id: String,
    pub statement: String,
    pub situation: Option<String>,
    pub action: Option<String>,
    pub priority: String, // must | should | may
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

/// AI reformulation of a free-text intention into a testable marker.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reformulation {
    pub statement: Option<String>,
    pub situation: String,
    pub action: String,
}

/// Error surfaced to the front. `code` lets the UI branch (e.g. a gentle
/// "remove one first" on `cap_reached`) without string-matching messages.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
}

impl ApiError {
    pub fn cap_reached(message: impl Into<String>) -> Self {
        Self { code: "cap_reached".into(), message: message.into() }
    }
    pub fn db(e: impl std::fmt::Display) -> Self {
        Self { code: "db".into(), message: e.to_string() }
    }
    pub fn invalid(message: impl Into<String>) -> Self {
        Self { code: "invalid".into(), message: message.into() }
    }
    pub fn ai(message: impl Into<String>) -> Self {
        Self { code: "ai".into(), message: message.into() }
    }
    pub fn incomplete(message: impl Into<String>) -> Self {
        Self { code: "incomplete".into(), message: message.into() }
    }
}

impl From<rusqlite::Error> for ApiError {
    fn from(e: rusqlite::Error) -> Self {
        ApiError::db(e)
    }
}

/// A structured delta produced by the AI (validated before use).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Delta {
    pub op: String, // added | modified | removed
    pub statement: Option<String>,
    pub situation: Option<String>,
    pub action: Option<String>,
    pub priority: Option<String>, // must | should | may
}

/// A story (next small step) produced by the AI (validated before use).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorySuggestion {
    pub title: String,
    pub why: Option<String>,
    pub when_cue: Option<String>,
    pub done_when: Option<String>,
}

/// AI-suggested options for a decision (always includes a null option).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptionSuggestions {
    pub options: Vec<String>,
}

/// AI alignment note: names both fit and tension (anti-sycophancy).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlignmentNote {
    pub note: String,
}

// --- Decision session (persisted incrementally) ---------------------------

/// Full decision record (the change proposal).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionFull {
    pub id: String,
    pub title: String,
    pub proposal: Option<String>,
    pub strategy: Option<String>,
    pub status: String,
    pub confidence: Option<i64>,
    pub values_alignment_note: Option<String>,
    pub distance_10_10_10: Option<String>,
    pub review_at: Option<String>,
    pub emotional_context: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionOption {
    pub id: String,
    pub decision_id: String,
    pub label: String,
    pub is_null_option: bool,
    pub premortem: Option<String>,
    pub chosen: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeltaRow {
    pub id: String,
    pub decision_id: String,
    pub op: String,
    pub target_intention_id: Option<String>,
    pub domain_id: Option<String>,
    pub payload_statement: Option<String>,
    pub payload_situation: Option<String>,
    pub payload_action: Option<String>,
    pub payload_priority: Option<String>,
    pub applied_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoryRow {
    pub id: String,
    pub decision_id: Option<String>,
    pub title: String,
    pub why: Option<String>,
    pub when_cue: Option<String>,
    pub done_when: Option<String>,
    pub status: String,
}

/// Input for adding a delta (the AI suggestion or the user's edit).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeltaInput {
    pub op: String,
    pub target_intention_id: Option<String>,
    pub domain_id: Option<String>,
    pub payload_statement: Option<String>,
    pub payload_situation: Option<String>,
    pub payload_action: Option<String>,
    pub payload_priority: Option<String>,
}

/// A decision plus everything attached to it.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionDetail {
    pub decision: DecisionFull,
    pub options: Vec<DecisionOption>,
    pub deltas: Vec<DeltaRow>,
    pub stories: Vec<StoryRow>,
}

// --- Review (the check-in / QA) -------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Review {
    pub id: String,
    pub period_start: Option<String>,
    pub period_end: Option<String>,
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewItem {
    pub id: String,
    pub review_id: String,
    pub intention_id: Option<String>,
    pub decision_id: Option<String>,
    pub outcome: Option<String>, // better | as_expected | worse | too_early
    pub learning: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// How the user resolves one delta onto the compass at integration time.
/// `added` needs a `domain_id`; `modified`/`removed` need a `target_intention_id`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeltaResolution {
    pub delta_id: String,
    pub domain_id: Option<String>,
    pub target_intention_id: Option<String>,
}

// --- Memory ---------------------------------------------------------------

/// One recalled memory item.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryHit {
    pub chunk_id: String,
    pub content: String,
    pub source_type: String,
    pub source_id: Option<String>,
}

// --- Safety ---------------------------------------------------------------

/// A crisis or support resource shown to the user.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resource {
    pub name: String,
    pub contact: String,
    pub note: String,
}

/// A recurring theme extracted from the user's own text (FR12: profile from usage).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub term: String,
    pub count: i64,
}

/// An implementation intention / WOOP attached to a next step.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IfThenPlan {
    pub id: String,
    pub story_id: Option<String>,
    pub decision_id: Option<String>,
    pub wish: Option<String>,
    pub outcome: Option<String>,
    pub obstacle: Option<String>,
    pub cue: String,
    pub action: String,
    pub created_at: String,
    pub updated_at: String,
}

/// An open next step plus the title of the decision it belongs to (for the list).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenStory {
    pub id: String,
    pub decision_id: Option<String>,
    pub decision_title: Option<String>,
    pub title: String,
    pub when_cue: Option<String>,
    pub done_when: Option<String>,
}

/// A daily capture — a lightweight local jot.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Capture {
    pub id: String,
    pub content: String,
    pub kind: String, // note | reflection
    pub decision_id: Option<String>,
    pub intention_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// AI WOOP/if-then suggestion (validated before use).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WoopSuggestion {
    pub wish: Option<String>,
    pub outcome: Option<String>,
    pub obstacle: Option<String>,
    pub cue: String,
    pub action: String,
}

/// Result of local, on-device screening of user text. Never leaves the device.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenResult {
    /// A crisis signal was detected — leave the coaching flow, show resources.
    pub distress: bool,
    /// A high-stakes category (argent / santé / juridique), if any. Non-blocking.
    pub high_stakes: Option<String>,
    /// Crisis resources, populated when `distress` is true.
    pub resources: Vec<Resource>,
}
