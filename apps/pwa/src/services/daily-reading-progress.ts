export const dailyReadingGoalWords = 3_000;
const readingAverageDays = 7;
const annualHistoryDays = 370;

export interface DailyBookReadingProgress {
  spokenWordIndexes: number[];
  readWordIndexes: number[];
}

export interface DailyReadingHistoryEntry {
  date: string;
  wordsRead: number;
  targetWords: number;
}

export interface DailyReadingProgress {
  date: string;
  books: Record<string, DailyBookReadingProgress>;
  history: DailyReadingHistoryEntry[];
  trackingStartDate: string;
}

export function localReadingDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createDailyReadingProgress(date = localReadingDate()): DailyReadingProgress {
  return { date, books: {}, history: [], trackingStartDate: date };
}

function validWordIndexes(indexes: readonly number[] | undefined): number[] {
  return [...new Set(indexes ?? [])]
    .filter((wordIndex) => Number.isInteger(wordIndex) && wordIndex >= 0)
    .sort((left, right) => left - right);
}

export function recordDailySpokenWords(
  progress: DailyReadingProgress,
  bookId: string,
  wordIndexes: readonly number[],
): DailyReadingProgress {
  const previous = progress.books[bookId];
  const uniqueIndexes = new Set(validWordIndexes(previous?.spokenWordIndexes));
  wordIndexes.forEach((wordIndex) => {
    if (Number.isInteger(wordIndex) && wordIndex >= 0) uniqueIndexes.add(wordIndex);
  });
  return {
    ...progress,
    books: {
      ...progress.books,
      [bookId]: {
        readWordIndexes: validWordIndexes(previous?.readWordIndexes),
        spokenWordIndexes: Array.from(uniqueIndexes).sort((left, right) => left - right),
      },
    },
  };
}

export function recordDailyReadWords(
  progress: DailyReadingProgress,
  bookId: string,
  wordIndexes: readonly number[],
): DailyReadingProgress {
  const previous = progress.books[bookId];
  const uniqueIndexes = new Set(validWordIndexes(previous?.readWordIndexes));
  validWordIndexes(wordIndexes).forEach((wordIndex) => uniqueIndexes.add(wordIndex));
  return {
    ...progress,
    books: {
      ...progress.books,
      [bookId]: {
        readWordIndexes: Array.from(uniqueIndexes).sort((left, right) => left - right),
        spokenWordIndexes: validWordIndexes(previous?.spokenWordIndexes),
      },
    },
  };
}

export function dailyWordsRead(progress: DailyReadingProgress): number {
  return Object.values(progress.books).reduce(
    (total, book) => total + validWordIndexes(book.readWordIndexes).length,
    0,
  );
}

export function spokenWordsForBook(progress: DailyReadingProgress, bookId: string): number[] {
  return validWordIndexes(progress.books[bookId]?.spokenWordIndexes);
}

export function prepareDailyReadingProgress(
  progress: DailyReadingProgress | null | undefined,
  date = localReadingDate(),
): DailyReadingProgress {
  if (!progress || !isReadingDate(progress.date) || !isReadingDate(date)) return createDailyReadingProgress(date);
  const history = Array.isArray(progress.history) ? progress.history.filter((entry) => (
    typeof entry?.date === 'string'
      && Number.isFinite(entry.wordsRead)
      && entry.wordsRead >= 0
  )).map((entry) => ({
    date: entry.date,
    wordsRead: entry.wordsRead,
    targetWords: Number.isFinite(entry.targetWords) && entry.targetWords >= dailyReadingGoalWords
      ? entry.targetWords
      : dailyReadingGoalWords,
  })) : [];
  const trackingStartDate = typeof progress.trackingStartDate === 'string'
    ? progress.trackingStartDate
    : progress.date;
  if (progress.date === date) return { ...progress, history, trackingStartDate };

  const archived = history.filter((entry) => entry.date !== progress.date);
  let archiveDate = progress.date;
  let firstDay = true;
  while (archiveDate < date) {
    const targetWords = dailyReadingTargetWords({ ...progress, history: archived, trackingStartDate });
    archived.push({
      date: archiveDate,
      wordsRead: firstDay ? dailyWordsRead(progress) : 0,
      targetWords,
    });
    firstDay = false;
    archiveDate = nextReadingDate(archiveDate);
  }
  return { date, books: {}, history: archived.slice(-annualHistoryDays), trackingStartDate };
}

function isReadingDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T12:00:00Z`).getTime());
}

function nextReadingDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

export function dailyReadingTargetWords(progress: DailyReadingProgress): number {
  const recent = (progress.history ?? [])
    .filter((entry) => Number.isFinite(entry.wordsRead) && entry.wordsRead > 0)
    .slice(-readingAverageDays);
  if (!recent.length) return dailyReadingGoalWords;
  const average = recent.reduce((total, entry) => total + entry.wordsRead, 0) / recent.length;
  return Math.max(dailyReadingGoalWords, Math.round(average / 100) * 100);
}

export interface AnnualReadingPace {
  actualWords: number;
  balanceWords: number;
  expectedWords: number;
  trackedDays: number;
}

export function annualReadingPace(progress: DailyReadingProgress): AnnualReadingPace {
  const year = progress.date.slice(0, 4);
  const yearStart = `${year}-01-01`;
  const yearHistory = (progress.history ?? []).filter((entry) => entry.date.startsWith(`${year}-`));
  const trackingStart = progress.trackingStartDate > yearStart ? progress.trackingStartDate : yearStart;
  const baselineDays = trackingStart > progress.date ? 0 : daysBetweenReadingDates(yearStart, trackingStart);
  const baselineWords = baselineDays * dailyReadingGoalWords;
  const actualWords = baselineWords
    + yearHistory.reduce((total, entry) => total + entry.wordsRead, 0)
    + dailyWordsRead(progress);
  const expectedWords = baselineWords
    + yearHistory.reduce((total, entry) => total + entry.targetWords, 0)
    + dailyReadingTargetWords(progress);
  return {
    actualWords,
    balanceWords: actualWords - expectedWords,
    expectedWords,
    trackedDays: daysBetweenReadingDates(yearStart, progress.date) + 1,
  };
}

function daysBetweenReadingDates(from: string, to: string): number {
  const fromTime = new Date(`${from}T12:00:00Z`).getTime();
  const toTime = new Date(`${to}T12:00:00Z`).getTime();
  return Math.max(0, Math.round((toTime - fromTime) / 86_400_000));
}

export function annualReadingPaceMessage(balanceWords: number, dailyTargetWords: number): string {
  const absoluteBalance = Math.abs(balanceWords).toLocaleString('en');
  if (balanceWords >= dailyTargetWords * 7) {
    return `${absoluteBalance} words ahead · Ease the pace a little to avoid burnout.`;
  }
  if (balanceWords > 0) return `${absoluteBalance} words ahead · You can take it easy today.`;
  if (balanceWords < -dailyTargetWords * 2) {
    return `${absoluteBalance} words behind · Return gently; consistency matters more than catching up at once.`;
  }
  if (balanceWords < 0) return `${absoluteBalance} words behind · A little more today will close the gap.`;
  return 'Right on pace · Keep your usual rhythm.';
}

export function readingGoalMessage(wordsRead: number, goalWords = dailyReadingGoalWords): string {
  if (wordsRead >= goalWords * 1.5) return 'Amazing — well beyond today’s goal';
  if (wordsRead >= goalWords) return 'Daily goal complete';
  if (wordsRead >= goalWords * 0.75) return 'Almost there — keep going';
  if (wordsRead > 0) return 'A little progress still counts';
  return 'Your gentle 30-minute reading goal';
}
