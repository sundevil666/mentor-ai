import { Router } from 'express';
import { listLessons } from '../controllers/lesson.controller.js';

export const lessonRouter = Router();

lessonRouter.get('/', listLessons);
