import { Router } from 'express';
import {
  getConfiguration,
  getCurrentLesson,
  getRecommendations,
  getReadingResumeSnapshot,
  getLearningActivityTotals,
  getStudentState,
  listSessionHandoffs,
  listContentProgress,
  mergeContentProgress,
  mergeContentEngagementEvents,
  mergeLearningActivityEvents,
  mergeApplicationTelemetryEvents,
  synchronizeLearningEvents,
  upsertSessionHandoff,
  upsertReadingDeviceSession,
} from '../controllers/learning-state.controller.js';
import { requireLearningIdentity } from '../middleware/auth-context.js';

export const learningStateRouter = Router();

learningStateRouter.use(requireLearningIdentity);

learningStateRouter.get('/student-state', getStudentState);
learningStateRouter.get('/lessons/current', getCurrentLesson);
learningStateRouter.post('/lessons/current', getCurrentLesson);
learningStateRouter.get('/recommendations', getRecommendations);
learningStateRouter.get('/session-handoffs', listSessionHandoffs);
learningStateRouter.put('/session-handoffs', upsertSessionHandoff);
learningStateRouter.get('/content-progress', listContentProgress);
learningStateRouter.post('/content-progress-synchronize', mergeContentProgress);
learningStateRouter.get('/reading-resume', getReadingResumeSnapshot);
learningStateRouter.put('/reading-resume', upsertReadingDeviceSession);
learningStateRouter.post('/content-engagement-synchronize', mergeContentEngagementEvents);
learningStateRouter.post('/learning-activity-synchronize', mergeLearningActivityEvents);
learningStateRouter.get('/learning-activity-totals', getLearningActivityTotals);
learningStateRouter.post('/application-telemetry-synchronize', mergeApplicationTelemetryEvents);
learningStateRouter.get('/configuration', getConfiguration);
learningStateRouter.post('/synchronization', synchronizeLearningEvents);
