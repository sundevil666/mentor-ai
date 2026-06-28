import type { RequestHandler } from 'express';
import { userService } from '../services/user.service.js';

export const listUsers: RequestHandler = (_req, res) => {
  res.json({ data: userService.listUsers() });
};
