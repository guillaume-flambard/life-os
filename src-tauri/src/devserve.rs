//! Dev-only bridge: exposes the exact same command surface as the Tauri API
//! over plain local HTTP, so the real engine (encrypted DB + local model) can
//! be driven end-to-end from a browser running the vite dev server outside the
//! Tauri shell. Not part of the app: start it manually with
//! `cargo run --bin devserve` and set `LIFEOS_DEV_DB` to a scratch database.
//! AI commands run without the streaming handle (no live reasoning timeline).

use crate::ai::Ai;
use crate::db::{self, repo};
use crate::db::repo::{admin, capture, compass, decision, memory, profile, review, story};
use crate::domain::{ApiError, DeltaInput, DeltaResolution, Health};
use crate::{safety, sync};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};

type Db = Arc<Mutex<rusqlite::Connection>>;
type Out = Result<Value, Fail>;

/// HTTP status + JSON payload, convertibles from the command error types.
struct Fail(u16, Value);

impl From<ApiError> for Fail {
    fn from(e: ApiError) -> Self {
        Fail(400, json!({ "code": e.code, "message": e.message }))
    }
}

impl From<String> for Fail {
    fn from(e: String) -> Self {
        Fail(400, json!(e))
    }
}

impl From<rusqlite::Error> for Fail {
    fn from(e: rusqlite::Error) -> Self {
        Fail(400, json!(e.to_string()))
    }
}

fn ok<T: serde::Serialize>(v: T) -> Out {
    serde_json::to_value(v).map_err(|e| Fail(500, json!({ "code": "db", "message": e.to_string() })))
}

fn s(a: &Value, k: &str) -> String {
    a.get(k).and_then(|v| v.as_str()).unwrap_or_default().to_string()
}

fn os(a: &Value, k: &str) -> Option<String> {
    a.get(k).and_then(|v| v.as_str()).map(str::to_string)
}

fn oi(a: &Value, k: &str) -> Option<i64> {
    a.get(k).and_then(|v| v.as_i64())
}

fn b(a: &Value, k: &str) -> bool {
    a.get(k).and_then(|v| v.as_bool()).unwrap_or(false)
}

pub fn run() {
    let db_path = std::env::var("LIFEOS_DEV_DB").unwrap_or_else(|_| "devserve.db".into());
    db::register_vec();
    let conn = db::open(std::path::Path::new(&db_path)).unwrap_or_else(|e| {
        eprintln!("devserve: impossible d'ouvrir {db_path}: {e}");
        std::process::exit(1);
    });
    let db: Db = Arc::new(Mutex::new(conn));
    let ai = Arc::new(Ai::from_env());
    let addr = std::env::var("LIFEOS_DEV_PORT").unwrap_or_else(|_| "1421".into());

    tokio::runtime::Runtime::new().unwrap().block_on(async move {
        let listener = tokio::net::TcpListener::bind(("127.0.0.1", addr.parse().unwrap())).await.unwrap();
        println!("devserve: commands on http://127.0.0.1:{addr} (db: {db_path})");
        loop {
            let (stream, _) = listener.accept().await.unwrap();
            let db = db.clone();
            let ai = ai.clone();
            tokio::spawn(async move {
                let _ = serve_conn(stream, db, ai).await;
            });
        }
    });
}

