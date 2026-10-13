import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { synthesizeSpeechSegments } from '../dist/routes/speech.routes.js';

describe('speech synthesis', () => {
  it('requests each voice in order and joins the returned MP3 audio', async () => {
    const requests = [];
    const request = async (_url, init) => {
      requests.push(JSON.parse(init.body));
      return new Response(new Uint8Array([requests.length]));
    };

    const audio = await synthesizeSpeechSegments([
      { text: 'Hello.', voice: 'mia' },
      { text: 'Hi.', voice: 'tom' },
    ], request);

    assert.deepEqual(audio, Buffer.from([1, 2]));
    assert.deepEqual(requests.map(({ model, voice, input }) => ({ model, voice, input })), [
      { model: 'gpt-4o-mini-tts', voice: 'coral', input: 'Hello.' },
      { model: 'gpt-4o-mini-tts', voice: 'echo', input: 'Hi.' },
    ]);
  });

  it('rejects a provider error instead of returning incomplete lesson audio', async () => {
    const request = async () => new Response('failed', { status: 503 });
    await assert.rejects(
      synthesizeSpeechSegments([{ text: 'Hello.', voice: 'mia' }], request),
      /HTTP 503/,
    );
  });
});
