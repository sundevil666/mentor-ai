import { Router } from 'express';
import { listStatistics } from '../controllers/statistics.controller.js';

export const statisticsRouter = Router();

statisticsRouter.get('/', listStatistics);
