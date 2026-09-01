import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applySpeechRepeat,
  parseSpeechSegments,
  preserveDialogueSpeakerLabels,
  selectEnglishSystemVoice,
  selectSpeechCacheUrlsToDelete,
  speechCacheMaxAgeMs,
  speechCacheMaxEntries,
  splitSpeechTextIntoSentences,
  speakWithSystemVoice,
} from '../src/services/speech-synthesis.js';

describe('speech synthesis voices', () => {
  it('prefers a natural US English system voice for instant word pronunciation', () => {
    const voices = [
      { lang: 'en-GB', name: 'Daniel' },
      { lang: 'en-US', name: 'Generic English' },
      { lang: 'en-US', name: 'Samantha' },
    ] as SpeechSynthesisVoice[];
    assert.equal(selectEnglishSystemVoice(voices)?.name, 'Samantha');
  });

  it('reports system pronunciation only after the platform really starts it', () => {
    const originalWindow = globalThis.window;
    const OriginalUtterance = globalThis.SpeechSynthesisUtterance;
    let utterance: {
      onstart?: () => void;
      onend?: () => void;
      onerror?: () => void;
      lang: string;
      rate: number;
      voice: SpeechSynthesisVoice | null;
    } | undefined;
    let started = 0;
    let failed = 0;
    let resumed = 0;
    class FakeUtterance {
      onstart?: () => void;
      onend?: () => void;
      onerror?: () => void;
      lang = '';
      rate = 1;
      voice: SpeechSynthesisVoice | null = null;
      constructor(readonly text: string) {}
    }
    const speechSynthesis = {
      cancel: () => undefined,
      getVoices: () => [],
      resume: () => { resumed += 1; },
      speak: (value: FakeUtterance) => { utterance = value; },
    };
    Object.assign(globalThis, {
      window: { speechSynthesis },
      SpeechSynthesisUtterance: FakeUtterance,
    });
    try {
      assert.equal(speakWithSystemVoice('hello', { onStart: () => { started += 1; }, onError: () => { failed += 1; } }), true);
      assert.equal(started, 0);
      assert.equal(resumed, 1);
      utterance?.onstart?.();
      assert.equal(started, 1);
      utterance?.onerror?.();
      assert.equal(failed, 1);
    } finally {
      Object.assign(globalThis, { window: originalWindow, SpeechSynthesisUtterance: OriginalUtterance });
    }
  });

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
