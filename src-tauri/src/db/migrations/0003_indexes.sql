-- Life OS — performance indexes (0003). Additive, forward-only, idempotent.
-- Covers the hot list/lookup paths that previously full-scanned:
--   stories.status        → list_open_stories (WHERE status = 'open')
--   decisions.created_at  → carnet + proposed decisions (ORDER BY created_at DESC)
--   events.type           → debugging / stats by event type
-- and the child keys SQLite scans when a parent row is deleted or merged:
--   captures.decision_id, captures.intention_id, if_then_plans.story_id.

CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_decisions_created ON decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_captures_decision ON captures(decision_id);
CREATE INDEX IF NOT EXISTS idx_captures_intention ON captures(intention_id);
CREATE INDEX IF NOT EXISTS idx_if_then_story ON if_then_plans(story_id);
