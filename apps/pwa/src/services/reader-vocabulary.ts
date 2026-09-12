import type { ReaderTextLookup, ReaderVocabularyItem } from '@mentor-ai/shared';
import { mentorDb } from './indexed-db';
import { synchronizeReaderVocabulary } from './api-client';

export async function recordReaderVocabularyInteraction(input: {
  studentId: string;
  bookId: string;
  chapterId?: string;
  text: string;
  translationRequested?: boolean;
  pronunciationRequested?: boolean;
}): Promise<ReaderVocabularyItem> {
  const normalizedText = input.text.toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
  const id = `reader-vocabulary:${input.studentId}:${normalizedText}`;
  const db = await mentorDb;
  const existing = await db.get('vocabulary-practice-items', id) as ReaderVocabularyItem | undefined;
  const now = new Date().toISOString();
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
  const normalizedText = input.lookup.text.toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
  const id = `reader-vocabulary:${input.studentId}:${normalizedText}`;
  const db = await mentorDb;
  const existing = await db.get('vocabulary-practice-items', id) as ReaderVocabularyItem | undefined;
  const now = new Date().toISOString();
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
    lookupCount: existing?.lookupCount ?? 1,
    pronunciationCount: existing?.pronunciationCount ?? 0,
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

export async function syncReaderVocabulary(studentId: string): Promise<void> {
  const items = await listReaderVocabulary(studentId);
  if (items.length > 0) await synchronizeReaderVocabulary(items);
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
