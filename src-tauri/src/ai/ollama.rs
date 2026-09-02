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

/// Which wire protocol the local server speaks.
#[derive(Clone, Copy, PartialEq)]
enum Kind {
    /// Ollama's native API (/api/chat, /api/embed) — the default; the only
    /// backend that streams the model's reasoning for the live timeline.
    Ollama,
    /// Any OpenAI-compatible server (LM Studio, llama.cpp server, Ollama's /v1…).
    /// Base URL includes /v1. Non-streaming; structured output via
    /// response_format json_schema, still validated by typed deserialization.
    OpenAi,
}

pub struct Ai {
    kind: Kind,
    base: String,
    model: String,
    embed_model: String,
    http: reqwest::Client,
}

use Kind::{Ollama, OpenAi};

impl Ai {
    pub fn from_env() -> Self {
        let kind = match std::env::var("LIFEOS_AI_BACKEND").as_deref() {
            Ok("openai") => OpenAi,
            _ => Ollama,
        };
        let base = std::env::var("LIFEOS_AI_URL").unwrap_or_else(|_| match kind {
            Ollama => "http://127.0.0.1:11434".to_string(),
            OpenAi => "http://127.0.0.1:11434/v1".to_string(),
        });
        let model = std::env::var("LIFEOS_MODEL").unwrap_or_else(|_| "qwen3:8b".to_string());
        let embed_model =
            std::env::var("LIFEOS_EMBED_MODEL").unwrap_or_else(|_| "embeddinggemma".to_string());
        // Bounded calls: a wedged or absent local server must fail, not hang the
        // command forever. 300 s is generous for a local model yet finite;
        // overridable for slow hardware via LIFEOS_HTTP_TIMEOUT_SECS.
        let secs = std::env::var("LIFEOS_HTTP_TIMEOUT_SECS")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(300);
        let http = reqwest::Client::builder()
            .connect_timeout(std::time::Duration::from_secs(10))
            .timeout(std::time::Duration::from_secs(secs))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        Self {
            kind,
            base,
            model,
            embed_model,
            http,
        }
    }

    fn probe_url(&self) -> String {
        match self.kind {
            Ollama => format!("{}/api/tags", self.base),
            OpenAi => format!("{}/models", self.base),
        }
    }

