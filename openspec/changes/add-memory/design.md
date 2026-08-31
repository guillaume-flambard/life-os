# Design: add-memory

## Write is synchronous; embedding is lazy
When an intention is created or a decision is finalized, the repo writes one memory
chunk synchronously (content + FTS index via the existing trigger). No network call
happens on the write path, so mutations stay fast and offline-safe. The vector
embedding is filled in later by an async `memory_backfill` that embeds every chunk
missing a vector. This cleanly separates the async model call from the sync DB
write, and keyword recall works the instant a chunk is written.

One chunk per source (`source_type` + `source_id`): writing again updates the same
chunk rather than duplicating, so recall never returns the same item twice.

## Hybrid recall = FTS ∪ vec, fused by reciprocal rank
Recall runs two independent searches and fuses them:
- keyword: FTS5 BM25 over `memory_fts` (query terms OR-joined and quoted to avoid
  FTS operator injection).
- semantic: sqlite-vec KNN over `memory_vec` (`embedding MATCH ? AND k = ?`), on the
  query's embedding.

The two ranked id-lists are merged with reciprocal-rank fusion (scale-free, no
score normalization), with a small recency bonus so recent items surface. If no
embedding model is available, the semantic list is empty and recall degrades to
keyword-only — still useful, still offline.

The Mutex-guarded connection is never held across an `await`: commands do the sync
DB reads, release the guard, `await` the embedding, then re-lock for the sync
search and fetch.

## Contradiction is a question, never a verdict (FR10, NFR17)
`contradiction_check(text)` recalls related past decisions/intentions; if there are
none, it returns nothing. Otherwise it asks the local model for exactly one gentle
question, with a prompt that forbids judgment and "you should" and allows an empty
answer (no tension → no question). The engine only relays the question; it never
generates an assertion about the user. If the model is unavailable, it returns
nothing rather than blocking the flow.

## Surfacing
In the decision flow, entering a session fetches recall + a contradiction question
for the decision's title and shows a soft "ça me rappelle…" panel and, if present,
the single question — as an invitation, not a gate. Settings gets a "re-index
memory" action that runs the backfill (and reminds the user to
`ollama pull embeddinggemma`).

## Out of scope
Profile-by-extraction of recurring patterns (FR12) and any automatic
cadence/notifications. Re-embedding on every edit (we backfill on demand). No
migration.
