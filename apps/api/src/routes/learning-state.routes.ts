import { Router } from 'express';
import {
  getConfiguration,
  getCurrentLesson,
  getRecommendations,
  getStudentState,
  synchronizeLearningEvents,
} from '../controllers/learning-state.controller.js';

export const learningStateRouter = Router();

learningStateRouter.get('/student-state', getStudentState);
learningStateRouter.get('/lessons/current', getCurrentLesson);
learningStateRouter.get('/recommendations', getRecommendations);
learningStateRouter.get('/configuration', getConfiguration);
learningStateRouter.post('/synchronization', synchronizeLearningEvents);
