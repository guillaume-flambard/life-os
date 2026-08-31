-- Life OS — daily captures (0002). A lightweight local inbox: one freeform jot
-- per row, optionally linked to a decision or intention. Forward-only, additive.

CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'note' CHECK (kind IN ('note','reflection')),
  decision_id TEXT REFERENCES decisions(id),
  intention_id TEXT REFERENCES intentions(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_captures_created ON captures(created_at);
