CREATE TABLE IF NOT EXISTS personal_reading_books (
  student_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  archive JSONB NOT NULL,
  book_updated_at TIMESTAMPTZ NOT NULL,
  stored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, book_id)
);

CREATE INDEX IF NOT EXISTS personal_reading_books_student_updated_idx
  ON personal_reading_books (student_id, book_updated_at DESC);

COMMENT ON TABLE personal_reading_books IS
  'Private parsed EPUB/TXT books synchronized across devices for one authenticated student.';
