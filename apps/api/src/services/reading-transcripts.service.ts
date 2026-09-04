import type { ReadingTranscriptChunk } from '@mentor-ai/shared';
import { getPostgresPool } from '../repositories/postgres-client.js';
import type { AuthenticatedUser } from './auth.service.js';

export async function storeReadingTranscript(
  candidate: ReadingTranscriptChunk,
  user: AuthenticatedUser,
): Promise<ReadingTranscriptChunk> {
  const pool = getPostgresPool();
  if (!pool) throw new Error('Reading transcript storage is unavailable because DATABASE_URL is not configured.');
  const safe = sanitizeReadingTranscript(candidate, user.id);
  if (!safe) throw new Error('Invalid reading transcript.');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reading_transcript_chunks (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      page_index INTEGER NOT NULL,
      transcript_text TEXT NOT NULL,
      recognition_engine TEXT NOT NULL,
      captured_at TIMESTAMPTZ NOT NULL,
      stored_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(
    `INSERT INTO reading_transcript_chunks
      (id, student_id, book_id, page_index, transcript_text, recognition_engine, captured_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    [safe.id, safe.studentId, safe.bookId, safe.pageIndex, safe.text, safe.recognitionEngine, safe.capturedAt],
  );
  return safe;
}

export function sanitizeReadingTranscript(
  item: ReadingTranscriptChunk,
  studentId: string,
): ReadingTranscriptChunk | undefined {
  const text = typeof item.text === 'string' ? item.text.replace(/\s+/g, ' ').trim().slice(0, 2_000) : '';
  if (
    item.studentId !== studentId || !item.id || !item.bookId || !text ||
    !Number.isInteger(item.pageIndex) || item.pageIndex < 0 ||
    !Number.isFinite(Date.parse(item.capturedAt)) ||
    (item.recognitionEngine !== 'device-whisper' && item.recognitionEngine !== 'browser')
  ) return undefined;
  return {
    id: item.id.slice(0, 180), studentId, bookId: item.bookId.slice(0, 160),
    pageIndex: item.pageIndex, text, capturedAt: item.capturedAt, recognitionEngine: item.recognitionEngine,
  };
}
