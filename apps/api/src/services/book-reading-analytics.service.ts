import type { BookReadingAnalytics, BookReadingAnalyticsReceipt } from '@mentor-ai/shared';
import { getPostgresPool } from '../repositories/postgres-client.js';
import type { AuthenticatedUser } from './auth.service.js';

const countFields = ['readWords', 'wordLookups', 'passageLookups', 'pronunciationRequests', 'speechPageWords', 'speechMatchedWords'] as const;
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 1_000_000_000;
const text = (value: unknown, limit: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
const date = (value: unknown): value is string => typeof value === 'string' && value.length <= 30 && Number.isFinite(Date.parse(value));

export function sanitizeBookReadingAnalytics(value: unknown): BookReadingAnalytics | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as BookReadingAnalytics;
  if (input.version !== 1 || !text(input.bookId, 160) || !text(input.deviceId, 160)
    || !count(input.revision) || input.revision === 0 || !date(input.startedAt) || !date(input.updatedAt)
    || Date.parse(input.updatedAt) < Date.parse(input.startedAt)
    || !countFields.every((key) => count(input[key])) || input.speechMatchedWords > input.speechPageWords
    || input.speechMatchedWords > input.readWords || typeof input.examplesTruncated !== 'boolean'
    || !Array.isArray(input.words) || input.words.length > 100
    || !Array.isArray(input.passages) || input.passages.length > 20
    || !Array.isArray(input.unmatchedSpeechWords) || input.unmatchedSpeechWords.length > 100) return null;
  if (input.words.some((word) => !word || !text(word.text, 80) || !count(word.translations) || !count(word.pronunciations) || (word.context !== undefined && !text(word.context, 200)))
    || input.passages.some((passage) => !passage || !text(passage.text, 200) || !count(passage.count))
    || input.unmatchedSpeechWords.some((word) => !text(word, 80))) return null;
  if (new Set(input.words.map((word) => word.text)).size !== input.words.length
    || new Set(input.passages.map((passage) => passage.text)).size !== input.passages.length
    || new Set(input.unmatchedSpeechWords).size !== input.unmatchedSpeechWords.length
    || input.words.reduce((sum, word) => sum + word.translations, 0) > input.wordLookups
    || input.words.reduce((sum, word) => sum + word.pronunciations, 0) > input.pronunciationRequests
    || input.passages.reduce((sum, passage) => sum + passage.count, 0) > input.passageLookups) return null;
  // Explicit projection: never store arbitrary client fields or full local ranges.
  return {
    version: 1, bookId: input.bookId, deviceId: input.deviceId, revision: input.revision,
    startedAt: input.startedAt, updatedAt: input.updatedAt,
    readWords: input.readWords, wordLookups: input.wordLookups, passageLookups: input.passageLookups,
    pronunciationRequests: input.pronunciationRequests, speechPageWords: input.speechPageWords,
    speechMatchedWords: input.speechMatchedWords, examplesTruncated: input.examplesTruncated,
    words: input.words.map(({ text, translations, pronunciations, context }) => ({ text, translations, pronunciations, ...(context ? { context } : {}) })),
    passages: input.passages.map(({ text, count }) => ({ text, count })),
    unmatchedSpeechWords: [...input.unmatchedSpeechWords],
  };
}

type Database = { query: (sql: string, values?: unknown[]) => Promise<{ rows: Array<{ book_id: string; device_id: string; revision: string | number }> }> };
let tableReady: Promise<unknown> | null = null;

export async function storeBookReadingAnalytics(
  values: unknown, user: AuthenticatedUser, database: Database | null = getPostgresPool(),
): Promise<BookReadingAnalyticsReceipt[]> {
  if (!Array.isArray(values) || values.length > 10 || Buffer.byteLength(JSON.stringify({ books: values })) > 64_000) {
    throw new RangeError('Invalid book analytics batch.');
  }
  const books = values.map(sanitizeBookReadingAnalytics);
  if (books.some((book) => !book)) throw new RangeError('Invalid book analytics.');
  const safe = books as BookReadingAnalytics[];
  if (new Set(safe.map((book) => JSON.stringify([book.deviceId, book.bookId]))).size !== safe.length) {
    throw new RangeError('Duplicate book analytics.');
  }
  if (!safe.length) return [];
  if (!database) throw new Error('Book analytics storage is unavailable.');
  tableReady ??= database.query(`
    CREATE TABLE IF NOT EXISTS book_reading_analytics (
      student_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      revision BIGINT NOT NULL,
      evidence JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (student_id, device_id, book_id)
    )
  `).catch((error: unknown) => { tableReady = null; throw error; });
  await tableReady;
  const result = await database.query(`
    WITH incoming AS (
      SELECT $1::text AS student_id, item.device_id, item.book_id, item.revision, item.evidence
      FROM jsonb_to_recordset($2::jsonb) AS item(device_id text, book_id text, revision bigint, evidence jsonb)
    ), saved AS (
      INSERT INTO book_reading_analytics (student_id, device_id, book_id, revision, evidence)
      SELECT student_id, device_id, book_id, revision, evidence FROM incoming
      ON CONFLICT (student_id, device_id, book_id) DO UPDATE SET
        revision = EXCLUDED.revision, evidence = EXCLUDED.evidence, updated_at = now()
      WHERE book_reading_analytics.revision < EXCLUDED.revision
      RETURNING book_id, device_id, revision
    )
    SELECT book_id, device_id, revision FROM saved
    UNION ALL
    SELECT i.book_id, i.device_id, i.revision FROM incoming i
    JOIN book_reading_analytics b ON b.student_id = i.student_id AND b.device_id = i.device_id AND b.book_id = i.book_id
    WHERE b.revision >= i.revision AND NOT EXISTS (
      SELECT 1 FROM saved s WHERE s.book_id = i.book_id AND s.device_id = i.device_id
    )
  `, [user.id, JSON.stringify(safe.map((book) => ({ device_id: book.deviceId, book_id: book.bookId, revision: book.revision, evidence: book })))]);
  return result.rows.map((row) => ({ bookId: row.book_id, deviceId: row.device_id, revision: Number(row.revision) }));
}
