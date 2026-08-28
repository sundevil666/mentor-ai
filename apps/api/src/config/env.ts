import 'dotenv/config';
import type { StorageMode } from '@mentor-ai/shared';

const storageMode = (process.env.STORAGE_MODE ?? 'demo') as StorageMode;

const minimumGoogleSessionSecretLength = 32;

export function validateGoogleAuthConfiguration(environment: NodeJS.ProcessEnv): void {
  const googleClientId = environment.GOOGLE_CLIENT_ID?.trim();
  const googleAllowedEmails = (environment.GOOGLE_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  if (!googleClientId || googleAllowedEmails.length === 0) {
    return;
  }

  const googleSessionSecret = environment.GOOGLE_SESSION_SECRET;

  if (!googleSessionSecret) {
    throw new Error(
      'Invalid Google authentication configuration: GOOGLE_SESSION_SECRET is required when GOOGLE_CLIENT_ID and GOOGLE_ALLOWED_EMAILS are configured.',
    );
  }

  if (googleSessionSecret.length < minimumGoogleSessionSecretLength) {
    throw new Error(
      `Invalid Google authentication configuration: GOOGLE_SESSION_SECRET must be at least ${minimumGoogleSessionSecretLength} characters long.`,
    );
  }
}

validateGoogleAuthConfiguration(process.env);

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
  googleSessionSecret: process.env.GOOGLE_SESSION_SECRET,
};
