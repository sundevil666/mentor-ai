import { Router } from 'express';
import { importPrivateLessons, listLessons, listOfflineLessons } from '../controllers/lesson.controller.js';

export const lessonRouter = Router();

lessonRouter.get('/', listLessons);
lessonRouter.get('/offline', listOfflineLessons);
lessonRouter.post('/private/import', importPrivateLessons);
