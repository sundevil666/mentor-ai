import { Router } from 'express';
import {
  getConfiguration,
  getCurrentLesson,
  getRecommendations,
  getStudentState,
  listSessionHandoffs,
  synchronizeLearningEvents,
  upsertSessionHandoff,
} from '../controllers/learning-state.controller.js';

export const learningStateRouter = Router();

learningStateRouter.get('/student-state', getStudentState);
learningStateRouter.get('/lessons/current', getCurrentLesson);
learningStateRouter.get('/recommendations', getRecommendations);
learningStateRouter.get('/session-handoffs', listSessionHandoffs);
learningStateRouter.put('/session-handoffs', upsertSessionHandoff);
learningStateRouter.get('/configuration', getConfiguration);
learningStateRouter.post('/synchronization', synchronizeLearningEvents);
