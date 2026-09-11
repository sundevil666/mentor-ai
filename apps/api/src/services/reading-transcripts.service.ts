import type { ReadingTranscriptChunk } from '@mentor-ai/shared';
import { getPostgresPool } from '../repositories/postgres-client.js';
import type { AuthenticatedUser } from './auth.service.js';

let transcriptTableReady: Promise<void> | null = null;

export async function storeReadingTranscripts(
  candidates: ReadingTranscriptChunk[],
  user: AuthenticatedUser,
): Promise<ReadingTranscriptChunk[]> {
  const pool = getPostgresPool();
  if (!pool) throw new Error('Reading transcript storage is unavailable because DATABASE_URL is not configured.');
  const safe = candidates.slice(0, 100).map((candidate) => sanitizeReadingTranscript(candidate, user.id));
  if (safe.some((chunk) => !chunk)) throw new Error('Invalid reading transcript.');
  const chunks = safe as ReadingTranscriptChunk[];
  if (chunks.length === 0) return [];
  transcriptTableReady ??= pool.query(`
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
  `).then(() => undefined).catch((error: unknown) => {
    transcriptTableReady = null;
    throw error;
  });
  await transcriptTableReady;
  await pool.query(`
    INSERT INTO reading_transcript_chunks
      (id, student_id, book_id, page_index, transcript_text, recognition_engine, captured_at)
    SELECT * FROM UNNEST(
      $1::text[], $2::text[], $3::text[], $4::integer[], $5::text[], $6::text[], $7::timestamptz[]
    )
    ON CONFLICT (id) DO NOTHING
  `, [
    chunks.map((chunk) => chunk.id),
    chunks.map((chunk) => chunk.studentId),
    chunks.map((chunk) => chunk.bookId),
    chunks.map((chunk) => chunk.pageIndex),
    chunks.map((chunk) => chunk.text),
    chunks.map((chunk) => chunk.recognitionEngine),
    chunks.map((chunk) => chunk.capturedAt),
  ]);
  return chunks;
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
    (item.recognitionEngine !== 'device-whisper' && item.recognitionEngine !== 'browser' && item.recognitionEngine !== 'sherpa-onnx')
  ) return undefined;
  return {
    id: item.id.slice(0, 180), studentId, bookId: item.bookId.slice(0, 160),
    pageIndex: item.pageIndex, text, capturedAt: item.capturedAt, recognitionEngine: item.recognitionEngine,
  };
}
