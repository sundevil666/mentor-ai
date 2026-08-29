import type { ReadingPage } from '@mentor-ai/shared';

export const dailyReadingGoalWords = 2_500;

export interface DailyBookReadingProgress {
  baselineWordPosition: number;
  furthestWordPosition: number;
}

export interface DailyReadingProgress {
  date: string;
  books: Record<string, DailyBookReadingProgress>;
}

export function localReadingDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function countReadingWords(pages: Pick<ReadingPage, 'text'>[]): number {
  return pages.reduce((total, page) => total + (page.text.match(/[\p{L}]+(?:[-'’][\p{L}]+)*/gu)?.length ?? 0), 0);
}

export function createDailyReadingProgress(date = localReadingDate()): DailyReadingProgress {
  return { date, books: {} };
}

export function recordDailyReadingPosition(
  progress: DailyReadingProgress,
  bookId: string,
  wordPosition: number,
): DailyReadingProgress {
  const position = Math.max(0, Math.round(wordPosition));
  const previous = progress.books[bookId];
  return {
    ...progress,
    books: {
      ...progress.books,
      [bookId]: previous
        ? { ...previous, furthestWordPosition: Math.max(previous.furthestWordPosition, position) }
        : { baselineWordPosition: position, furthestWordPosition: position },
    },
  };
}

export function dailyWordsRead(progress: DailyReadingProgress): number {
  return Object.values(progress.books).reduce(
    (total, book) => total + Math.max(0, book.furthestWordPosition - book.baselineWordPosition),
    0,
  );
}

export function readingGoalMessage(wordsRead: number, goalWords = dailyReadingGoalWords): string {
  if (wordsRead >= goalWords * 1.5) return 'Amazing — well beyond today’s goal';
  if (wordsRead >= goalWords) return 'Daily goal complete';
  if (wordsRead >= goalWords * 0.75) return 'Almost there — keep going';
  if (wordsRead > 0) return 'A little progress still counts';
  return 'Your gentle 30-minute reading goal';
}
