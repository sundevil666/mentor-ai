import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { lessonRouter } from './lesson.routes.js';
import { statisticsRouter } from './statistics.routes.js';
import { userRouter } from './user.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/lessons', lessonRouter);
apiRouter.use('/statistics', statisticsRouter);
