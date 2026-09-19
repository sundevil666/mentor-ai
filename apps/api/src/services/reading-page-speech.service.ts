import { getPostgresPool } from '../repositories/postgres-client.js';
import type { AuthenticatedUser } from './auth.service.js';

type MissedWord = { index: number; word: string };
export type ReadingPageSpeechUpload = {
  bookId: string;
  summary: { pageIndex: number; totalWords: number; correctWords: number; missedWords: MissedWord[] };
};

let tableReady: Promise<void> | null = null;

export function sanitizeReadingPageSpeech(value: unknown): ReadingPageSpeechUpload | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ReadingPageSpeechUpload>;
  const summary = candidate.summary;
  if (typeof candidate.bookId !== 'string' || !candidate.bookId.trim() || candidate.bookId.length > 160 ||
    !summary || !Number.isInteger(summary.pageIndex) || summary.pageIndex < 0 ||
    !Number.isInteger(summary.totalWords) || summary.totalWords < 0 || summary.totalWords > 2_000 ||
    !Number.isInteger(summary.correctWords) || summary.correctWords < 0 || summary.correctWords > summary.totalWords ||
    !Array.isArray(summary.missedWords) || summary.missedWords.length !== summary.totalWords - summary.correctWords) return null;
  const missedWords: MissedWord[] = [];
  const seen = new Set<number>();
  for (const word of summary.missedWords) {
    if (!word || !Number.isInteger(word.index) || word.index < 0 ||
      typeof word.word !== 'string' || !word.word.trim() || word.word.length > 120 || seen.has(word.index)) return null;
    seen.add(word.index);
    missedWords.push({ index: word.index, word: word.word });
  }
  return { bookId: candidate.bookId, summary: {
    pageIndex: summary.pageIndex, totalWords: summary.totalWords,
    correctWords: summary.correctWords, missedWords,
  } };
}

export async function storeReadingPageSpeech(values: unknown, user: AuthenticatedUser): Promise<ReadingPageSpeechUpload[]> {
  if (!Array.isArray(values) || values.length > 50) throw new Error('Invalid reading page batch.');
  const pages = values.map(sanitizeReadingPageSpeech);
  if (pages.some((page) => !page)) throw new Error('Invalid reading page summary.');
  const safe = pages as ReadingPageSpeechUpload[];
  if (!safe.length) return [];
  const pool = getPostgresPool();
  if (!pool) throw new Error('Reading page storage is unavailable.');
  tableReady ??= pool.query(`
    CREATE TABLE IF NOT EXISTS reading_page_speech (
      student_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      page_index INTEGER NOT NULL,
      total_words INTEGER NOT NULL,
      correct_words INTEGER NOT NULL,
      missed_words JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (student_id, book_id, page_index)
    )
  `).then(() => undefined).catch((error: unknown) => {
    tableReady = null;
    throw error;
  });
  await tableReady;
  await pool.query(`
    INSERT INTO reading_page_speech
      (student_id, book_id, page_index, total_words, correct_words, missed_words)
    SELECT $1::text, item.book_id, item.page_index, item.total_words, item.correct_words, item.missed_words
    FROM jsonb_to_recordset($2::jsonb) AS item(
      book_id text, page_index integer, total_words integer, correct_words integer, missed_words jsonb
    )
    ON CONFLICT (student_id, book_id, page_index) DO UPDATE SET
      total_words = EXCLUDED.total_words,
      correct_words = EXCLUDED.correct_words,
      missed_words = EXCLUDED.missed_words,
      updated_at = now()
  `, [user.id, JSON.stringify(safe.map((page) => ({
    book_id: page.bookId,
    page_index: page.summary.pageIndex,
    total_words: page.summary.totalWords,
    correct_words: page.summary.correctWords,
    missed_words: page.summary.missedWords,
  })))]);
  return safe;
}