    /// Probe the local server. Never contacts any external host.
    pub async fn health(&self) -> Health {
        match self.http.get(self.probe_url()).send().await {
            Ok(r) if r.status().is_success() => Health::ok(format!("AI ready ({})", self.model)),
            Ok(r) => Health::ko(format!("AI server responded {}", r.status())),
            Err(_) => Health::ko(match self.kind {
                Ollama => "Ollama unreachable (run `ollama serve`)".to_string(),
                OpenAi => format!("AI server unreachable at {}", self.base),
            }),
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
        if self.kind == OpenAi {
            return self.chat_json_openai(system, user, schema).await;
        }
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
            return Err(format!("Ollama responded {}", resp.status()));
        }

        let Some(app) = app else {
            // Non-streamed path: one JSON object, content is the schema-valid answer.
            let v: Value = resp.json().await.map_err(|e| e.to_string())?;
            let content = v["message"]["content"]
                .as_str()
                .ok_or("response without content")?;
            return parse_model_json(content);
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
        parse_model_json(content.trim())
    }

    /// OpenAI-compatible path: one non-streamed request with a json_schema
    /// response_format. No reasoning stream (the UI folds to its "thinking"
    /// placeholder); the answer is still validated by typed deserialization.
    async fn chat_json_openai(
        &self,
        system: &str,
        user: &str,
        schema: Value,
    ) -> Result<Value, String> {
        let body = json!({
            "model": self.model,
            "stream": false,
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": user }
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": { "name": "reply", "schema": schema, "strict": true }
            }
        });
        let resp = self
            .http
            .post(format!("{}/chat/completions", self.base))
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            return Err(format!("AI server responded {}", resp.status()));
        }
        let v: Value = resp.json().await.map_err(|e| e.to_string())?;
        let content = v["choices"][0]["message"]["content"]
            .as_str()
            .ok_or("response without content")?;
        parse_model_json(content)
    }

    /// Produce a schema-valid delta. Deserializing into `Delta` is the
    /// validation step (NFR4): a malformed output errors instead of persisting.
    pub async fn generate_delta(&self, situation: &str) -> Result<Delta, String> {
        let schema: Value = serde_json::from_str(DELTA_SCHEMA).map_err(|e| e.to_string())?;
        let raw = self
            .chat_json(
                "You produce a single change (op added/modified/removed) as JSON. Write the statement, situation and action in the language the person wrote in.",
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
                "Rephrase what the person says into one testable marker. Answer in JSON with \
                 'situation' (the trigger, without repeating the word 'when') and 'action' \
                 (what they do, without repeating the leading 'I'), in their language, no jargon.",
                text,
                schema,
                app,
            )
            .await?;
        let mut r = serde_json::from_value::<Reformulation>(raw)
            .map_err(|e| format!("sortie invalide: {e}"))?;
        r.situation = strip_leading_word(&r.situation, &["when", "quand"]);
        r.action = strip_leading_word(&r.action, &["I", "je"]);
        Ok(r)
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
                "Propose at least three options for this decision, including one of the \
                 'what if none of these?' kind. Each option is ONE short sentence (max ~12 \
                 words), phrased as a path the person could take — not a paragraph of advice. \
                 Never impose anything, never say 'you should'. \
                 Answer in JSON { options: [...] }, in the language of the person.",
                context,
                schema,
                app,
            )
            .await?;
        serde_json::from_value::<OptionSuggestions>(raw)
            .map_err(|e| format!("sortie invalide: {e}"))
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
        let user =
            format!("Option being weighed: {option}\n\nWhat matters to the person:\n{intentions}");
        let raw = self
            .chat_json(
                "Say, in plain words, how this option FITS what matters to the person AND where \
                 it PULLS AGAINST. Always name both sides. Express your uncertainty. Never say \
                 'you should'. Answer in JSON { note: '...' }, in the person's language.",
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
                "Propose ONE next small step, self-contained, with its context: a short title \
                 starting with a plain action verb (not a gerund like 'Reflecting on…'), doable \
                 in under 15 minutes this week; why; when (a concrete trigger); and how we'll \
                 know it's done. Answer in JSON \
                 { title, why, when_cue, done_when }, in the person's language.",
                context,
                schema,
                app,
            )
            .await?;
        serde_json::from_value::<StorySuggestion>(raw).map_err(|e| format!("sortie invalide: {e}"))
    }

    /// Embed text locally for semantic recall (EmbeddingGemma on Ollama by
    /// default; /v1/embeddings on an OpenAI-compatible backend).
    pub async fn embed(&self, text: &str) -> Result<Vec<f32>, String> {
        let (url, body) = match self.kind {
            Ollama => (
                format!("{}/api/embed", self.base),
                json!({ "model": self.embed_model, "input": text }),
            ),
            OpenAi => (
                format!("{}/embeddings", self.base),
                json!({ "model": self.embed_model, "input": text }),
            ),
        };
        let resp = self
            .http
            .post(url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            return Err(format!("AI server responded {}", resp.status()));
        }
        let v: Value = resp.json().await.map_err(|e| e.to_string())?;
        let emb = match self.kind {
            Ollama => v["embeddings"][0]
                .as_array()
                .ok_or("empty embedding response")?
                .iter()
                .map(|x| x.as_f64().unwrap_or(0.0) as f32)
                .collect::<Vec<f32>>(),
            OpenAi => v["data"][0]["embedding"]
                .as_array()
                .ok_or("empty embedding response")?
                .iter()
                .map(|x| x.as_f64().unwrap_or(0.0) as f32)
                .collect::<Vec<f32>>(),
        };
        if emb.is_empty() {
            return Err("empty embedding".to_string());
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
                "If there is tension between what the person is weighing and their history, ask ONE \
                 gentle, open question — never a judgement, never 'you should'. If there is no \
                 tension, return an empty question. JSON { question }, in the person's language.",
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
                "Turn this step into ONE implementation intention. Give a concrete trigger 'cue' \
                 (if …) and ONE tiny 'action' (then …), plus, if useful, wish/outcome/obstacle. \
                 A single if-then, never a list. JSON \
                 { wish, outcome, obstacle, cue, action }, in the person's language.",
                context,
                schema,
                app,
            )
            .await?;
        serde_json::from_value::<WoopSuggestion>(raw).map_err(|e| format!("sortie invalide: {e}"))
    }
}

