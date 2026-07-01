import type { RequestHandler } from 'express';
import type { ExerciseResult, LearningContext, LearningEvent, LearningSessionHandoff, SpeechResult } from '@mentor-ai/shared';
import { learningStateService } from '../services/learning-state.service.js';
import { sendData } from './http-response.js';

export const getStudentState: RequestHandler = sendData((req) => learningStateService.getStudentState(req.authUser));

export const getCurrentLesson: RequestHandler = sendData((req) =>
  learningStateService.getCurrentLesson(req.body?.context as LearningContext | undefined, req.authUser),
);

export const getRecommendations: RequestHandler = sendData((req) => learningStateService.getRecommendations(req.authUser));

export const listSessionHandoffs: RequestHandler = sendData((req) => learningStateService.listSessionHandoffs(req.authUser));

export const upsertSessionHandoff: RequestHandler = sendData((req) =>
  learningStateService.upsertSessionHandoff(req.body as LearningSessionHandoff, req.authUser),
);

export const synchronizeLearningEvents: RequestHandler = async (req, res, next) => {
  try {
    const events = Array.isArray(req.body?.events) ? (req.body.events as LearningEvent[]) : [];
    const exerciseResults = Array.isArray(req.body?.exerciseResults)
      ? (req.body.exerciseResults as ExerciseResult[])
      : [];
    const speechResults = Array.isArray(req.body?.speechResults) ? (req.body.speechResults as SpeechResult[]) : [];

    res.json({ data: await learningStateService.synchronize(events, exerciseResults, speechResults, req.authUser) });
  } catch (error) {
    next(error);
  }
};

export const getConfiguration: RequestHandler = sendData(() => learningStateService.getConfiguration());
