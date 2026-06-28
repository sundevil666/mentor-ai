CREATE TABLE IF NOT EXISTS private_learning_state (
  student_id TEXT PRIMARY KEY,
  student JSONB NOT NULL,
  student_model JSONB NOT NULL,
  current_lesson JSONB,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  accepted_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  exercise_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  speech_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  statistics_snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  observations JSONB NOT NULL DEFAULT '[]'::jsonb,
  teacher_journal JSONB NOT NULL DEFAULT '[]'::jsonb,
  teacher_memory JSONB NOT NULL DEFAULT '[]'::jsonb,
  acknowledgements JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS private_learning_state_updated_at_idx
  ON private_learning_state (updated_at);

COMMENT ON TABLE private_learning_state IS
  'Private Mentor AI learning state. Never export real rows through Git.';
