import type { RequestHandler } from 'express';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    data: {
      message: 'Route not found',
    },
  });
};
