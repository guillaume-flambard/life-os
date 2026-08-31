# Change: add-memory

## Why

The wedge of Life OS is the memory of your decisions and their aftermath — the one
thing nothing else gives you. With the compass, decisions, and the review in
place, this change makes the system *remember*: it stores decisions and intentions
locally and recalls the relevant ones during a new conversation (keyword +
semantic, weighted by recency, FR9). And it surfaces tension between what you're
about to decide and your own history — always as a gentle question, never a
judgment (FR10). This is Epic 6.

## What changes

- **memory** — a new capability:
  - Index: when an intention is created or a decision is finalized, a local memory
    chunk is written (keyword-searchable immediately via FTS5; embeddings filled in
    lazily via a local embedding model).
  - Recall: a hybrid search (FTS5 BM25 ∪ sqlite-vec KNN) fused and recency-aware,
    returning the most relevant past items for a query.
  - Contradiction: given what the user is weighing, recall related history and, if
    there is tension, phrase exactly one gentle question ("you told me X once —
    does this still fit?"), never a verdict, never "you should".

## Impact

- New capability: `memory`.
- New code: `repo/memory.rs` (write chunk, keyword search, vector search, fusion,
  embedding backfill), an Ollama embedding + contradiction path, memory Tauri
  commands, and light surfacing in the decision flow (a "this reminds me…" panel
  and an optional gentle question) plus a "re-index memory" action in settings.
- No migration — `memory_chunks`, `memory_fts`, `memory_vec` already exist from
  add-foundations. Semantic recall needs a local embedding model
  (`embeddinggemma`, 768-dim); without it, keyword recall still works (graceful
  degradation, NFR3). Everything stays on-device.
