import type { RequestHandler } from 'express';
import { config } from '../config/env.js';

export const getHealth: RequestHandler = (_req, res) => {
  res.json({
    data: {
      status: 'ok',
      storageMode: config.storageMode,
    },
  });
};