/// Parse a model's JSON answer and repair leaked unicode escapes.
///
/// Small local models sometimes double-escape non-ASCII inside their JSON
/// (`"\\u201c"`), which decodes to the literal text `\u201c` and would surface
/// raw escapes to the human. Decoding happens here, at the trust boundary,
/// before anything is validated or persisted (NFR4).
fn parse_model_json(content: &str) -> Result<Value, String> {
    let mut v: Value = serde_json::from_str(content.trim()).map_err(|e| e.to_string())?;
    decode_leaked_escapes(&mut v);
    Ok(v)
}

fn decode_leaked_escapes(v: &mut Value) {
    match v {
        Value::String(s) => {
            let d = decode_literal_unicode(s);
            if d != *s {
                *s = d;
            }
        }
        Value::Array(xs) => xs.iter_mut().for_each(decode_leaked_escapes),
        Value::Object(m) => m.values_mut().for_each(decode_leaked_escapes),
        _ => {}
    }
}

fn decode_literal_unicode(s: &str) -> String {
    if !s.contains("\\u") {
        return s.to_string();
    }
    let b = s.as_bytes();
    let mut out = String::with_capacity(s.len());
    let mut i = 0usize;
    while i < b.len() {
        if b[i] == b'\\' && i + 6 <= b.len() && b[i + 1] == b'u' {
            if let Some(cp) = parse_hex4(&b[i + 2..i + 6]) {
                let mut consumed = 6usize;
                let mut code = cp;
                if (0xD800..0xDC00).contains(&cp)
                    && i + 12 <= b.len()
                    && b[i + 6] == b'\\'
                    && b[i + 7] == b'u'
                {
                    if let Some(cp2) = parse_hex4(&b[i + 8..i + 12]) {
                        if (0xDC00..0xE000).contains(&cp2) {
                            code = 0x10000 + ((cp - 0xD800) << 10) + (cp2 - 0xDC00);
                            consumed = 12;
                        }
                    }
                }
                if let Some(c) = char::from_u32(code) {
                    out.push(c);
                    i += consumed;
                    continue;
                }
            }
        }
        let c = s[i..].chars().next().unwrap();
        out.push(c);
        i += c.len_utf8();
    }
    out
}

fn parse_hex4(b: &[u8]) -> Option<u32> {
    let mut v: u32 = 0;
    for &x in b {
        let d = match x {
            b'0'..=b'9' => x - b'0',
            b'a'..=b'f' => x - b'a' + 10,
            b'A'..=b'F' => x - b'A' + 10,
            _ => return None,
        };
        v = v * 16 + d as u32;
    }
    Some(v)
}

/// Drop a leading connective the UI template already supplies ("When {situation}",
/// "I {action}"). Only strips a whole word followed by a space, so "I'll" stays.
fn strip_leading_word(text: &str, words: &[&str]) -> String {
    let t = text.trim_start();
    for w in words {
        if t.len() > w.len() && t[..w.len()].eq_ignore_ascii_case(w) {
            let rest = &t[w.len()..];
            if rest.starts_with(' ') || rest.starts_with('\u{a0}') {
                return rest.trim_start().to_string();
            }
        }
    }
    text.to_string()
}

#[cfg(test)]
mod escape_tests {
    use super::*;

    #[test]
    fn decodes_leaked_escapes_in_strings() {
        assert_eq!(
            decode_literal_unicode("a \\u201cb\\u201d c"),
            "a \u{201c}b\u{201d} c"
        );
    }

    #[test]
    fn decodes_surrogate_pairs() {
        assert_eq!(decode_literal_unicode("\\ud83d\\udc4b"), "\u{1F44B}");
    }

