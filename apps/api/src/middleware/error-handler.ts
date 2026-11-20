import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  const isPublicMovieChatError = error instanceof Error && error.name === 'MovieChatPublicError';
  res.status(isPublicMovieChatError ? (error as Error & { statusCode: number }).statusCode : 500).json({
    data: {
      message: isPublicMovieChatError ? error.message : 'Internal server error',
    },
  });
};
