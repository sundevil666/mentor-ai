import { Router } from 'express';
import { listUsers } from '../controllers/user.controller.js';

export const userRouter = Router();

userRouter.get('/', listUsers);
