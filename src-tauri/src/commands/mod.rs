//! Tauri commands: the only surface the front can call. DB commands are sync and
//! lock the connection; AI commands are async and hit localhost Ollama only.

use crate::ai::Ollama;
use crate::db::repo::{admin, capture, compass, decision, memory, profile, review, story};
use crate::db::{repo, Db};
use crate::domain::{
    AlignmentNote, ApiError, Capture, Decision, DecisionDetail, DecisionFull, DecisionOption, Delta,
    DeltaInput, DeltaResolution, DeltaRow, Domain, Health, IfThenPlan, Intention, MemoryHit,
    MergeSummary, OpenStory, OptionSuggestions, Reformulation, Review, ReviewItem, ScreenResult,
    StoryRow, StorySuggestion, Theme, WoopSuggestion,
};
use crate::{safety, sync};
use tauri::{AppHandle, State};

#[tauri::command]
pub fn db_health(db: State<'_, Db>) -> Health {
    let conn = db.0.lock().unwrap();
    match repo::schema_ready(&conn) {
        Ok(true) => Health::ok("Base chiffrée prête".to_string()),
        Ok(false) => Health::ko("Schéma manquant".to_string()),
        Err(e) => Health::ko(format!("Erreur base: {e}")),
    }
}

#[tauri::command]
pub async fn ai_health(ai: State<'_, Ollama>) -> Result<Health, String> {
    Ok(ai.health().await)
}