async fn serve_conn(
    mut stream: tokio::net::TcpStream,
    db: Db,
    ai: Arc<Ai>,
) -> std::io::Result<()> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    // Read headers, then the body per Content-Length. One request per
    // connection (we answer `Connection: close`).
    let mut buf: Vec<u8> = Vec::new();
    let mut chunk = [0u8; 4096];
    let header_end;
    loop {
        let n = stream.read(&mut chunk).await?;
        if n == 0 {
            return Ok(());
        }
        buf.extend_from_slice(&chunk[..n]);
        if let Some(pos) = buf.windows(4).position(|w| w == b"\r\n\r\n") {
            header_end = pos + 4;
            break;
        }
        if buf.len() > 64 * 1024 {
            return Ok(());
        }
    }
    let headers = String::from_utf8_lossy(&buf[..header_end]).to_string();
    let request_line = headers.lines().next().unwrap_or_default().to_string();
    let content_length = headers
        .to_ascii_lowercase()
        .lines()
        .find_map(|l| l.strip_prefix("content-length:"))
        .and_then(|v| v.trim().parse::<usize>().ok())
        .unwrap_or(0);
    while buf.len() < header_end + content_length {
        let n = stream.read(&mut chunk).await?;
        if n == 0 {
            break;
        }
        buf.extend_from_slice(&chunk[..n]);
    }
    let body_bytes = &buf[header_end..(header_end + content_length).min(buf.len())];

    let (status, payload) = if request_line.starts_with("OPTIONS") {
        (
            204,
            Value::Null,
        )
    } else {
        match serde_json::from_slice::<Value>(body_bytes) {
            Ok(v) => dispatch(&db, &ai, v).await.map(|v| (200, v)).unwrap_or_else(|f| (f.0, f.1)),
            Err(_) => (400, json!({ "code": "invalid", "message": "unreadable body" })),
        }
    };

    let payload_bytes = if payload.is_null() && status == 204 {
        Vec::new()
    } else {
        serde_json::to_vec(&payload).unwrap_or_default()
    };
    let reason = match status {
        200 => "OK",
        204 => "No Content",
        400 => "Bad Request",
        404 => "Not Found",
        _ => "Error",
    };
    let head = format!(
        "HTTP/1.1 {status} {reason}\r\ncontent-type: application/json\r\ncontent-length: {}\r\n\
         access-control-allow-origin: *\r\naccess-control-allow-methods: POST, OPTIONS\r\n\
         access-control-allow-headers: content-type\r\nconnection: close\r\n\r\n",
        payload_bytes.len()
    );
    stream.write_all(head.as_bytes()).await?;
    stream.write_all(&payload_bytes).await?;
    stream.flush().await
}

