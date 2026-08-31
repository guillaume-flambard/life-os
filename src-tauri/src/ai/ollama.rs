//! Local Ollama client. All requests go to localhost only. Structured outputs
//! are constrained by a JSON Schema and validated (by typed deserialization)
//! before use — an invalid output is never returned as success.

use crate::domain::{
    AlignmentNote, Delta, Health, OptionSuggestions, Reformulation, StorySuggestion, WoopSuggestion,
};
use futures_util::StreamExt;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};

const DELTA_SCHEMA: &str = include_str!("schemas/delta.json");
const INTENTION_SCHEMA: &str = include_str!("schemas/intention.json");
const OPTIONS_SCHEMA: &str = include_str!("schemas/options.json");
const ALIGN_SCHEMA: &str = include_str!("schemas/align.json");
const STORY_SCHEMA: &str = include_str!("schemas/story.json");
const QUESTION_SCHEMA: &str = include_str!("schemas/question.json");
const WOOP_SCHEMA: &str = include_str!("schemas/woop.json");

pub struct Ollama {
    base: String,
    model: String,
    http: reqwest::Client,
}

impl Ollama {
    pub fn from_env() -> Self {
        let base = std::env::var("LIFEOS_OLLAMA_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:11434".to_string());
        let model = std::env::var("LIFEOS_MODEL").unwrap_or_else(|_| "qwen3:8b".to_string());
        Self { base, model, http: reqwest::Client::new() }
    }

    /// Probe the local server. Never contacts any external host.
    pub async fn health(&self) -> Health {
        match self.http.get(format!("{}/api/tags", self.base)).send().await {
            Ok(r) if r.status().is_success() => Health::ok(format!("Ollama prêt ({})", self.model)),
            Ok(r) => Health::ko(format!("Ollama a répondu {}", r.status())),
            Err(_) => Health::ko("Ollama injoignable (lance `ollama serve`)".to_string()),
        }
    }

