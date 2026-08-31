-- Life OS — initial schema (0001_init)
-- Conventions: id = UUIDv4 (TEXT); timestamps ISO-8601 UTC (TEXT);
-- soft-delete via deleted_at; events append-only; forward-only migrations.

PRAGMA foreign_keys = ON;

-- 1. Life area (domain)
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- 2. Intention (= Value/commitment = Requirement + GWT scenario + priority)
CREATE TABLE IF NOT EXISTS intentions (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id),
  statement TEXT NOT NULL,
  situation TEXT,
  action TEXT,
  priority TEXT NOT NULL DEFAULT 'should' CHECK (priority IN ('must','should','may')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- 3. Decision (change proposal) — central object
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  proposal TEXT,
  strategy TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','exploring','proposed','applied','archived')),
  confidence INTEGER,
  values_alignment_note TEXT,
  distance_10_10_10 TEXT,
  review_at TEXT,
  emotional_context TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- 3b. Explored options (>=3 incl. the "what if none?" option, pre-mortem)
CREATE TABLE IF NOT EXISTS decision_options (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id),
  label TEXT NOT NULL,
  is_null_option INTEGER NOT NULL DEFAULT 0,
  premortem TEXT,
  chosen INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- 4. Delta (ADDED/MODIFIED/REMOVED) — what the decision changes in the compass
CREATE TABLE IF NOT EXISTS deltas (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id),
  op TEXT NOT NULL CHECK (op IN ('added','modified','removed')),
  target_intention_id TEXT REFERENCES intentions(id),
  domain_id TEXT REFERENCES domains(id),
  payload_statement TEXT,
  payload_situation TEXT,
  payload_action TEXT,
  payload_priority TEXT CHECK (payload_priority IN ('must','should','may')),
  applied_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- 5. Story (next self-contained small step)
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  decision_id TEXT REFERENCES decisions(id),
  title TEXT NOT NULL,
  why TEXT,
  when_cue TEXT,
  done_when TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','dropped')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- 6. IfThenPlan (WOOP / implementation intention)
CREATE TABLE IF NOT EXISTS if_then_plans (
  id TEXT PRIMARY KEY,
  story_id TEXT REFERENCES stories(id),
  decision_id TEXT REFERENCES decisions(id),
  wish TEXT,
  outcome TEXT,
  obstacle TEXT,
  cue TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- 7. Review (the check-in / compassionate QA)
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  period_start TEXT,
  period_end TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- 7b. Review items: replays each intention/decision
CREATE TABLE IF NOT EXISTS review_items (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id),
  intention_id TEXT REFERENCES intentions(id),
  decision_id TEXT REFERENCES decisions(id),
  outcome TEXT CHECK (outcome IN ('better','as_expected','worse','too_early')),
  learning TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- 8. MemoryChunk (hybrid recall: FTS5 + vec)
CREATE TABLE IF NOT EXISTS memory_chunks (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts
  USING fts5(content, content='memory_chunks', content_rowid='rowid');

-- Keep the FTS index in sync with the content table.
CREATE TRIGGER IF NOT EXISTS memory_ai AFTER INSERT ON memory_chunks BEGIN
  INSERT INTO memory_fts(rowid, content) VALUES (new.rowid, new.content);
END;
CREATE TRIGGER IF NOT EXISTS memory_ad AFTER DELETE ON memory_chunks BEGIN
  INSERT INTO memory_fts(memory_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
END;
CREATE TRIGGER IF NOT EXISTS memory_au AFTER UPDATE ON memory_chunks BEGIN
  INSERT INTO memory_fts(memory_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
  INSERT INTO memory_fts(rowid, content) VALUES (new.rowid, new.content);
END;

-- sqlite-vec: local embeddings (768-dim, EmbeddingGemma). Requires the vec0
-- extension, registered as an auto-extension before this migration runs.
CREATE VIRTUAL TABLE IF NOT EXISTS memory_vec
  USING vec0(chunk_id TEXT PRIMARY KEY, embedding FLOAT[768]);

-- 9. Events (append-only; never UPDATE/DELETE)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload TEXT
);

-- 10. Settings (human/expert mode, caps, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_intentions_domain ON intentions(domain_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_options_decision ON decision_options(decision_id);
CREATE INDEX IF NOT EXISTS idx_deltas_decision ON deltas(decision_id);
CREATE INDEX IF NOT EXISTS idx_stories_decision ON stories(decision_id);
CREATE INDEX IF NOT EXISTS idx_review_items_review ON review_items(review_id);
CREATE INDEX IF NOT EXISTS idx_memory_source ON memory_chunks(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity_type, entity_id);
