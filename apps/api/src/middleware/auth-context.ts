import type { RequestHandler } from 'express';
import { authService, type AuthenticatedUser } from '../services/auth.service.js';

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: AuthenticatedUser;
  }
}

export const attachAuthContext: RequestHandler = (req, _res, next) => {
  const token = readBearerToken(req.headers.authorization);

  if (token) {
    req.authUser = authService.verifySessionToken(token) ?? undefined;
  }

  next();
};

export const requireLearningIdentity: RequestHandler = (req, res, next) => {
  if (!authService.isGoogleAuthConfigured()) {
    next();
    return;
  }

  if (!req.authUser) {
    res.status(401).json({ data: { message: 'Google sign-in is required for cloud learning synchronization.' } });
    return;
  }

  next();
};

function readBearerToken(value: string | undefined): string | null {
  if (!value?.startsWith('Bearer ')) {
    return null;
  }

  return value.slice('Bearer '.length).trim() || null;
}
