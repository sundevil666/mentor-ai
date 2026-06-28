import 'dotenv/config';
import type { StorageMode } from '@mentor-ai/shared';

const storageMode = (process.env.STORAGE_MODE ?? 'demo') as StorageMode;

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  storageMode,
  personalStoragePath: process.env.PERSONAL_STORAGE_PATH ?? '.ai/private',
  databaseUrl: process.env.DATABASE_URL,
};
