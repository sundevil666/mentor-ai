CREATE TABLE IF NOT EXISTS private_lessons (
  id TEXT PRIMARY KEY,
  lesson JSONB NOT NULL,
  concept TEXT,
  concept_level TEXT,
  activity_type TEXT,
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS private_lessons_active_concept_idx
  ON private_lessons (is_active, concept);

CREATE INDEX IF NOT EXISTS private_lessons_updated_at_idx
  ON private_lessons (updated_at);

COMMENT ON TABLE private_lessons IS
  'Private Mentor AI lesson library. Lesson content is stored outside Git.';
