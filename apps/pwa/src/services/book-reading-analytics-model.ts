import type { BookReadingAnalytics, BookReadingAnalyticsReceipt } from '@mentor-ai/shared';

type Range = [number, number];
export interface LocalBookAnalytics {
  id: string;
  studentId: string;
  snapshot: BookReadingAnalytics;
  acknowledgedRevision: number;
  readRanges: Range[];
  speechRanges: Range[];
  matchedRanges: Range[];
}
export type BookAnalyticsEvent =
  | { kind: 'lookup'; text: string; context?: string; translation: boolean; pronunciation: boolean }
  | { kind: 'read'; indexes: readonly number[] }
  | { kind: 'speech'; indexes: readonly number[]; missed: readonly { index: number; word: string }[] };

export function newBookAnalytics(studentId: string, bookId: string, deviceId: string, now: string): LocalBookAnalytics {
  return {
    id: JSON.stringify([studentId, deviceId, bookId]), studentId, acknowledgedRevision: 0,
    readRanges: [], speechRanges: [], matchedRanges: [],
    snapshot: { version: 1, bookId, deviceId, revision: 0, startedAt: now, updatedAt: now,
      readWords: 0, wordLookups: 0, passageLookups: 0, pronunciationRequests: 0,
      speechPageWords: 0, speechMatchedWords: 0, words: [], passages: [], unmatchedSpeechWords: [], examplesTruncated: false },
  };
}

function rangesWith(ranges: Range[], indexes: readonly number[]): Range[] {
  const all: Range[] = [...ranges, ...indexes.filter((n) => Number.isSafeInteger(n) && n >= 0).map((n): Range => [n, n])];
  all.sort((a, b) => a[0] - b[0]);
  const result: Range[] = [];
  for (const range of all) {
    const last = result.at(-1);
    if (last && range[0] <= last[1] + 1) last[1] = Math.max(last[1], range[1]);
    else result.push([...range]);
  }
  return result;
}
const rangeCount = (ranges: Range[]) => ranges.reduce((sum, [start, end]) => sum + end - start + 1, 0);

export function applyBookAnalyticsEvent(current: LocalBookAnalytics, event: BookAnalyticsEvent, now: string): LocalBookAnalytics {
  const next = structuredClone(current);
  const data = next.snapshot;
  const before = JSON.stringify(next);
  if (event.kind === 'lookup') {
    const normalized = event.text.toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
    if (!normalized || (!event.translation && !event.pronunciation)) return current;
    const phrase = /\s/.test(normalized);
    if (event.translation) { if (phrase) data.passageLookups++; else data.wordLookups++; }
    if (event.pronunciation) data.pronunciationRequests++;
    if (phrase && event.translation) {
      const text = normalized.slice(0, 200);
      if (text !== normalized) data.examplesTruncated = true;
      const item = data.passages.find((entry) => entry.text === text);
      if (item) item.count++;
      else if (data.passages.length < 20) data.passages.push({ text, count: 1 });
      else data.examplesTruncated = true;
    } else if (!phrase) {
      const text = normalized.slice(0, 80);
      if (text !== normalized) data.examplesTruncated = true;
      const context = event.context?.replace(/\s+/g, ' ').trim().slice(0, 200);
      if ((event.context?.length ?? 0) > 200) data.examplesTruncated = true;
      const item = data.words.find((entry) => entry.text === text);
      if (item) { item.translations += Number(event.translation); item.pronunciations += Number(event.pronunciation); if (context) item.context = context; }
      else if (data.words.length < 100) data.words.push({ text, translations: Number(event.translation), pronunciations: Number(event.pronunciation), ...(context ? { context } : {}) });
      else data.examplesTruncated = true;
    }
  } else if (event.kind === 'read') {
    next.readRanges = rangesWith(next.readRanges, event.indexes);
    data.readWords = rangeCount(next.readRanges);
  } else {
    const missed = new Set(event.missed.map((word) => word.index));
    next.speechRanges = rangesWith(next.speechRanges, event.indexes);
    next.matchedRanges = rangesWith(next.matchedRanges, event.indexes.filter((index) => !missed.has(index)));
    // A recognition match also counts as observed reading, without counting rereads twice.
    next.readRanges = rangesWith(next.readRanges, event.indexes.filter((index) => !missed.has(index)));
    data.readWords = rangeCount(next.readRanges);
    data.speechPageWords = rangeCount(next.speechRanges);
    data.speechMatchedWords = rangeCount(next.matchedRanges);
    for (const item of event.missed) {
      const text = item.word.toLocaleLowerCase('en').trim().slice(0, 80);
      if (!text || data.unmatchedSpeechWords.includes(text)) continue;
      if (data.unmatchedSpeechWords.length < 100) data.unmatchedSpeechWords.push(text);
      else data.examplesTruncated = true;
    }
  }
  // The example-count limits alone do not bound UTF-8 bytes. Keep every
  // individual snapshot sendable, even for long non-Latin selections.
  while (new TextEncoder().encode(JSON.stringify(data)).length > 48_000) {
    if (data.passages.length) data.passages.pop();
    else if (data.unmatchedSpeechWords.length) data.unmatchedSpeechWords.pop();
    else if (data.words.length) data.words.pop();
    else break;
    data.examplesTruncated = true;
  }
  if (JSON.stringify(next) === before) return current;
  data.revision++;
  data.updatedAt = now;
  return next;
}

export const bookAnalyticsIntervalMs = 86_400_000;
export const bookAnalyticsMaxBytes = 64_000;
export function bookAnalyticsBatch(records: LocalBookAnalytics[]): BookReadingAnalytics[] {
  const batch: BookReadingAnalytics[] = [];
  for (const record of records.filter((item) => item.snapshot.revision > item.acknowledgedRevision)
    .sort((a, b) => a.snapshot.updatedAt.localeCompare(b.snapshot.updatedAt))) {
    if (batch.length >= 10) break;
    const candidate = [...batch, record.snapshot];
    if (new TextEncoder().encode(JSON.stringify({ books: candidate })).length <= bookAnalyticsMaxBytes) batch.push(record.snapshot);
  }
  return batch;
}

export interface BookAnalyticsOutbox {
  list(studentId: string): Promise<LocalBookAnalytics[]>;
  claimAttempt(studentId: string, now: number): Promise<boolean>;
  acknowledge(studentId: string, receipts: BookReadingAnalyticsReceipt[]): Promise<void>;
}

export async function flushBookAnalytics(
  store: BookAnalyticsOutbox, studentId: string, now: number,
  send: (books: BookReadingAnalytics[]) => Promise<BookReadingAnalyticsReceipt[]>,
): Promise<number> {
  const books = bookAnalyticsBatch(await store.list(studentId));
  if (!books.length || !await store.claimAttempt(studentId, now)) return 0;
  const received = await send(books);
  // Never trust an unrelated or future revision acknowledgement.
  const receipts = received.filter((receipt) => books.some((book) => book.bookId === receipt.bookId
    && book.deviceId === receipt.deviceId && book.revision === receipt.revision));
  await store.acknowledge(studentId, receipts);
  return receipts.length;
}
