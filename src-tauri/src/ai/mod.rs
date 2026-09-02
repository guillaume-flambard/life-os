//! Local AI layer. BMAD roles will land here as sequential-lens prompts under
//! `prompts/` in a later change; foundations only wires the client.

pub mod ollama;

pub use ollama::Ai;
