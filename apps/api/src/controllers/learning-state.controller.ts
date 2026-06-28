import type { RequestHandler } from 'express';
import type { ExerciseResult, LearningContext, LearningEvent, LearningSessionHandoff, SpeechResult } from '@mentor-ai/shared';
import { learningStateService } from '../services/learning-state.service.js';

export const getStudentState: RequestHandler = async (_req, res, next) => {
  try {
    res.json({ data: await learningStateService.getStudentState() });
  } catch (error) {
    next(error);
  }
};

export const getCurrentLesson: RequestHandler = async (req, res, next) => {
  try {
    res.json({ data: await learningStateService.getCurrentLesson(req.body?.context as LearningContext | undefined) });
  } catch (error) {
    next(error);
  }
};

export const getRecommendations: RequestHandler = async (_req, res, next) => {
  try {
    res.json({ data: await learningStateService.getRecommendations() });
  } catch (error) {
    next(error);
  }
};

export const listSessionHandoffs: RequestHandler = async (_req, res, next) => {
  try {
    res.json({ data: await learningStateService.listSessionHandoffs() });
  } catch (error) {
    next(error);
  }
};

export const upsertSessionHandoff: RequestHandler = async (req, res, next) => {
  try {
    res.json({ data: await learningStateService.upsertSessionHandoff(req.body as LearningSessionHandoff) });
  } catch (error) {
    next(error);
  }
};

export const synchronizeLearningEvents: RequestHandler = async (req, res, next) => {
  try {
    const events = Array.isArray(req.body?.events) ? (req.body.events as LearningEvent[]) : [];
    const exerciseResults = Array.isArray(req.body?.exerciseResults)
      ? (req.body.exerciseResults as ExerciseResult[])
      : [];
    const speechResults = Array.isArray(req.body?.speechResults) ? (req.body.speechResults as SpeechResult[]) : [];

    res.json({ data: await learningStateService.synchronize(events, exerciseResults, speechResults) });
  } catch (error) {
    next(error);
  }
};

export const getConfiguration: RequestHandler = (_req, res) => {
  res.json({ data: learningStateService.getConfiguration() });
};
