import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { collectSpeechAudio } from '../dist/routes/speech.routes.js';

describe('speech audio collection', () => {
  it('joins only non-empty audio chunks in stream order', async () => {
    async function* chunks() {
      yield { type: 'WordBoundary', data: new Uint8Array([9]) };
      yield { type: 'audio', data: new Uint8Array([1, 2]) };
      yield { type: 'audio', data: new Uint8Array() };
      yield { type: 'audio', data: new Uint8Array([3]) };
    }

    assert.deepEqual(await collectSpeechAudio(chunks()), Buffer.from([1, 2, 3]));
  });

  it('rejects a completed stream that contains no audio', async () => {
    async function* chunks() {
      yield { type: 'WordBoundary' };
    }

    await assert.rejects(collectSpeechAudio(chunks()), /returned no audio/);
  });
});
