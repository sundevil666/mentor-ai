import type { ReadingPageSpeechSummary } from './reading-page-speech.js';
import { synchronizeReadingPageSpeech } from './api-client.js';

export const readingPageSpeechSyncIntervalMs = 24 * 60 * 60 * 1_000;
const prefix = 'mentor-ai:reading-page-speech:';
const attemptPrefix = 'mentor-ai:reading-page-speech-attempt:';
const batchSize = 50;
const maxBatchBytes = 64_000;
let activeSync: Promise<number> | null = null;
const acknowledgedSummaries = new Map<string, string>();

export interface ReadingPageSpeechUpload {
  bookId: string;
  summary: ReadingPageSpeechSummary;
}

function storageKey(studentId: string, bookId: string) { return `${prefix}${studentId}:${bookId}`; }

export function readReadingPageSummaries(studentId: string, bookId: string): Record<string, ReadingPageSpeechSummary> {
  if (typeof localStorage === 'undefined') return {};
  const key = storageKey(studentId, bookId);
  const legacyKey = `${prefix}${bookId}`;
  const current = parseSummaries(localStorage.getItem(key));
  const legacy = parseSummaries(localStorage.getItem(legacyKey));
  if (!Object.keys(legacy).length) return current;
  const merged = { ...legacy, ...current };
  localStorage.setItem(key, JSON.stringify(merged));
  localStorage.removeItem(legacyKey);
  return merged;
}

export function saveReadingPageSummary(studentId: string, bookId: string, summary: ReadingPageSpeechSummary): void {
  if (typeof localStorage === 'undefined') return;
  const key = storageKey(studentId, bookId);
  const receiptKey = `${key}:${summary.pageIndex}`;
  if (acknowledgedSummaries.get(receiptKey) === JSON.stringify(summary)) return;
  acknowledgedSummaries.delete(receiptKey);
  const previous = readReadingPageSummaries(studentId, bookId);
  localStorage.setItem(key, JSON.stringify({ ...previous, [summary.pageIndex]: summary }));
}

export function syncReadingPageSpeech(
  studentId: string,
  now = Date.now(),
  send: (pages: ReadingPageSpeechUpload[]) => Promise<ReadingPageSpeechUpload[]> = synchronizeReadingPageSpeech,
  force = false,
): Promise<number> {
  if (activeSync) return activeSync;
  activeSync = flushReadingPageSpeech(studentId, now, send, force).finally(() => { activeSync = null; });
  return activeSync;
}

async function flushReadingPageSpeech(
  studentId: string,
  now: number,
  send: (pages: ReadingPageSpeechUpload[]) => Promise<ReadingPageSpeechUpload[]>,
  force: boolean,
): Promise<number> {
  if (typeof localStorage === 'undefined' || (typeof navigator !== 'undefined' && !navigator.onLine)) return 0;
  const attemptKey = `${attemptPrefix}${studentId}`;
  const lastAttempt = Number(localStorage.getItem(attemptKey));
  if (!force && lastAttempt > 0 && now >= lastAttempt && now - lastAttempt < readingPageSpeechSyncIntervalMs) return 0;
  const entries: { key: string; pageKey: string; value: ReadingPageSpeechSummary; bookId: string }[] = [];
  const scope = `${prefix}${studentId}:`;
  let batchBytes = 0;
  for (let index = 0; index < localStorage.length && entries.length < batchSize; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(scope)) continue;
    const bookId = key.slice(scope.length);
    for (const [pageKey, value] of Object.entries(parseSummaries(localStorage.getItem(key)))) {
      if (entries.length >= batchSize) break;
      const itemBytes = new TextEncoder().encode(JSON.stringify({ bookId, summary: value })).length;
      if (entries.length && batchBytes + itemBytes > maxBatchBytes) break;
      entries.push({ key, bookId, pageKey, value });
      batchBytes += itemBytes;
    }
  }
  if (!entries.length) return 0;
  localStorage.setItem(attemptKey, String(now));
  const accepted = await send(entries.map(({ bookId, value }) => ({ bookId, summary: value })));
  const acknowledged = new Set(accepted.map((item) => `${item.bookId}:${item.summary.pageIndex}`));
  let cleared = 0;
  for (const entry of entries) {
    if (!acknowledged.has(`${entry.bookId}:${entry.value.pageIndex}`)) continue;
    const current = parseSummaries(localStorage.getItem(entry.key));
    if (JSON.stringify(current[entry.pageKey]) !== JSON.stringify(entry.value)) continue;
    delete current[entry.pageKey];
    acknowledgedSummaries.set(`${entry.key}:${entry.pageKey}`, JSON.stringify(entry.value));
    if (acknowledgedSummaries.size > 200) acknowledgedSummaries.delete(acknowledgedSummaries.keys().next().value!);
    cleared += 1;
    if (Object.keys(current).length) localStorage.setItem(entry.key, JSON.stringify(current));
    else localStorage.removeItem(entry.key);
  }
  return cleared;
}

function parseSummaries(raw: string | null): Record<string, ReadingPageSpeechSummary> {
  try {
    const parsed: unknown = JSON.parse(raw ?? 'null');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, value]) =>
      /^\d+$/.test(key) && value && typeof value === 'object' &&
      (value as ReadingPageSpeechSummary).pageIndex === Number(key) &&
      Array.isArray((value as ReadingPageSpeechSummary).missedWords),
    ));
  } catch { return {}; }
}