    /// Ask the model for a structured JSON object constrained by `schema`.
    ///
    /// When `app` is `Some`, the call streams and the model's private reasoning
    /// is surfaced live to the UI via `ai-reasoning` events (and `ai-reasoning-end`
    /// when it stops) — this powers the "how I got there" panel. When `app` is
    /// `None`, thinking is disabled and the call is a single non-streamed request
    /// (lower latency for utility calls whose reasoning we never show).
    async fn chat_json(
        &self,
        system: &str,
        user: &str,
        schema: Value,
        app: Option<&AppHandle>,
    ) -> Result<Value, String> {
        let streaming = app.is_some();
        let body = json!({
            "model": self.model,
            "stream": streaming,
            "think": streaming,
            "format": schema,
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": user }
            ]
        });
        let resp = self
            .http
            .post(format!("{}/api/chat", self.base))
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            if let Some(app) = app {
                let _ = app.emit("ai-reasoning-end", json!({}));
            }
            return Err(format!("Ollama a répondu {}", resp.status()));
        }

        let Some(app) = app else {
            // Non-streamed path: one JSON object, content is the schema-valid answer.
            let v: Value = resp.json().await.map_err(|e| e.to_string())?;
            let content = v["message"]["content"]
                .as_str()
                .ok_or("réponse sans contenu")?;
            return serde_json::from_str::<Value>(content).map_err(|e| e.to_string());
        };

        // Streamed path: Ollama sends newline-delimited JSON. Each line may carry a
        // slice of `message.thinking` (emitted live) and/or `message.content` (the
        // answer, accumulated). The final answer is the concatenated content.
        let mut content = String::new();
        let mut buf: Vec<u8> = Vec::new();
        let mut stream = resp.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let bytes = chunk.map_err(|e| e.to_string())?;
            buf.extend_from_slice(&bytes);
            while let Some(pos) = buf.iter().position(|b| *b == b'\n') {
                let line: Vec<u8> = buf.drain(..=pos).collect();
                let line = &line[..line.len().saturating_sub(1)];
                if line.is_empty() {
                    continue;
                }
                if let Ok(v) = serde_json::from_slice::<Value>(line) {
                    if let Some(t) = v["message"]["thinking"].as_str() {
                        if !t.is_empty() {
                            let _ = app.emit("ai-reasoning", json!({ "delta": t }));
                        }
                    }
                    if let Some(c) = v["message"]["content"].as_str() {
                        content.push_str(c);
                    }
                    if v["done"].as_bool().unwrap_or(false) {
                        break;
                    }
                }
            }
        }
        let _ = app.emit("ai-reasoning-end", json!({}));
        serde_json::from_str::<Value>(content.trim()).map_err(|e| e.to_string())
    }

    /// Produce a schema-valid delta. Deserializing into `Delta` is the
    /// validation step (NFR4): a malformed output errors instead of persisting.
    pub async fn generate_delta(&self, situation: &str) -> Result<Delta, String> {
        let schema: Value = serde_json::from_str(DELTA_SCHEMA).map_err(|e| e.to_string())?;
        let raw = self
            .chat_json(
                "Tu produis un unique changement (op added/modified/removed) au format JSON.",
                situation,
                schema,
                None,
            )
            .await?;
        serde_json::from_value::<Delta>(raw).map_err(|e| format!("sortie invalide: {e}"))
    }

    /// Turn free-text intention into a testable "when [situation], I [action]"
    /// marker. Assistive only — the caller can always fall back to manual entry.
    pub async fn reformulate_intention(
        &self,
        text: &str,
        app: Option<&AppHandle>,
    ) -> Result<Reformulation, String> {
        let schema: Value = serde_json::from_str(INTENTION_SCHEMA).map_err(|e| e.to_string())?;
        let raw = self
            .chat_json(
                "Reformule ce que dit la personne en un repère testable. Réponds en JSON avec \
                 'situation' (quand…) et 'action' (je…), dans sa langue, sans jargon.",
                text,
                schema,
                app,
            )
            .await?;
        serde_json::from_value::<Reformulation>(raw).map_err(|e| format!("sortie invalide: {e}"))
    }

    /// Widen options. The prompt requires at least three, one of which is a
    /// "what if none of these?" option. Assistive — the user edits the result.
    pub async fn suggest_options(
        &self,
        context: &str,
        app: Option<&AppHandle>,
    ) -> Result<OptionSuggestions, String> {
        let schema: Value = serde_json::from_str(OPTIONS_SCHEMA).map_err(|e| e.to_string())?;
        let raw = self
            .chat_json(
                "Propose au moins trois options pour cette décision, dont une du type \
                 « et si aucune de ces options ? ». N'impose rien, ne dis jamais « tu devrais ». \
                 Réponds en JSON { options: [...] } dans la langue de la personne.",
                context,
                schema,
                app,
            )
            .await?;
        serde_json::from_value::<OptionSuggestions>(raw).map_err(|e| format!("sortie invalide: {e}"))
    }

    /// Report alignment to the compass in plain words. The prompt requires
    /// naming both the fit AND the tension (anti-sycophancy, NFR17).
    pub async fn align_values(
        &self,
        option: &str,
        intentions: &str,
        app: Option<&AppHandle>,
    ) -> Result<AlignmentNote, String> {
        let schema: Value = serde_json::from_str(ALIGN_SCHEMA).map_err(|e| e.to_string())?;
        let user = format!("Option envisagée : {option}\n\nCe qui compte pour la personne :\n{intentions}");
        let raw = self
            .chat_json(
                "Dis, en mots simples, en quoi cette option COLLE avec ce qui compte pour la \
                 personne ET en quoi elle TIRE CONTRE. Nomme toujours les deux côtés. Exprime ton \
                 incertitude. Ne dis jamais « tu devrais ». Réponds en JSON { note: \"...\" }.",
                &user,
                schema,
                app,
            )
            .await?;
        serde_json::from_value::<AlignmentNote>(raw).map_err(|e| format!("sortie invalide: {e}"))
    }

    /// Propose one self-contained next step. Assistive — the user edits it.
    pub async fn generate_story(
        &self,
        context: &str,
        app: Option<&AppHandle>,
    ) -> Result<StorySuggestion, String> {
        let schema: Value = serde_json::from_str(STORY_SCHEMA).map_err(|e| e.to_string())?;
        let raw = self
            .chat_json(
                "Propose UN prochain petit pas, auto-suffisant, avec son contexte : titre, \
                 pourquoi, quand (un déclencheur concret), et à quoi on saura que c'est fait. \
                 Réponds en JSON { title, why, when_cue, done_when } dans la langue de la personne.",
                context,
                schema,
                app,
            )
            .await?;
        serde_json::from_value::<StorySuggestion>(raw).map_err(|e| format!("sortie invalide: {e}"))
    }

    /// Embed text locally (EmbeddingGemma, 768-dim). Used for semantic recall.
    pub async fn embed(&self, text: &str) -> Result<Vec<f32>, String> {
        let model =
            std::env::var("LIFEOS_EMBED_MODEL").unwrap_or_else(|_| "embeddinggemma".to_string());
        let body = json!({ "model": model, "input": text });
        let resp = self
            .http
            .post(format!("{}/api/embed", self.base))
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            return Err(format!("Ollama a répondu {}", resp.status()));
        }
        let v: Value = resp.json().await.map_err(|e| e.to_string())?;
        let emb = v["embeddings"][0]
            .as_array()
            .ok_or("réponse d'embedding vide")?
            .iter()
            .map(|x| x.as_f64().unwrap_or(0.0) as f32)
            .collect::<Vec<f32>>();
        if emb.is_empty() {
            return Err("embedding vide".to_string());
        }
        Ok(emb)
    }

    /// If what the user is weighing has tension with their history, return ONE
    /// gentle question; otherwise return None. Never a judgment (FR10, NFR17).
    pub async fn contradiction_question(
        &self,
        text: &str,
        related: &[String],
    ) -> Result<Option<String>, String> {
        if related.is_empty() {
            return Ok(None);
        }
        let schema: Value = serde_json::from_str(QUESTION_SCHEMA).map_err(|e| e.to_string())?;
        let user = format!(
            "Ce que la personne envisage : {text}\n\nSon histoire :\n{}",
            related.join("\n- ")
        );
        let raw = self
            .chat_json(
                "S'il y a une tension entre ce que la personne envisage et son histoire, pose UNE \
                 seule question douce et ouverte, jamais un jugement, jamais « tu devrais ». S'il \
                 n'y a pas de tension, renvoie une question vide. JSON { question }.",
                &user,
                schema,
                None,
            )
            .await?;
        let q = raw["question"].as_str().unwrap_or("").trim().to_string();
        Ok(if q.is_empty() { None } else { Some(q) })
    }

    /// Turn a next step into ONE implementation intention (WOOP). One concrete cue
    /// ("si …") and one tiny action ("alors …"); never a plan of many steps.
    pub async fn generate_woop(
        &self,
        context: &str,
        app: Option<&AppHandle>,
    ) -> Result<WoopSuggestion, String> {
        let schema: Value = serde_json::from_str(WOOP_SCHEMA).map_err(|e| e.to_string())?;
        let raw = self
            .chat_json(
                "Transforme ce pas en UNE intention d'implémentation. Donne un déclencheur \
                 concret 'cue' (si …) et UNE action minuscule 'action' (alors …), plus si utile \
                 wish/outcome/obstacle. Un seul si-alors, jamais une liste. JSON \
                 { wish, outcome, obstacle, cue, action }, dans la langue de la personne.",
                context,
                schema,
                app,
            )
            .await?;
        serde_json::from_value::<WoopSuggestion>(raw).map_err(|e| format!("sortie invalide: {e}"))
    }
}
