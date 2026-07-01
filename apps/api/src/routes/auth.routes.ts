import { Router } from 'express';
import { getAuthConfiguration, signInWithGoogle } from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.get('/configuration', getAuthConfiguration);
authRouter.post('/google', signInWithGoogle);
