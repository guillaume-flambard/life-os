# Tasks: add-memory

## 1. Backend — index & store
- [x] 1.1 `MemoryHit` type; `repo/memory.rs`: `write_chunk` (one chunk per source, upsert)
- [x] 1.2 Call `write_chunk` when an intention is created and when a decision is finalized
- [x] 1.3 `chunks_without_vec`, `insert_vec` (sqlite-vec upsert)

## 2. Backend — recall
- [x] 2.1 `keyword_search` (FTS5 BM25, query sanitized), `semantic_search` (vec KNN)
- [x] 2.2 Reciprocal-rank fusion + recency tiebreak → `MemoryHit[]`
- [x] 2.3 Guard never held across await (sync read → await embed → sync search)

## 3. Backend — embeddings & contradiction
- [x] 3.1 `Ollama::embed(text)` (embeddinggemma, 768-dim)
- [x] 3.2 `Ollama::contradiction_question(text, related)` → one gentle question or none (NFR17)
- [x] 3.3 Commands: `memory_recall`, `memory_backfill`, `contradiction_check`; register

## 4. Front
- [x] 4.1 Decision flow: on open, fetch recall + contradiction for the title
- [x] 4.2 Show a "ça me rappelle…" panel and, if present, one gentle question (invitation, not gate)
- [x] 4.3 Settings: "re-index memory" action (runs backfill; reminds to pull the embed model)

## 5. Verification
- [x] 5.1 Creating an intention / finalizing a decision writes a memory chunk; keyword recall finds it   — cargo test
- [x] 5.2 Vector KNN returns the nearest chunk for a query embedding   — cargo test (hand-made vectors)
- [x] 5.3 Fusion returns an item found by either search; recency breaks ties   — cargo test
- [x] 5.4 Contradiction returns nothing when there is no related history   — cargo test
- [x] 5.5 Live: recall + a gentle question appear in the decision flow (needs `embeddinggemma`)   — verified on-screen: a decision worded with no keyword overlap recalled the related intention (semantic) and raised a gentle question
