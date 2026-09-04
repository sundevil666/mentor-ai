import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { beginReaderLookupInteraction, shouldProcessReadingTranscript } from '../src/services/reader-lookup-interaction.js';

describe('reader lookup interaction', () => {
  it('reveals and starts a tapped word without waiting for the microphone final chunk', async () => {
    const events: string[] = [];
    let finishLookup!: () => void;
    const lookupFinished = new Promise<void>((resolve) => { finishLookup = resolve; });
    const interaction = beginReaderLookupInteraction({
      revealSelection: () => events.push('word-visible'),
      suppressListening: () => events.push('listening-suppressed'),
      pronounce: () => events.push('pronunciation-started'),
      lookup: () => {
        events.push('translation-started');
        return lookupFinished;
      },
    });

    assert.deepEqual(events, ['word-visible', 'listening-suppressed', 'pronunciation-started', 'translation-started']);
    finishLookup();
    await interaction;
  });

  it('starts phrase translation immediately without automatic pronunciation', async () => {
    const events: string[] = [];
    await beginReaderLookupInteraction({
      revealSelection: () => events.push('phrase-visible'),
      suppressListening: () => events.push('listening-suppressed'),
      lookup: async () => { events.push('translation-started'); },
    });
    assert.deepEqual(events, ['phrase-visible', 'listening-suppressed', 'translation-started']);
  });

  it('gates recognition results while translation is in progress', () => {
    assert.equal(shouldProcessReadingTranscript(true), false);
    assert.equal(shouldProcessReadingTranscript(false), true);
  });
});