    #[test]
    fn leaves_real_text_and_bad_escapes_alone() {
        assert_eq!(decode_literal_unicode("bonjour · ça"), "bonjour · ça");
        assert_eq!(decode_literal_unicode("a \\uZZZZ b"), "a \\uZZZZ b");
        assert_eq!(
            decode_literal_unicode("lone \\ud800 here"),
            "lone \\ud800 here"
        );
    }

    #[test]
    fn repairs_nested_values() {
        let mut v = json!({ "q": "\\u201cyes\\u201d", "xs": ["\\u00e9"] });
        decode_leaked_escapes(&mut v);
        assert_eq!(v["q"], "\u{201c}yes\u{201d}");
        assert_eq!(v["xs"][0], "\u{e9}");
    }

    #[test]
    fn strips_template_connectives_only_when_duplicated() {
        assert_eq!(
            strip_leading_word("when I get home", &["when", "quand"]),
            "I get home"
        );
        assert_eq!(
            strip_leading_word("When I get home", &["when", "quand"]),
            "I get home"
        );
        assert_eq!(
            strip_leading_word("quand je rentre", &["when", "quand"]),
            "je rentre"
        );
        assert_eq!(
            strip_leading_word("I start by calling", &["I", "je"]),
            "start by calling"
        );
        assert_eq!(
            strip_leading_word("je range mon t\u{e9}l\u{e9}phone", &["I", "je"]),
            "range mon t\u{e9}l\u{e9}phone"
        );
        assert_eq!(
            strip_leading_word("I'll call him", &["I", "je"]),
            "I'll call him"
        );
        assert_eq!(
            strip_leading_word("whenever I get home", &["when", "quand"]),
            "whenever I get home"
        );
    }
}

/// Live end-to-end verification against a running Ollama. Ignored by default so
/// CI (no model) stays green; run explicitly with a local server up:
///   `cargo test --lib ai::ollama::live -- --ignored --nocapture`
///
/// It exercises the whole AI path the app uses — bounded reqwest client, JSON
/// Schema constraint, and typed-deserialization validation (NFR4) — against the
/// real model, and asserts every structured call returns a valid, non-empty
/// result. A schema or timeout regression fails here, not silently in the UI.
#[cfg(test)]
mod live_tests {
    use super::Ai;

    fn ai() -> Ai {
        Ai::from_env()
    }

    #[tokio::test]
    #[ignore = "requires a running Ollama with LIFEOS_MODEL pulled"]
    async fn live_structured_calls_are_schema_valid() {
        let ai = ai();

        let health = ai.health().await;
        assert!(health.ok, "Ollama injoignable: {}", health.detail);

        let d = ai
            .generate_delta("Je veux arrêter de scroller le soir.")
            .await;
        let d = d.expect("generate_delta failed");
        assert!(
            matches!(d.op.as_str(), "added" | "modified" | "removed"),
            "delta op out of enum: {}",
            d.op
        );

        let r = ai
            .reformulate_intention("je voudrais faire plus de sport", None)
            .await;
        let r = r.expect("reformulate_intention failed");
        assert!(!r.situation.trim().is_empty(), "empty situation");
        assert!(!r.action.trim().is_empty(), "empty action");

        let o = ai
            .suggest_options("Est-ce que je change de job cette année ?", None)
            .await;
        let o = o.expect("suggest_options failed");
        assert!(
            o.options.len() >= 2,
            "expected >=2 options, got {}",
            o.options.len()
        );

        let a = ai
            .align_values(
                "Tout plaquer pour un tour du monde",
                "Famille · Santé · Argent",
                None,
            )
            .await;
        let a = a.expect("align_values failed");
        assert!(!a.note.trim().is_empty(), "empty alignment note");

        let s = ai
            .generate_story("Passer plus de temps avec mes proches", None)
            .await;
        let s = s.expect("generate_story failed");
        assert!(!s.title.trim().is_empty(), "empty story title");

        let w = ai
            .generate_woop("Rappeler mes parents chaque semaine", None)
            .await;
        let w = w.expect("generate_woop failed");
        assert!(!w.cue.trim().is_empty(), "empty woop cue");
        assert!(!w.action.trim().is_empty(), "empty woop action");

        let e = ai.embed("une phrase à embarquer").await;
        let e = e.expect("embed failed");
        assert!(!e.is_empty(), "empty embedding");
    }
}
