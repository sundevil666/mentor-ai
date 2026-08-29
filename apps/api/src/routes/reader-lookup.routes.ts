import { Router } from 'express';
import { synchronizeReaderVocabulary, translateReaderText } from '../controllers/reader-lookup.controller.js';
import { requireLearningIdentity } from '../middleware/auth-context.js';

export const readerLookupRouter = Router();
readerLookupRouter.use(requireLearningIdentity);
readerLookupRouter.post('/lookup', translateReaderText);
readerLookupRouter.post('/vocabulary-synchronize', synchronizeReaderVocabulary);
