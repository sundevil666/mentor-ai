export const dailyReadingGoalWords = 2_500;

export interface DailyBookReadingProgress {
  spokenWordIndexes: number[];
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

export function createDailyReadingProgress(date = localReadingDate()): DailyReadingProgress {
  return { date, books: {} };
}

export function recordDailySpokenWords(
  progress: DailyReadingProgress,
  bookId: string,
  wordIndexes: readonly number[],
): DailyReadingProgress {
  const previous = progress.books[bookId];
  const uniqueIndexes = new Set(previous?.spokenWordIndexes ?? []);
  wordIndexes.forEach((wordIndex) => {
    if (Number.isInteger(wordIndex) && wordIndex >= 0) uniqueIndexes.add(wordIndex);
  });
  return {
    ...progress,
    books: {
      ...progress.books,
      [bookId]: { spokenWordIndexes: Array.from(uniqueIndexes).sort((left, right) => left - right) },
    },
  };
}

export function dailyWordsRead(progress: DailyReadingProgress): number {
  return Object.values(progress.books).reduce(
    (total, book) => total + new Set(book.spokenWordIndexes ?? []).size,
    0,
  );
}

export function spokenWordsForBook(progress: DailyReadingProgress, bookId: string): number[] {
  return [...new Set(progress.books[bookId]?.spokenWordIndexes ?? [])].filter((wordIndex) => Number.isInteger(wordIndex) && wordIndex >= 0);
}

export function readingGoalMessage(wordsRead: number, goalWords = dailyReadingGoalWords): string {
  if (wordsRead >= goalWords * 1.5) return 'Amazing — well beyond today’s goal';
  if (wordsRead >= goalWords) return 'Daily goal complete';
  if (wordsRead >= goalWords * 0.75) return 'Almost there — keep going';
  if (wordsRead > 0) return 'A little progress still counts';
  return 'Your gentle 30-minute reading goal';
}
