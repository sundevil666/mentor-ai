import { storeBookReadingAnalytics } from '../services/book-reading-analytics.service.js';
import { getPostgresPool } from '../repositories/postgres-client.js';
import { learningStateRepository } from '../repositories/learning-state.repository.js';
import { listPersonalReadingBookVersions, synchronizePersonalReadingBooks as exchangePersonalReadingBooks } from '../services/personal-reading-books.service.js';
import type { RequestHandler } from 'express';
import { lookupReaderPhonetic, lookupReaderText } from '../services/reader-lookup.service.js';
import type { PersonalReadingBookArchive, ReaderVocabularyItem, ReadingTranscriptChunk } from '@mentor-ai/shared';
import { learningStateService } from '../services/learning-state.service.js';
import { getTranslationUsage, synchronizeTranslationUsageDevice, TranslationLimitError } from '../services/translation-usage.service.js';
import { storeReadingTranscripts } from '../services/reading-transcripts.service.js';
import { storeReadingPageSpeech } from '../services/reading-page-speech.service.js';

export const translateReaderText: RequestHandler = async (req, res, _next) => {
  try {
    res.json({ data: await lookupReaderText(req.body?.text) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Translation is unavailable right now.';
    const status = error instanceof TranslationLimitError ? 429 : message.startsWith('Select ') ? 400 : 502;
    res.status(status).json({ data: { message } });
  }
};

export const getReaderTranslationUsage: RequestHandler = async (_req, res, next) => {
  try {
    res.json({ data: await getTranslationUsage() });
  } catch (error) {
    next(error);
  }
};

export const synchronizeReaderTranslationUsage: RequestHandler = async (req, res, next) => {
  try {
    res.json({ data: await synchronizeTranslationUsageDevice(req.body ?? {}) });
  } catch (error) {
    next(error);
  }
};

export const getReaderPhonetic: RequestHandler = async (req, res, next) => {
  try {
    res.json({ data: await lookupReaderPhonetic(req.body?.text) });
  } catch (error) {
    next(error);
  }
};

export const synchronizeReaderVocabulary: RequestHandler = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items as ReaderVocabularyItem[] : [];
    const merged = await learningStateService.mergeReaderVocabularyItems(items, req.authUser);
    const incomingIds = new Set(items.map((item) => item.id));
    res.json({ data: merged.filter((item) => incomingIds.has(item.id)) });
  } catch (error) {
    next(error);
  }
};

export const synchronizePersonalReadingBooks: RequestHandler = async (req, res, next) => {
  try {
    const books = Array.isArray(req.body?.books) ? req.body.books as PersonalReadingBookArchive[] : [];
    const knownBooks = req.body?.knownBooks && typeof req.body.knownBooks === 'object' && !Array.isArray(req.body.knownBooks)
      ? req.body.knownBooks as Record<string, string> : undefined;
    if (req.authUser && getPostgresPool()) {
      res.json({ data: req.body?.manifest === true
        ? await listPersonalReadingBookVersions(req.authUser)
        : await exchangePersonalReadingBooks(books, req.authUser, knownBooks) });
      return;
    }
    const local = req.body?.manifest === true
      ? (await learningStateRepository.readFields(['personalReadingBooks'], req.authUser)).personalReadingBooks
      : await learningStateService.mergePersonalReadingBooks(books, req.authUser);
    res.json({ data: req.body?.manifest === true
      ? Object.fromEntries(local.map((archive) => [archive.book.id, archive.book.updatedAt]))
      : local.filter((archive) => !knownBooks || knownBooks[archive.book.id] !== archive.book.updatedAt) });
  } catch (error) {
    next(error);
  }
};

export const saveReadingTranscript: RequestHandler = async (req, res, next) => {
  try {
    const chunks = Array.isArray(req.body?.chunks)
      ? req.body.chunks as ReadingTranscriptChunk[]
      : [req.body as ReadingTranscriptChunk];
    const data = req.authUser
      ? await storeReadingTranscripts(chunks, req.authUser)
      : await learningStateService.saveReadingTranscriptChunks(chunks, req.authUser);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const saveReadingPageSpeech: RequestHandler = async (req, res, next) => {
  try {
    if (!req.authUser) { res.status(401).json({ error: { message: 'Sign in to save reading progress.' } }); return; }
    res.json({ data: await storeReadingPageSpeech(req.body?.pages, req.authUser) });
  } catch (error) { next(error); }
};


export const saveBookReadingAnalytics: RequestHandler = async (req, res, next) => {
  if (!req.authUser) { res.status(401).json({ data: { message: 'Sign in to save book reading analytics.' } }); return; }
  try {
    res.json({ data: await storeBookReadingAnalytics(req.body?.books, req.authUser) });
  } catch (error) {
    if (error instanceof RangeError) { res.status(400).json({ data: { message: error.message } }); return; }
    next(error);
  }
};
