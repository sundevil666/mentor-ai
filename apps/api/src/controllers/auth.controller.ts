import type { RequestHandler } from 'express';
import { authService } from '../services/auth.service.js';

export const getAuthConfiguration: RequestHandler = (_req, res) => {
  res.json({
    data: {
      googleClientId: process.env.GOOGLE_CLIENT_ID ?? null,
      googleSignInRequired: authService.isGoogleAuthConfigured(),
    },
  });
};

export const signInWithGoogle: RequestHandler = async (req, res, next) => {
  try {
    const credential = typeof req.body?.credential === 'string' ? req.body.credential : '';

    if (!credential) {
      res.status(400).json({ data: { message: 'Google credential is required.' } });
      return;
    }

    res.json({ data: await authService.signInWithGoogleCredential(credential) });
  } catch (error) {
    next(error);
  }
};
