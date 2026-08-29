import type { RequestHandler } from 'express';
import { lookupReaderPhonetic, lookupReaderText } from '../services/reader-lookup.service.js';
import type { PersonalReadingBookArchive, ReaderVocabularyItem } from '@mentor-ai/shared';
import { learningStateService } from '../services/learning-state.service.js';
import { getTranslationUsage, TranslationLimitError } from '../services/translation-usage.service.js';

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
    res.json({ data: await learningStateService.mergeReaderVocabularyItems(items, req.authUser) });
  } catch (error) {
    next(error);
  }
};

export const synchronizePersonalReadingBooks: RequestHandler = async (req, res, next) => {
  try {
    const books = Array.isArray(req.body?.books) ? req.body.books as PersonalReadingBookArchive[] : [];
    res.json({ data: await learningStateService.mergePersonalReadingBooks(books, req.authUser) });
  } catch (error) {
    next(error);
  }
};
