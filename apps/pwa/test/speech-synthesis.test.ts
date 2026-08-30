import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applySpeechRepeat,
  parseSpeechSegments,
  preserveDialogueSpeakerLabels,
  selectSpeechCacheUrlsToDelete,
  speechCacheMaxAgeMs,
  speechCacheMaxEntries,
  splitSpeechTextIntoSentences,
} from '../src/services/speech-synthesis.js';

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

  it('keeps the speaker voice when dialogue is cached one sentence at a time', () => {
    assert.deepEqual(parseSpeechSegments('Tom: I start work at seven.'), [
      { text: 'I start work at seven.', voice: 'tom' },
    ]);
  });

  it('keeps the same speaker for every sentence in a multi-sentence turn', () => {
    const dialogue = 'Mia: Good afternoon. Can I help you?\nTom: By bus. Could you send me the address again, please?';

    assert.deepEqual(splitSpeechTextIntoSentences(dialogue), [
      'Mia: Good afternoon.',
      'Mia: Can I help you?',
      'Tom: By bus.',
      'Tom: Could you send me the address again, please?',
    ]);
    assert.deepEqual(parseSpeechSegments(preserveDialogueSpeakerLabels(dialogue)), [
      { text: 'Good afternoon.', voice: 'mia' },
      { text: 'Can I help you?', voice: 'mia' },
      { text: 'By bus.', voice: 'tom' },
      { text: 'Could you send me the address again, please?', voice: 'tom' },
    ]);
  });

  it('uses the native media loop for repeat playback behind a locked screen', () => {
    const audio = { loop: false };

    applySpeechRepeat(audio, true);

    assert.equal(audio.loop, true);
  });

  it('expires old speech and keeps only the newest cache entries', () => {
    const now = Date.parse('2026-08-30T12:00:00.000Z');
    const entries = [
      { url: 'old', createdAt: new Date(now - speechCacheMaxAgeMs).toISOString() },
      ...Array.from({ length: speechCacheMaxEntries + 1 }, (_, index) => ({
        url: `fresh-${index}`,
        createdAt: new Date(now - (speechCacheMaxEntries - index) * 1_000).toISOString(),
      })),
    ];
    assert.deepEqual(selectSpeechCacheUrlsToDelete(entries, now), ['old', 'fresh-0']);
  });
});
