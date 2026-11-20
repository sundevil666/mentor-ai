import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { it } from 'node:test';

const require = createRequire(import.meta.url);

it('answers movie chat without a Google session when cloud synchronization requires one', async () => {
  const previous = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    emails: process.env.GOOGLE_ALLOWED_EMAILS,
    secret: process.env.GOOGLE_SESSION_SECRET,
  };
  process.env.GOOGLE_CLIENT_ID = 'test-client';
  process.env.GOOGLE_ALLOWED_EMAILS = 'learner@example.com';
  process.env.GOOGLE_SESSION_SECRET = 'a'.repeat(32);
  try {
    const handler = require('../../../api/synchronization.js');
    const makeResponse = () => ({
      statusCode: 200,
      setHeader() {},
      end(raw) { this.body = JSON.parse(raw); },
    });
    const chatResponse = makeResponse();
    await handler({ query: { action: 'movie-chat' }, method: 'GET', body: {}, headers: {} }, chatResponse);
    assert.equal(chatResponse.statusCode, 405);
    assert.equal(chatResponse.body.data.message, 'Method not allowed.');

    const syncResponse = makeResponse();
    await handler({ query: {}, method: 'POST', body: {}, headers: {} }, syncResponse);
    assert.equal(syncResponse.statusCode, 401);
  } finally {
    for (const [name, value] of Object.entries({
      GOOGLE_CLIENT_ID: previous.clientId,
      GOOGLE_ALLOWED_EMAILS: previous.emails,
      GOOGLE_SESSION_SECRET: previous.secret,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
