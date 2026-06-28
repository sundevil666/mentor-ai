import path from 'node:path';
import { config } from '../config/env.js';

export const resolvePersonalStoragePath = (...segments: string[]) =>
  path.resolve(process.cwd(), config.personalStoragePath, ...segments);
