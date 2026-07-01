import 'dotenv/config';
import type { StorageMode } from '@mentor-ai/shared';

const storageMode = (process.env.STORAGE_MODE ?? 'demo') as StorageMode;

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  storageMode,
  personalStoragePath: process.env.PERSONAL_STORAGE_PATH ?? '.ai/private',
  databaseUrl: process.env.DATABASE_URL,
  lessonImportToken: process.env.LESSON_IMPORT_TOKEN,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleAllowedEmails: (process.env.GOOGLE_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  googleSessionSecret: process.env.GOOGLE_SESSION_SECRET ?? process.env.LESSON_IMPORT_TOKEN ?? 'mentor-ai-dev-secret',
};
