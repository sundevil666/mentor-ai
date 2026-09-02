import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isCloudReadingTranscriptionConfigured, transcribeReadingAudio } from '../dist/services/reading-transcription.service.js';

describe('online reader transcription', () => {
  it('requires both server-only Cloudflare credentials', () => {
    assert.equal(isCloudReadingTranscriptionConfigured({ accountId: 'account', apiToken: 'token' }), true);
    assert.equal(isCloudReadingTranscriptionConfigured({ accountId: 'account' }), false);
  });

  it('sends audio and nearby book context to Cloudflare Whisper', async () => {
    const originalFetch = globalThis.fetch;
    let request;
    globalThis.fetch = async (url, init) => {
      request = { url: String(url), init };
      return new Response(JSON.stringify({ success: true, result: { text: '  Tell me what happened.  ' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    try {
      const result = await transcribeReadingAudio(
        Buffer.from('fake wav').toString('base64'),
        'Tell me what happened before the next sentence.',
        { accountId: 'account-id', apiToken: 'secret-token' },
      );
      assert.deepEqual(result, { text: 'Tell me what happened.' });
      assert.match(request.url, /accounts\/account-id\/ai\/run\/@cf\/openai\/whisper-large-v3-turbo$/);
      assert.equal(request.init.headers.Authorization, 'Bearer secret-token');
      const body = JSON.parse(request.init.body);
      assert.equal(body.initial_prompt, 'Tell me what happened before the next sentence.');
      assert.deepEqual(body.audio, Array.from(Buffer.from('fake wav')));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
