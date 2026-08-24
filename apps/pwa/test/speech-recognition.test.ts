import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { collectSpeechRecognitionResult } from '../src/services/speech-recognition.js';

function recognitionResults(
  entries: Array<{ transcript: string; confidence: number; isFinal?: boolean }>,
) {
  return Object.assign(
    entries.map((entry) => ({
      0: { transcript: entry.transcript, confidence: entry.confidence },
      isFinal: entry.isFinal ?? false,
      length: 1,
    })),
    { length: entries.length },
  );
}

describe('speech recognition results', () => {
  it('keeps every recognized phrase instead of only the last fragment', () => {
    const result = collectSpeechRecognitionResult(
      recognitionResults([
        { transcript: '  I would like ', confidence: 0.72, isFinal: true },
        { transcript: 'to repeat the question', confidence: 0.91 },
      ]),
    );

    assert.deepEqual(result, {
      transcript: 'I would like to repeat the question',
      confidence: 0.91,
    });
  });

  it('ignores empty fragments and normalizes extra spaces', () => {
    const result = collectSpeechRecognitionResult(
      recognitionResults([
        { transcript: '', confidence: 0 },
        { transcript: 'please   repeat', confidence: 0.8 },
      ]),
    );

    assert.equal(result.transcript, 'please repeat');
  });
});
