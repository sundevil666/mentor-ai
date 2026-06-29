import { Router } from 'express';
import { importPrivateLessons, listLessons } from '../controllers/lesson.controller.js';

export const lessonRouter = Router();

lessonRouter.get('/', listLessons);
lessonRouter.post('/private/import', importPrivateLessons);
