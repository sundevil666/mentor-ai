import type { RequestHandler } from 'express';
import { statisticsService } from '../services/statistics.service.js';

export const listStatistics: RequestHandler = (_req, res) => {
  res.json({ data: statisticsService.listStatistics() });
};