async fn dispatch(db: &Db, ai: &Ai, body: Value) -> Out {
    let cmd = body.get("cmd").and_then(|v| v.as_str()).unwrap_or_default().to_string();
    let a = body.get("args").cloned().unwrap_or_else(|| json!({}));
    let conn = || db.lock().unwrap();

    match cmd.as_str() {
        "db_health" => {
            let c = conn();
            match repo::schema_ready(&c) {
                Ok(true) => ok(Health::ok("Encrypted database ready".to_string())),
                Ok(false) => ok(Health::ko("Missing schema".to_string())),
                Err(e) => ok(Health::ko(format!("Erreur base: {e}"))),
            }
        }
        "ai_health" => ok(ai.health().await),

        "get_setting" => ok(repo::get_setting(&conn(), &s(&a, "key"))?),
        "set_setting" => ok(repo::set_setting(&conn(), &s(&a, "key"), &s(&a, "value"))?),
        "create_decision" => ok(repo::create_decision(&conn(), &s(&a, "title"))?),
        "delete_decision" => ok(repo::soft_delete_decision(&conn(), &s(&a, "id"))?),
        "list_decisions" => ok(repo::list_decisions(&conn())?),
        "generate_delta" => ok(ai.generate_delta(&s(&a, "situation")).await?),

        // Compass
        "list_domains" => ok(compass::list_domains(&conn())?),
        "create_domain" => ok(compass::create_domain(&conn(), &s(&a, "name"))?),
        "rename_domain" => ok(compass::rename_domain(&conn(), &s(&a, "id"), &s(&a, "name"))?),
        "archive_domain" => ok(compass::archive_domain(&conn(), &s(&a, "id"))?),
        "list_intentions" => ok(compass::list_intentions(&conn(), &s(&a, "domain_id"))?),
        "create_intention" => ok(compass::create_intention(
            &conn(), &s(&a, "domain_id"), &s(&a, "statement"),
            os(&a, "situation").as_deref(), os(&a, "action").as_deref(), &s(&a, "priority"),
        )?),
        "update_intention" => ok(compass::update_intention(
            &conn(), &s(&a, "id"), &s(&a, "statement"),
            os(&a, "situation").as_deref(), os(&a, "action").as_deref(),
        )?),
        "set_intention_priority" => ok(compass::set_intention_priority(&conn(), &s(&a, "id"), &s(&a, "priority"))?),
        "archive_intention" => ok(compass::archive_intention(&conn(), &s(&a, "id"))?),
        "reformulate_intention" => ok(ai.reformulate_intention(&s(&a, "text"), None).await.map_err(ApiError::ai)?),

        // Guided decision
        "open_decision" => ok(decision::open_decision(&conn(), &s(&a, "title"))?),
        "decision_set_reality" => ok(decision::set_reality(&conn(), &s(&a, "id"), &s(&a, "text"))?),
        "decision_set_distance" => ok(decision::set_distance(&conn(), &s(&a, "id"), &s(&a, "text"))?),
        "decision_set_alignment" => ok(decision::set_alignment(&conn(), &s(&a, "id"), &s(&a, "note"))?),
        "decision_set_why" => ok(decision::set_why(&conn(), &s(&a, "id"), &s(&a, "text"))?),
        "decision_set_confidence" => ok(decision::set_confidence(&conn(), &s(&a, "id"), oi(&a, "confidence").unwrap_or(0))?),
        "decision_set_review_at" => ok(decision::set_review_at(&conn(), &s(&a, "id"), &s(&a, "date"))?),
        "decision_add_option" => ok(decision::add_option(&conn(), &s(&a, "decision_id"), &s(&a, "label"), b(&a, "is_null_option"))?),
        "decision_set_premortem" => ok(decision::set_option_premortem(&conn(), &s(&a, "option_id"), &s(&a, "text"))?),
        "decision_choose_option" => ok(decision::choose_option(&conn(), &s(&a, "decision_id"), &s(&a, "option_id"))?),
        "decision_list_options" => ok(decision::list_options(&conn(), &s(&a, "decision_id"))?),
        "decision_add_delta" => {
            let delta: DeltaInput = serde_json::from_value(a.get("delta").cloned().unwrap_or_default())
                .map_err(|e| ApiError::invalid(e.to_string()))?;
            ok(decision::add_delta(&conn(), &s(&a, "decision_id"), &delta)?)
        }
        "decision_add_story" => ok(decision::add_story(
            &conn(), &s(&a, "decision_id"), &s(&a, "title"),
            os(&a, "why").as_deref(), os(&a, "when_cue").as_deref(), os(&a, "done_when").as_deref(),
        )?),
        "decision_detail" => ok(decision::get_detail(&conn(), &s(&a, "id"))?),
        "decision_finalize" => ok(decision::finalize(&conn(), &s(&a, "id"))?),
        "decision_suggest_options" => ok(ai.suggest_options(&s(&a, "context"), None).await.map_err(ApiError::ai)?),
        "decision_align_values" => ok(ai.align_values(&s(&a, "option"), &s(&a, "intentions"), None).await.map_err(ApiError::ai)?),
        "decision_generate_story" => ok(ai.generate_story(&s(&a, "context"), None).await.map_err(ApiError::ai)?),

        // Review
        "review_open" => ok(review::open_review(&conn(), os(&a, "period_start").as_deref(), os(&a, "period_end").as_deref())?),
        "review_add_item" => ok(review::add_item(
            &conn(), &s(&a, "review_id"),
            os(&a, "intention_id").as_deref(), os(&a, "decision_id").as_deref(),
            os(&a, "outcome").as_deref(), os(&a, "learning").as_deref(),
        )?),
        "review_items" => ok(review::list_items(&conn(), &s(&a, "review_id"))?),
        "review_list" => ok(review::list_reviews(&conn())?),
        "list_proposed_decisions" => ok(decision::list_proposed_decisions(&conn())?),
        "apply_decision" => {
            let resolutions: Vec<DeltaResolution> =
                serde_json::from_value(a.get("resolutions").cloned().unwrap_or_else(|| json!([])))
                    .map_err(|e| ApiError::invalid(e.to_string()))?;
            ok(decision::apply_decision(&conn(), &s(&a, "decision_id"), &resolutions)?)
        }

        // Memory
        "memory_recall" => {
            let k = oi(&a, "k").unwrap_or(5).clamp(1, 20);
            let query = s(&a, "query");
            let kw = memory::keyword_search(&conn(), &query, k).map_err(ApiError::db)?;
            let sem = match ai.embed(&query).await {
                Ok(v) => memory::semantic_search(&conn(), &v, k).unwrap_or_default(),
                Err(_) => vec![],
            };
            ok(memory::fuse_and_fetch(&conn(), &kw, &sem, k as usize).map_err(ApiError::db)?)
        }
        "memory_backfill" => {
            let pending = memory::chunks_without_vec(&conn()).map_err(ApiError::db)?;
            let mut n = 0;
            for (id, content) in pending {
                match ai.embed(&content).await {
                    Ok(v) => {
                        memory::insert_vec(&conn(), &id, &v).map_err(ApiError::db)?;
                        n += 1;
                    }
                    Err(e) => {
                        if n == 0 {
                            return Err(ApiError::ai(format!("embedding model unavailable: {e}")).into());
                        }
                        break;
                    }
                }
            }
            ok(n)
        }
        "contradiction_check" => {
            let text = s(&a, "text");
            let kw = memory::keyword_search(&conn(), &text, 5).map_err(ApiError::db)?;
            let sem = match ai.embed(&text).await {
                Ok(v) => memory::semantic_search(&conn(), &v, 5).unwrap_or_default(),
                Err(_) => vec![],
            };
            let related: Vec<String> = {
                let c = conn();
                memory::fuse_and_fetch(&c, &kw, &sem, 3)
                    .map_err(ApiError::db)?
                    .into_iter()
                    .filter(|h| h.source_type == "decision" || h.source_type == "intention")
                    .map(|h| h.content)
                    .collect()
            };
            ok(ai.contradiction_question(&text, &related).await.map_err(ApiError::ai)?)
        }

        // Safety + data
        "safety_screen" => ok(safety::screen(&s(&a, "text"))),
        "export_data" => {
            let markdown = admin::export_markdown(&conn())?;
            let path = write_download(format!("life-os-export-{}.md", now_stamp()), markdown.into_bytes())?;
            ok(path)
        }
        "profile_themes" => ok(profile::extract_themes(&conn(), oi(&a, "limit").unwrap_or(6) as usize)?),

        // Next steps
        "list_open_stories" => ok(story::list_open_stories(&conn())?),
        "set_story_status" => ok(story::set_story_status(&conn(), &s(&a, "id"), &s(&a, "status"))?),
        "story_add_if_then" => ok(story::add_if_then(
            &conn(), &s(&a, "story_id"),
            os(&a, "decision_id").as_deref(), os(&a, "wish").as_deref(),
            os(&a, "outcome").as_deref(), os(&a, "obstacle").as_deref(),
            &s(&a, "cue"), &s(&a, "action"),
        )?),
        "story_if_then" => ok(story::list_if_then(&conn(), &s(&a, "story_id"))?),
        "generate_woop" => ok(ai.generate_woop(&s(&a, "context"), None).await.map_err(ApiError::ai)?),

        // Captures
        "capture_add" => ok(capture::add_capture(
            &conn(), &s(&a, "content"),
            os(&a, "kind").as_deref().unwrap_or("note"),
            os(&a, "decision_id").as_deref(), os(&a, "intention_id").as_deref(),
        )?),
        "captures_recent" => ok(capture::list_recent(&conn(), oi(&a, "limit").unwrap_or(30).clamp(1, 200))?),

        // Sync
        "sync_export" => {
            let passphrase = s(&a, "passphrase");
            if passphrase.len() < 8 {
                return Err(ApiError::invalid("choose a passphrase of at least 8 characters").into());
            }
            let snapshot = sync::export_json(&conn())?;
            let bytes = serde_json::to_vec(&snapshot).map_err(ApiError::db)?;
            let encrypted = sync::encrypt(&bytes, &passphrase).map_err(ApiError::invalid)?;
            ok(write_download(format!("life-os-sync-{}.age", now_stamp()), encrypted)?)
        }
        "sync_import" => {
            let encrypted = std::fs::read(s(&a, "path"))
                .map_err(|_| ApiError::invalid("file not found"))?;
            let bytes = sync::decrypt(&encrypted, &s(&a, "passphrase")).map_err(ApiError::invalid)?;
            let snapshot: Value = serde_json::from_slice(&bytes)
                .map_err(|_| ApiError::invalid("unreadable snapshot"))?;
            ok(sync::import_merge(&conn(), &snapshot)?)
        }
        "erase_all" => {
            if s(&a, "confirm") != "ERASE" {
                return Err(ApiError::invalid("missing confirmation").into());
            }
            ok(admin::erase_all(&conn())?)
        }

        _ => Err(Fail(
            404,
            json!({ "code": "invalid", "message": format!("unknown command: {cmd}") }),
        )),
    }
}

fn now_stamp() -> String {
    chrono::Utc::now().format("%Y%m%d-%H%M%S").to_string()
}

fn write_download(name: String, bytes: Vec<u8>) -> Result<String, Fail> {
    let home = std::env::var("HOME")
        .map_err(|_| ApiError::invalid("user directory not found"))?;
    let downloads = std::path::Path::new(&home).join("Downloads");
    let dir = if downloads.is_dir() { downloads } else { std::path::PathBuf::from(&home) };
    let path = dir.join(name);
    std::fs::write(&path, bytes).map_err(ApiError::db)?;
    Ok(path.to_string_lossy().into_owned())
}

