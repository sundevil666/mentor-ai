import type { RequestHandler } from 'express';
import { lessonService } from '../services/lesson.service.js';

export const listLessons: RequestHandler = async (_req, res, next) => {
  try {
    res.json({ data: await lessonService.listLessons() });
  } catch (error) {
    next(error);
  }
};
