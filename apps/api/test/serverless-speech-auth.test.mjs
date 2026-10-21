import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createRequire } from 'node:module';

it('rejects anonymous paid speech requests before reading the body or calling the provider', async () => {
  process.env.GOOGLE_CLIENT_ID = 'speech-test-client';
  process.env.GOOGLE_ALLOWED_EMAILS = 'speech-test@example.com';
  process.env.GOOGLE_SESSION_SECRET = 'speech-test-session-secret-at-least-32-characters';
  const require = createRequire(import.meta.url);
  const speech = require('../../../api/speech.js');
  let body;
  const response = {
    statusCode: 0,
    setHeader() {},
    end(value) { body = value; },
  };
  await speech({ method: 'POST', headers: {}, on() { throw new Error('Must reject before reading the body'); } }, response);
  assert.equal(response.statusCode, 401);
  assert.match(body, /sign-in is required/);
});

it('does not repeat provider rate-limit errors and returns a retry delay', async () => {
  const require = createRequire(import.meta.url);
  const https = require('node:https');
  const { EventEmitter } = require('node:events');
  const original = https.request;
  const originalConsoleError = console.error;
  process.env.GOOGLE_CLIENT_ID = '';
  process.env.OPENAI_API_KEY = 'test-only-placeholder';
  let requests = 0;
  https.request = (_options, callback) => {
    requests++;
    const request = new EventEmitter();
    request.end = () => queueMicrotask(() => {
      const response = new EventEmitter();
      response.statusCode = 429;
      callback(response);
      response.emit('data', Buffer.from('rate limited'));
      response.emit('end');
    });
    return request;
  };
  const headers = {};
  const response = { statusCode: 0, setHeader(name, value) { headers[name] = value; }, end() {} };
  try {
    console.error = () => {};
    await require('../../../api/speech.js')({ method: 'POST', headers: {}, body: { segments: [{ text: 'Hello.', voice: 'mia' }] } }, response);
    assert.equal(requests, 1);
    assert.equal(response.statusCode, 429);
    assert.equal(headers['Retry-After'], '60');
  } finally {
    https.request = original;
    console.error = originalConsoleError;
  }
});
