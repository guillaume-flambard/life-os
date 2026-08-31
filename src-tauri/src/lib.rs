//! Life OS backend. Owns the encrypted DB and the local AI client, exposes a
//! small set of typed commands to the front.

mod ai;
mod commands;
mod db;
mod domain;
mod events;
mod safety;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Register sqlite-vec before any connection is opened.
    db::register_vec();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_data_dir().expect("app data dir");
            std::fs::create_dir_all(&dir)?;
            let db_path = dir.join("life-os.db");

            let conn = db::open(&db_path).map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;
            app.manage(db::Db(Mutex::new(conn)));
            app.manage(ai::Ollama::from_env());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::db_health,
            commands::ai_health,
            commands::get_setting,
            commands::set_setting,
            commands::create_decision,
            commands::delete_decision,
            commands::list_decisions,
            commands::generate_delta,
            commands::list_domains,
            commands::create_domain,
            commands::rename_domain,
            commands::archive_domain,
            commands::list_intentions,
            commands::create_intention,
            commands::update_intention,
            commands::set_intention_priority,
            commands::archive_intention,
            commands::reformulate_intention,
            commands::open_decision,
            commands::decision_set_reality,
            commands::decision_set_distance,
            commands::decision_set_alignment,
            commands::decision_set_why,
            commands::decision_set_confidence,
            commands::decision_set_review_at,
            commands::decision_add_option,
            commands::decision_set_premortem,
            commands::decision_choose_option,
            commands::decision_list_options,
            commands::decision_add_delta,
            commands::decision_add_story,
            commands::decision_detail,
            commands::decision_finalize,
            commands::decision_suggest_options,
            commands::decision_align_values,
            commands::decision_generate_story,
            commands::review_open,
            commands::review_add_item,
            commands::review_items,
            commands::review_list,
            commands::list_proposed_decisions,
            commands::apply_decision,
            commands::memory_recall,
            commands::memory_backfill,
            commands::contradiction_check,
            commands::safety_screen,
            commands::export_data,
            commands::erase_all,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Life OS");
}
