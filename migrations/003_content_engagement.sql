ALTER TABLE private_learning_state
  ADD COLUMN IF NOT EXISTS content_engagement_events JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN private_learning_state.content_engagement_events IS
  'Append-only starts, finishes, full plays, and learner feedback used by mentor analysis.';
