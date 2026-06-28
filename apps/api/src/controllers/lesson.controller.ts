import type { RequestHandler } from 'express';
import { lessonService } from '../services/lesson.service.js';

export const listLessons: RequestHandler = (_req, res) => {
  res.json({ data: lessonService.listLessons() });
};
