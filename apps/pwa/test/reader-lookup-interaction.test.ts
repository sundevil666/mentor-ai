import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { beginReaderLookupInteraction, shouldProcessLateReadingTranscript } from '../src/services/reader-lookup-interaction.js';

describe('reader lookup interaction', () => {
  it('reveals and starts a tapped word without waiting for the microphone final chunk', async () => {
    const events: string[] = [];
    let finishLookup!: () => void;
    const lookupFinished = new Promise<void>((resolve) => { finishLookup = resolve; });
    const interaction = beginReaderLookupInteraction({
      revealSelection: () => events.push('word-visible'),
      pauseListening: () => events.push('microphone-paused'),
      pronounce: () => events.push('pronunciation-started'),
      lookup: () => {
        events.push('translation-started');
        return lookupFinished;
      },
    });

    assert.deepEqual(events, ['word-visible', 'microphone-paused', 'pronunciation-started', 'translation-started']);
    finishLookup();
    await interaction;
  });

  it('starts phrase translation immediately without automatic pronunciation', async () => {
    const events: string[] = [];
    await beginReaderLookupInteraction({
      revealSelection: () => events.push('phrase-visible'),
      pauseListening: () => events.push('microphone-paused'),
      lookup: async () => { events.push('translation-started'); },
    });
    assert.deepEqual(events, ['phrase-visible', 'microphone-paused', 'translation-started']);
  });

  it('drops the recorder final transcript while translation is already in progress', () => {
    assert.equal(shouldProcessLateReadingTranscript(true), false);
    assert.equal(shouldProcessLateReadingTranscript(false), true);
  });
});
