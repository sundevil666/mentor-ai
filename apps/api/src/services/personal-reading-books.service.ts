import type { PersonalReadingBookArchive } from '@mentor-ai/shared';
import { getPostgresPool } from '../repositories/postgres-client.js';
import type { AuthenticatedUser } from './auth.service.js';

const maxBooksPerAccount = 50;
const maxBookTextCharacters = 30 * 1024 * 1024;

export async function synchronizePersonalReadingBooks(
  incoming: PersonalReadingBookArchive[],
  user: AuthenticatedUser,
): Promise<PersonalReadingBookArchive[]> {
  const pool = getPostgresPool();
  if (!pool) throw new Error('Book synchronization is unavailable because DATABASE_URL is not configured.');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS personal_reading_books (
      student_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      archive JSONB NOT NULL,
      book_updated_at TIMESTAMPTZ NOT NULL,
      stored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (student_id, book_id)
    )
  `);

  for (const candidate of incoming.slice(0, maxBooksPerAccount)) {
    const archive = sanitizePersonalReadingBookArchive(candidate);
    if (!archive) continue;
    await pool.query(
      `INSERT INTO personal_reading_books (student_id, book_id, archive, book_updated_at, stored_at)
       VALUES ($1, $2, $3::jsonb, $4, now())
       ON CONFLICT (student_id, book_id) DO UPDATE SET
         archive = EXCLUDED.archive,
         book_updated_at = EXCLUDED.book_updated_at,
         stored_at = now()
       WHERE personal_reading_books.book_updated_at <= EXCLUDED.book_updated_at`,
      [user.id, archive.book.id, JSON.stringify(archive), archive.book.updatedAt],
    );
  }

  const result = await pool.query<{ archive: PersonalReadingBookArchive }>(
    `SELECT archive
     FROM personal_reading_books
     WHERE student_id = $1
     ORDER BY book_updated_at DESC
     LIMIT $2`,
    [user.id, maxBooksPerAccount],
  );
  return result.rows.map((row) => row.archive);
}

export function sanitizePersonalReadingBookArchive(
  archive: PersonalReadingBookArchive,
): PersonalReadingBookArchive | undefined {
  if (!archive?.book?.id || !archive.source?.id || !Array.isArray(archive.chapters) || !Array.isArray(archive.pages)) return undefined;
  const book = archive.book;
  if (
    (book.format !== 'epub' && book.format !== 'txt') ||
    book.rightsConfirmed !== true ||
    book.language !== 'en' ||
    !Number.isFinite(Date.parse(book.importedAt)) ||
    !Number.isFinite(Date.parse(book.updatedAt)) ||
    archive.pages.length > 10_000 ||
    archive.chapters.length > 10_000
  ) return undefined;
  const pages = archive.pages.filter((page) => page.bookId === book.id && typeof page.text === 'string');
  const chapters = archive.chapters.filter((chapter) => chapter.bookId === book.id);
  const textSize = pages.reduce((sum, page) => sum + page.text.length, 0);
  if (
    pages.length !== archive.pages.length ||
    chapters.length !== archive.chapters.length ||
    textSize > maxBookTextCharacters
  ) return undefined;
  return JSON.parse(JSON.stringify({ source: archive.source, book, chapters, pages })) as PersonalReadingBookArchive;
}