#[tauri::command]
pub fn get_setting(db: State<'_, Db>, key: String) -> Result<Option<String>, String> {
    let conn = db.0.lock().unwrap();
    repo::get_setting(&conn, &key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_setting(db: State<'_, Db>, key: String, value: String) -> Result<(), String> {
    let conn = db.0.lock().unwrap();
    repo::set_setting(&conn, &key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_decision(db: State<'_, Db>, title: String) -> Result<Decision, String> {
    let conn = db.0.lock().unwrap();
    repo::create_decision(&conn, &title).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_decision(db: State<'_, Db>, id: String) -> Result<(), String> {
    let conn = db.0.lock().unwrap();
    repo::soft_delete_decision(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_decisions(db: State<'_, Db>) -> Result<Vec<Decision>, String> {
    let conn = db.0.lock().unwrap();
    repo::list_decisions(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_delta(ai: State<'_, Ollama>, situation: String) -> Result<Delta, String> {
    ai.generate_delta(&situation).await
}

// --- Compass: life areas --------------------------------------------------

#[tauri::command]
pub fn list_domains(db: State<'_, Db>) -> Result<Vec<Domain>, ApiError> {
    let conn = db.0.lock().unwrap();
    compass::list_domains(&conn)
}

#[tauri::command]
pub fn create_domain(db: State<'_, Db>, name: String) -> Result<Domain, ApiError> {
    let conn = db.0.lock().unwrap();
    compass::create_domain(&conn, &name)
}

#[tauri::command]
pub fn rename_domain(db: State<'_, Db>, id: String, name: String) -> Result<(), ApiError> {
    let conn = db.0.lock().unwrap();
    compass::rename_domain(&conn, &id, &name)
}

#[tauri::command]
pub fn archive_domain(db: State<'_, Db>, id: String) -> Result<(), ApiError> {
    let conn = db.0.lock().unwrap();
    compass::archive_domain(&conn, &id)
}

// --- Compass: intentions --------------------------------------------------

#[tauri::command]
pub fn list_intentions(db: State<'_, Db>, domain_id: String) -> Result<Vec<Intention>, ApiError> {
    let conn = db.0.lock().unwrap();
    compass::list_intentions(&conn, &domain_id)
}

#[tauri::command]
pub fn create_intention(
    db: State<'_, Db>,
    domain_id: String,
    statement: String,
    situation: Option<String>,
    action: Option<String>,
    priority: String,
) -> Result<Intention, ApiError> {
    let conn = db.0.lock().unwrap();
    compass::create_intention(
        &conn,
        &domain_id,
        &statement,
        situation.as_deref(),
        action.as_deref(),
        &priority,
    )
}

#[tauri::command]
pub fn update_intention(
    db: State<'_, Db>,
    id: String,
    statement: String,
    situation: Option<String>,
    action: Option<String>,
) -> Result<(), ApiError> {
    let conn = db.0.lock().unwrap();
    compass::update_intention(&conn, &id, &statement, situation.as_deref(), action.as_deref())
}

#[tauri::command]
pub fn set_intention_priority(
    db: State<'_, Db>,
    id: String,
    priority: String,
) -> Result<(), ApiError> {
    let conn = db.0.lock().unwrap();
    compass::set_intention_priority(&conn, &id, &priority)
}

#[tauri::command]
pub fn archive_intention(db: State<'_, Db>, id: String) -> Result<(), ApiError> {
    let conn = db.0.lock().unwrap();
    compass::archive_intention(&conn, &id)
}

#[tauri::command]
pub async fn reformulate_intention(
    app: AppHandle,
    ai: State<'_, Ollama>,
    text: String,
) -> Result<Reformulation, ApiError> {
    ai.reformulate_intention(&text, Some(&app))
        .await
        .map_err(ApiError::ai)
}

// --- Guided decision: session steps ---------------------------------------

#[tauri::command]
pub fn open_decision(db: State<'_, Db>, title: String) -> Result<DecisionFull, ApiError> {
    let conn = db.0.lock().unwrap();
    decision::open_decision(&conn, &title)
}

#[tauri::command]
pub fn decision_set_reality(db: State<'_, Db>, id: String, text: String) -> Result<(), ApiError> {
    let conn = db.0.lock().unwrap();
    decision::set_reality(&conn, &id, &text)
}

#[tauri::command]
pub fn decision_set_distance(db: State<'_, Db>, id: String, text: String) -> Result<(), ApiError> {
    let conn = db.0.lock().unwrap();
    decision::set_distance(&conn, &id, &text)
}

#[tauri::command]
pub fn decision_set_alignment(db: State<'_, Db>, id: String, note: String) -> Result<(), ApiError> {
    let conn = db.0.lock().unwrap();
    decision::set_alignment(&conn, &id, &note)
}

#[tauri::command]
pub fn decision_set_why(db: State<'_, Db>, id: String, text: String) -> Result<(), ApiError> {
    let conn = db.0.lock().unwrap();
    decision::set_why(&conn, &id, &text)
}

#[tauri::command]
pub fn decision_set_confidence(db: State<'_, Db>, id: String, confidence: i64) -> Result<(), ApiError> {
    let conn = db.0.lock().unwrap();
    decision::set_confidence(&conn, &id, confidence)
}

#[tauri::command]
pub fn decision_set_review_at(db: State<'_, Db>, id: String, date: String) -> Result<(), ApiError> {
    let conn = db.0.lock().unwrap();
    decision::set_review_at(&conn, &id, &date)
}

#[tauri::command]
pub fn decision_add_option(
    db: State<'_, Db>,
    decision_id: String,
    label: String,
    is_null_option: bool,
) -> Result<DecisionOption, ApiError> {
    let conn = db.0.lock().unwrap();
    decision::add_option(&conn, &decision_id, &label, is_null_option)
}

#[tauri::command]
pub fn decision_set_premortem(db: State<'_, Db>, option_id: String, text: String) -> Result<(), ApiError> {
    let conn = db.0.lock().unwrap();
    decision::set_option_premortem(&conn, &option_id, &text)
}

#[tauri::command]
pub fn decision_choose_option(
    db: State<'_, Db>,
    decision_id: String,
    option_id: String,
) -> Result<(), ApiError> {
    let conn = db.0.lock().unwrap();
    decision::choose_option(&conn, &decision_id, &option_id)
}

#[tauri::command]
pub fn decision_list_options(db: State<'_, Db>, decision_id: String) -> Result<Vec<DecisionOption>, ApiError> {
    let conn = db.0.lock().unwrap();
    decision::list_options(&conn, &decision_id)
}

#[tauri::command]
pub fn decision_add_delta(
    db: State<'_, Db>,
    decision_id: String,
    delta: DeltaInput,
) -> Result<DeltaRow, ApiError> {
    let conn = db.0.lock().unwrap();
    decision::add_delta(&conn, &decision_id, &delta)
}

#[tauri::command]
pub fn decision_add_story(
    db: State<'_, Db>,
    decision_id: String,
    title: String,
    why: Option<String>,
    when_cue: Option<String>,
    done_when: Option<String>,
) -> Result<StoryRow, ApiError> {
    let conn = db.0.lock().unwrap();
    decision::add_story(&conn, &decision_id, &title, why.as_deref(), when_cue.as_deref(), done_when.as_deref())
}

#[tauri::command]
pub fn decision_detail(db: State<'_, Db>, id: String) -> Result<DecisionDetail, ApiError> {
    let conn = db.0.lock().unwrap();
    decision::get_detail(&conn, &id)
}

#[tauri::command]
pub fn decision_finalize(db: State<'_, Db>, id: String) -> Result<DecisionFull, ApiError> {
    let conn = db.0.lock().unwrap();
    decision::finalize(&conn, &id)
}

// --- Guided decision: AI assists (optional) -------------------------------

#[tauri::command]
pub async fn decision_suggest_options(
    app: AppHandle,
    ai: State<'_, Ollama>,
    context: String,
) -> Result<OptionSuggestions, ApiError> {
    ai.suggest_options(&context, Some(&app))
        .await
        .map_err(ApiError::ai)
}

#[tauri::command]
pub async fn decision_align_values(
    app: AppHandle,
    ai: State<'_, Ollama>,
    option: String,
    intentions: String,
) -> Result<AlignmentNote, ApiError> {
    ai.align_values(&option, &intentions, Some(&app))
        .await
        .map_err(ApiError::ai)
}

#[tauri::command]
pub async fn decision_generate_story(
    app: AppHandle,
    ai: State<'_, Ollama>,
    context: String,
) -> Result<StorySuggestion, ApiError> {
    ai.generate_story(&context, Some(&app))
        .await
        .map_err(ApiError::ai)
}

// --- Review (the check-in) ------------------------------------------------

#[tauri::command]
pub fn review_open(
    db: State<'_, Db>,
    period_start: Option<String>,
    period_end: Option<String>,
) -> Result<Review, ApiError> {
    let conn = db.0.lock().unwrap();
    review::open_review(&conn, period_start.as_deref(), period_end.as_deref())
}

#[tauri::command]
pub fn review_add_item(
    db: State<'_, Db>,
    review_id: String,
    intention_id: Option<String>,
    decision_id: Option<String>,
    outcome: Option<String>,
    learning: Option<String>,
) -> Result<ReviewItem, ApiError> {
    let conn = db.0.lock().unwrap();
    review::add_item(
        &conn,
        &review_id,
        intention_id.as_deref(),
        decision_id.as_deref(),
        outcome.as_deref(),
        learning.as_deref(),
    )
}

#[tauri::command]
pub fn review_items(db: State<'_, Db>, review_id: String) -> Result<Vec<ReviewItem>, ApiError> {
    let conn = db.0.lock().unwrap();
    review::list_items(&conn, &review_id)
}

#[tauri::command]
pub fn review_list(db: State<'_, Db>) -> Result<Vec<Review>, ApiError> {
    let conn = db.0.lock().unwrap();
    review::list_reviews(&conn)
}

#[tauri::command]
pub fn list_proposed_decisions(db: State<'_, Db>) -> Result<Vec<DecisionFull>, ApiError> {
    let conn = db.0.lock().unwrap();
    decision::list_proposed_decisions(&conn)
}

#[tauri::command]
pub fn apply_decision(
    db: State<'_, Db>,
    decision_id: String,
    resolutions: Vec<DeltaResolution>,
) -> Result<DecisionFull, ApiError> {
    let conn = db.0.lock().unwrap();
    decision::apply_decision(&conn, &decision_id, &resolutions)
}

// --- Memory (hybrid recall + contradiction) -------------------------------

// The DB Mutex guard is never held across an await: sync read → await embed →
// sync search, each in its own scope.

#[tauri::command]
pub async fn memory_recall(
    db: State<'_, Db>,
    ai: State<'_, Ollama>,
    query: String,
    k: Option<i64>,
) -> Result<Vec<MemoryHit>, ApiError> {
    let k = k.unwrap_or(5).clamp(1, 20);
    let kw = {
        let conn = db.0.lock().unwrap();
        memory::keyword_search(&conn, &query, k).map_err(ApiError::db)?
    };
    let sem = match ai.embed(&query).await {
        Ok(v) => {
            let conn = db.0.lock().unwrap();
            memory::semantic_search(&conn, &v, k).unwrap_or_default()
        }
        Err(_) => vec![], // no embed model → keyword-only, still useful
    };
    let conn = db.0.lock().unwrap();
    memory::fuse_and_fetch(&conn, &kw, &sem, k as usize).map_err(ApiError::db)
}

#[tauri::command]
pub async fn memory_backfill(db: State<'_, Db>, ai: State<'_, Ollama>) -> Result<i64, ApiError> {
    let pending = {
        let conn = db.0.lock().unwrap();
        memory::chunks_without_vec(&conn).map_err(ApiError::db)?
    };
    let mut n = 0;
    for (id, content) in pending {
        match ai.embed(&content).await {
            Ok(v) => {
                let conn = db.0.lock().unwrap();
                memory::insert_vec(&conn, &id, &v).map_err(ApiError::db)?;
                n += 1;
            }
            Err(e) => {
                if n == 0 {
                    return Err(ApiError::ai(format!("modèle d'embedding indisponible : {e}")));
                }
                break;
            }
        }
    }
    Ok(n)
}

#[tauri::command]
pub async fn contradiction_check(
    db: State<'_, Db>,
    ai: State<'_, Ollama>,
    text: String,
) -> Result<Option<String>, ApiError> {
    let kw = {
        let conn = db.0.lock().unwrap();
        memory::keyword_search(&conn, &text, 5).map_err(ApiError::db)?
    };
    let sem = match ai.embed(&text).await {
        Ok(v) => {
            let conn = db.0.lock().unwrap();
            memory::semantic_search(&conn, &v, 5).unwrap_or_default()
        }
        Err(_) => vec![],
    };
    let related: Vec<String> = {
        let conn = db.0.lock().unwrap();
        memory::fuse_and_fetch(&conn, &kw, &sem, 3)
            .map_err(ApiError::db)?
            .into_iter()
            .filter(|h| h.source_type == "decision" || h.source_type == "intention")
            .map(|h| h.content)
            .collect()
    };
    ai.contradiction_question(&text, &related).await.map_err(ApiError::ai)
}

// --- Safety (distress screening, export, erase) ---------------------------

/// Local, on-device screening. No DB, no network — the text is never stored or sent.
#[tauri::command]
pub fn safety_screen(text: String) -> ScreenResult {
    safety::screen(&text)
}

/// Export all data to a Markdown file under the user's Downloads; return the path.
#[tauri::command]
pub fn export_data(db: State<'_, Db>) -> Result<String, ApiError> {
    let markdown = {
        let conn = db.0.lock().unwrap();
        admin::export_markdown(&conn)?
    };
    let home = std::env::var("HOME").map_err(|_| ApiError::invalid("dossier utilisateur introuvable".to_string()))?;
    let downloads = std::path::Path::new(&home).join("Downloads");
    let dir = if downloads.is_dir() { downloads } else { std::path::PathBuf::from(&home) };
    let name = format!("life-os-export-{}.md", chrono::Utc::now().format("%Y%m%d-%H%M%S"));
    let path = dir.join(name);
    std::fs::write(&path, markdown).map_err(|e| ApiError::db(e))?;
    Ok(path.to_string_lossy().into_owned())
}

/// Recurring themes extracted from the user's own text (FR12). Never a form.
#[tauri::command]
pub fn profile_themes(db: State<'_, Db>, limit: Option<usize>) -> Result<Vec<Theme>, ApiError> {
    let conn = db.0.lock().unwrap();
    profile::extract_themes(&conn, limit.unwrap_or(6))
}

// --- Next steps (Epic 4) --------------------------------------------------

#[tauri::command]
pub fn list_open_stories(db: State<'_, Db>) -> Result<Vec<OpenStory>, ApiError> {
    let conn = db.0.lock().unwrap();
    story::list_open_stories(&conn)
}

#[tauri::command]
pub fn set_story_status(db: State<'_, Db>, id: String, status: String) -> Result<(), ApiError> {
    let conn = db.0.lock().unwrap();
    story::set_story_status(&conn, &id, &status)
}

#[tauri::command]
pub fn story_add_if_then(
    db: State<'_, Db>,
    story_id: String,
    decision_id: Option<String>,
    wish: Option<String>,
    outcome: Option<String>,
    obstacle: Option<String>,
    cue: String,
    action: String,
) -> Result<IfThenPlan, ApiError> {
    let conn = db.0.lock().unwrap();
    story::add_if_then(
        &conn,
        &story_id,
        decision_id.as_deref(),
        wish.as_deref(),
        outcome.as_deref(),
        obstacle.as_deref(),
        &cue,
        &action,
    )
}

#[tauri::command]
pub fn story_if_then(db: State<'_, Db>, story_id: String) -> Result<Vec<IfThenPlan>, ApiError> {
    let conn = db.0.lock().unwrap();
    story::list_if_then(&conn, &story_id)
}

#[tauri::command]
pub async fn generate_woop(
    app: AppHandle,
    ai: State<'_, Ollama>,
    context: String,
) -> Result<WoopSuggestion, ApiError> {
    ai.generate_woop(&context, Some(&app))
        .await
        .map_err(ApiError::ai)
}

// --- Daily captures (Phase 2) ---------------------------------------------

#[tauri::command]
pub fn capture_add(
    db: State<'_, Db>,
    content: String,
    kind: Option<String>,
    decision_id: Option<String>,
    intention_id: Option<String>,
) -> Result<Capture, ApiError> {
    let conn = db.0.lock().unwrap();
    capture::add_capture(
        &conn,
        &content,
        kind.as_deref().unwrap_or("note"),
        decision_id.as_deref(),
        intention_id.as_deref(),
    )
}

#[tauri::command]
pub fn captures_recent(db: State<'_, Db>, limit: Option<i64>) -> Result<Vec<Capture>, ApiError> {
    let conn = db.0.lock().unwrap();
    capture::list_recent(&conn, limit.unwrap_or(30).clamp(1, 200))
}

// --- Sync (Phase 2): encrypted snapshot export / merge import -------------

#[tauri::command]
pub fn sync_export(db: State<'_, Db>, passphrase: String) -> Result<String, ApiError> {
    if passphrase.len() < 8 {
        return Err(ApiError::invalid("choisis une phrase secrète d'au moins 8 caractères".to_string()));
    }
    let snapshot = {
        let conn = db.0.lock().unwrap();
        sync::export_json(&conn)?
    };
    let bytes = serde_json::to_vec(&snapshot).map_err(|e| ApiError::db(e))?;
    let encrypted = sync::encrypt(&bytes, &passphrase).map_err(ApiError::invalid)?;

    let home = std::env::var("HOME").map_err(|_| ApiError::invalid("dossier utilisateur introuvable".to_string()))?;
    let downloads = std::path::Path::new(&home).join("Downloads");
    let dir = if downloads.is_dir() { downloads } else { std::path::PathBuf::from(&home) };
    let name = format!("life-os-sync-{}.age", chrono::Utc::now().format("%Y%m%d-%H%M%S"));
    let path = dir.join(name);
    std::fs::write(&path, encrypted).map_err(|e| ApiError::db(e))?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn sync_import(db: State<'_, Db>, path: String, passphrase: String) -> Result<MergeSummary, ApiError> {
    let encrypted = std::fs::read(&path).map_err(|_| ApiError::invalid("fichier introuvable".to_string()))?;
    let bytes = sync::decrypt(&encrypted, &passphrase).map_err(ApiError::invalid)?;
    let snapshot: serde_json::Value =
        serde_json::from_slice(&bytes).map_err(|_| ApiError::invalid("instantané illisible".to_string()))?;
    let conn = db.0.lock().unwrap();
    sync::import_merge(&conn, &snapshot)
}

/// Erase everything. Guarded by an explicit confirmation token from the UI.
#[tauri::command]
pub fn erase_all(db: State<'_, Db>, confirm: String) -> Result<(), ApiError> {
    if confirm != "EFFACER" {
        return Err(ApiError::invalid("confirmation manquante".to_string()));
    }
    let conn = db.0.lock().unwrap();
    admin::erase_all(&conn)
}
