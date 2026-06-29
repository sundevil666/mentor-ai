import type { RequestHandler } from 'express';
import type { GeneratedLesson } from '@mentor-ai/shared';
import { config } from '../config/env.js';
import { lessonService } from '../services/lesson.service.js';

export const listLessons: RequestHandler = async (_req, res, next) => {
  try {
    res.json({ data: await lessonService.listLessons() });
  } catch (error) {
    next(error);
  }
};

export const importPrivateLessons: RequestHandler = async (req, res, next) => {
  try {
    const authorization = req.header('authorization') ?? '';
    const expected = config.lessonImportToken;

    if (!expected || authorization !== `Bearer ${expected}`) {
      res.status(401).json({ data: { message: 'Unauthorized' } });
      return;
    }

    const lessons = Array.isArray(req.body?.lessons) ? (req.body.lessons as GeneratedLesson[]) : [];
    res.json({ data: await lessonService.importPrivateLessons(lessons) });
  } catch (error) {
    next(error);
  }
};
