import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseSpeechSegments } from '../src/services/speech-synthesis.js';

describe('speech synthesis voices', () => {
  it('uses Mia for ordinary text', () => {
    assert.deepEqual(parseSpeechSegments('Where are you?'), [
      { text: 'Where are you?', voice: 'mia' },
    ]);
  });

  it('assigns Mia and Tom to their dialogue lines', () => {
    assert.deepEqual(parseSpeechSegments('Mia: Hello, Tom.\nTom: Hello, Mia.'), [
      { text: 'Hello, Tom.', voice: 'mia' },
      { text: 'Hello, Mia.', voice: 'tom' },
    ]);
  });
});
