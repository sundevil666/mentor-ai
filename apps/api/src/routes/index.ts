import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { healthRouter } from './health.routes.js';
import { lessonRouter } from './lesson.routes.js';
import { learningStateRouter } from './learning-state.routes.js';
import { statisticsRouter } from './statistics.routes.js';
import { userRouter } from './user.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/', learningStateRouter);
apiRouter.use('/health', healthRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/lessons', lessonRouter);
apiRouter.use('/statistics', statisticsRouter);
