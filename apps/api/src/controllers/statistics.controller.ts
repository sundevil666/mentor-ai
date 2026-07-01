import type { RequestHandler } from 'express';
import { statisticsService } from '../services/statistics.service.js';
import { sendData } from './http-response.js';

export const listStatistics: RequestHandler = sendData(() => statisticsService.listStatistics());
