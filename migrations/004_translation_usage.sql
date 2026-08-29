CREATE TABLE IF NOT EXISTS translation_usage (
  period TEXT PRIMARY KEY,
  used_characters INTEGER NOT NULL DEFAULT 0 CHECK (used_characters >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE translation_usage IS
  'Monthly Google Cloud Translation character usage enforced below the free tier.';
