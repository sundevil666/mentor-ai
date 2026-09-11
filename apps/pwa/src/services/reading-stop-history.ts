export interface ReadingStopHistoryEntry {
  id: string;
  wordIndex: number;
  word: string;
  savedAt: string;
}

export const readingStopHistoryLimit = 20;

export function parseReadingStopHistory(raw: string | null): ReadingStopHistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is ReadingStopHistoryEntry => Boolean(
        entry &&
        typeof entry === 'object' &&
        typeof entry.id === 'string' &&
        Number.isInteger(entry.wordIndex) &&
        entry.wordIndex >= 0 &&
        typeof entry.word === 'string' &&
        entry.word.trim() &&
        typeof entry.savedAt === 'string' &&
        Number.isFinite(Date.parse(entry.savedAt)),
      ))
      .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
      .slice(0, readingStopHistoryLimit);
  } catch {
    return [];
  }
}

export function addReadingStopHistoryEntry(
  history: readonly ReadingStopHistoryEntry[],
  entry: ReadingStopHistoryEntry,
): ReadingStopHistoryEntry[] {
  return [entry, ...history]
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
    .slice(0, readingStopHistoryLimit);
}
