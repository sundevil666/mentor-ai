import { Router } from 'express';
import { getReaderPhonetic, getReaderTranslationUsage, saveReadingTranscript, synchronizePersonalReadingBooks, synchronizeReaderTranslationUsage, synchronizeReaderVocabulary, translateReaderText } from '../controllers/reader-lookup.controller.js';
import { requireLearningIdentity } from '../middleware/auth-context.js';

export const readerLookupRouter = Router();
readerLookupRouter.use(requireLearningIdentity);
readerLookupRouter.post('/lookup', translateReaderText);
readerLookupRouter.get('/usage', getReaderTranslationUsage);
readerLookupRouter.post('/usage', synchronizeReaderTranslationUsage);
readerLookupRouter.post('/phonetic', getReaderPhonetic);
readerLookupRouter.post('/vocabulary-synchronize', synchronizeReaderVocabulary);
readerLookupRouter.post('/books-synchronize', synchronizePersonalReadingBooks);
readerLookupRouter.post('/reading-transcripts', saveReadingTranscript);
