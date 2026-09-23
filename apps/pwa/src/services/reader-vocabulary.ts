import type { ReaderTextLookup, ReaderVocabularyItem } from '@mentor-ai/shared';
import { mentorDb } from './indexed-db';
import { synchronizeReaderVocabulary } from './api-client';
import { isReaderVocabularyBatchAcknowledged, mergeVocabularyContexts } from './reader-vocabulary-model';

export async function recordReaderVocabularyInteraction(input: {
  studentId: string;
  bookId: string;
  chapterId?: string;
  text: string;
  contextText?: string;
  pageIndex?: number;
  translationRequested?: boolean;
  pronunciationRequested?: boolean;
}): Promise<ReaderVocabularyItem> {
  await waitForVocabularySync();
  const normalizedText = input.text.toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
  const id = `reader-vocabulary:${input.studentId}:${normalizedText}`;
  const db = await mentorDb;
  const existing = await db.get('vocabulary-practice-items', id) as ReaderVocabularyItem | undefined;
  const now = new Date().toISOString();
  const isLegacyRecord = Boolean(existing && existing.syncMode !== 'delta-v1');
  const item: ReaderVocabularyItem = {
    id,
    studentId: input.studentId,
    bookId: input.bookId,
    chapterId: input.chapterId,
    text: input.text,
    normalizedText,
    kind: /\s/.test(input.text) ? 'phrase' : 'word',
    translation: existing?.translation ?? '',
    phonetic: existing?.phonetic,
    lookupCount: (existing?.lookupCount ?? 0) + (input.translationRequested ? 1 : 0),
    pronunciationCount: (existing?.pronunciationCount ?? 0) + (input.pronunciationRequested ? 1 : 0),
    lookupDays: input.translationRequested
      ? mergeLookupDays(existing?.lookupDays, localDateKey(new Date(now)))
      : existing?.lookupDays,
    contexts: input.translationRequested && input.contextText
      ? mergeVocabularyContexts(existing?.contexts, {
        text: input.contextText,
        bookId: input.bookId,
        chapterId: input.chapterId,
        pageIndex: input.pageIndex,
        lookupCount: 1,
        firstLookedUpAt: now,
        lastLookedUpAt: now,
      })
      : existing?.contexts,
    syncMode: isLegacyRecord ? undefined : 'delta-v1',
    syncBatchId: isLegacyRecord ? undefined : existing?.syncBatchId ?? createSyncBatchId(),
    firstLookedUpAt: existing?.firstLookedUpAt ?? now,
    lastLookedUpAt: now,
  };
  await db.put('vocabulary-practice-items', item);
  return item;
}

export async function enrichReaderVocabularyLookup(input: {
  studentId: string;
  bookId: string;
  chapterId?: string;
  lookup: ReaderTextLookup;
}): Promise<ReaderVocabularyItem> {
  await waitForVocabularySync();
  const normalizedText = input.lookup.text.toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
  const id = `reader-vocabulary:${input.studentId}:${normalizedText}`;
  const db = await mentorDb;
  const existing = await db.get('vocabulary-practice-items', id) as ReaderVocabularyItem | undefined;
  const now = new Date().toISOString();
  const isLegacyRecord = Boolean(existing && existing.syncMode !== 'delta-v1');
  const item: ReaderVocabularyItem = {
    id,
    studentId: input.studentId,
    bookId: input.bookId,
    chapterId: input.chapterId,
    text: input.lookup.text,
    normalizedText,
    kind: /\s/.test(input.lookup.text) ? 'phrase' : 'word',
    translation: input.lookup.translation,
    phonetic: input.lookup.phonetic ?? existing?.phonetic,
    lookupCount: existing?.lookupCount ?? 0,
    pronunciationCount: existing?.pronunciationCount ?? 0,
    lookupDays: existing?.lookupDays,
    contexts: existing?.contexts,
    syncMode: isLegacyRecord ? undefined : 'delta-v1',
    syncBatchId: isLegacyRecord ? undefined : existing?.syncBatchId ?? createSyncBatchId(),
    firstLookedUpAt: existing?.firstLookedUpAt ?? now,
    lastLookedUpAt: existing?.lastLookedUpAt ?? now,
  };
  await db.put('vocabulary-practice-items', item);
  return item;
}

export async function listReaderVocabulary(studentId: string): Promise<ReaderVocabularyItem[]> {
  const db = await mentorDb;
  return (await db.getAll('vocabulary-practice-items') as ReaderVocabularyItem[])
    .filter((item) => item.studentId === studentId && item.normalizedText)
    .sort((left, right) => right.lastLookedUpAt.localeCompare(left.lastLookedUpAt));
}

let activeVocabularySync: Promise<void> | null = null;

export function syncReaderVocabulary(studentId: string): Promise<void> {
  if (activeVocabularySync) return activeVocabularySync;
  activeVocabularySync = synchronizePendingVocabulary(studentId)
    .finally(() => { activeVocabularySync = null; });
  return activeVocabularySync;
}

export async function findReaderVocabularyLookup(studentId: string, text: string): Promise<ReaderTextLookup | null> {
  const normalizedText = text.toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
  const db = await mentorDb;
  const item = await db.get('vocabulary-practice-items', `reader-vocabulary:${studentId}:${normalizedText}`) as ReaderVocabularyItem | undefined;
  if (!item?.translation) return null;
  return {
    text,
    translation: item.translation,
    phonetic: item.phonetic,
    sourceLanguage: 'en',
    targetLanguage: 'ru',
  };
}

async function synchronizePendingVocabulary(studentId: string): Promise<void> {
  const items = await listReaderVocabulary(studentId);
  if (items.length === 0) return;
  const acknowledged = await synchronizeReaderVocabulary(items);
  const acknowledgedById = new Map(acknowledged.map((item) => [item.id, item]));
  const db = await mentorDb;
  const transaction = db.transaction('vocabulary-practice-items', 'readwrite');
  for (const sent of items) {
    const serverItem = acknowledgedById.get(sent.id);
    const batchAcknowledged = isReaderVocabularyBatchAcknowledged(sent, serverItem);
    if (!batchAcknowledged) continue;
    const current = await transaction.store.get(sent.id) as ReaderVocabularyItem | undefined;
    if (current && current.syncBatchId === sent.syncBatchId && current.lastLookedUpAt === sent.lastLookedUpAt) {
      await transaction.store.delete(sent.id);
    }
  }
  await transaction.done;
}

async function waitForVocabularySync() {
  if (activeVocabularySync) await activeVocabularySync.catch(() => undefined);
}

function mergeLookupDays(current: readonly string[] | undefined, day: string) {
  return [...new Set([...(current ?? []), day])].sort().slice(-30);
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createSyncBatchId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
