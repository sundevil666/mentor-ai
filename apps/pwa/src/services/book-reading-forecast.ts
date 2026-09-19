export interface BookReadingForecast {
  finishDate: Date;
  readingDaysRemaining: number;
  wordsRemaining: number;
}

export function formatReadingDaysRemaining(days: number): string {
  return days === 0 ? 'Book complete' : `${days.toFixed(2).replace('.', ',')} reading days left`;
}

export function bookReadingForecast(
  totalWords: number,
  furthestWordPosition: number,
  dailyTargetWords: number,
  today = new Date(),
): BookReadingForecast {
  const safeTotal = Math.max(0, Math.floor(Number.isFinite(totalWords) ? totalWords : 0));
  const safePosition = Math.max(0, Math.min(safeTotal, Math.floor(Number.isFinite(furthestWordPosition) ? furthestWordPosition : 0)));
  const safeTarget = Math.max(1, Math.floor(Number.isFinite(dailyTargetWords) ? dailyTargetWords : 1));
  const wordsRemaining = safeTotal - safePosition;
  const readingDaysRemaining = wordsRemaining / safeTarget;
  const finishDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  finishDate.setDate(finishDate.getDate() + Math.max(0, Math.ceil(readingDaysRemaining) - 1));

  return { finishDate, readingDaysRemaining, wordsRemaining };
}
