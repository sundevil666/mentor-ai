import { Router } from 'express';
import { getReaderPhonetic, synchronizeReaderVocabulary, translateReaderText } from '../controllers/reader-lookup.controller.js';
import { requireLearningIdentity } from '../middleware/auth-context.js';

export const readerLookupRouter = Router();
readerLookupRouter.use(requireLearningIdentity);
readerLookupRouter.post('/lookup', translateReaderText);
readerLookupRouter.post('/phonetic', getReaderPhonetic);
readerLookupRouter.post('/vocabulary-synchronize', synchronizeReaderVocabulary);
