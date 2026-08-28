import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateGoogleAuthConfiguration } from '../dist/config/env.js';

describe('Google authentication configuration', () => {
  it('accepts a configured client, allowlist, and sufficiently long session secret', () => {
    assert.doesNotThrow(() =>
      validateGoogleAuthConfiguration({
        GOOGLE_CLIENT_ID: 'google-client-id',
        GOOGLE_ALLOWED_EMAILS: 'student@example.com',
        GOOGLE_SESSION_SECRET: 'a'.repeat(32),
      }),
    );
  });

  it('rejects a missing session secret when Google authentication is enabled', () => {
    assert.throws(
      () =>
        validateGoogleAuthConfiguration({
          GOOGLE_CLIENT_ID: 'google-client-id',
          GOOGLE_ALLOWED_EMAILS: 'student@example.com',
          LESSON_IMPORT_TOKEN: 'a'.repeat(64),
        }),
      /GOOGLE_SESSION_SECRET is required/,
    );
  });

  it('rejects a session secret shorter than 32 characters', () => {
    assert.throws(
      () =>
        validateGoogleAuthConfiguration({
          GOOGLE_CLIENT_ID: 'google-client-id',
          GOOGLE_ALLOWED_EMAILS: 'student@example.com',
          GOOGLE_SESSION_SECRET: 'too-short',
        }),
      /GOOGLE_SESSION_SECRET must be at least 32 characters long/,
    );
  });

  it('allows local demo mode without Google authentication or a session secret', () => {
    assert.doesNotThrow(() => validateGoogleAuthConfiguration({ STORAGE_MODE: 'demo' }));
  });
});
