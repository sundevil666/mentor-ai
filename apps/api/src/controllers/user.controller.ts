import type { RequestHandler } from 'express';
import { userService } from '../services/user.service.js';
import { sendData } from './http-response.js';

export const listUsers: RequestHandler = sendData(() => userService.listUsers());
