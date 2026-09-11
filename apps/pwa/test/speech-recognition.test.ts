import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  collectSpeechRecognitionResult,
  startContinuousSpeechRecognition,
  shouldRestartSpeechRecognition,
  speechRecognitionErrorMessage,
} from '../src/services/speech-recognition.js';

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

  it('restarts after an empty premature end but respects stop and timeout', () => {
    assert.equal(shouldRestartSpeechRecognition(false, false, 200, 15_000), true);
    assert.equal(shouldRestartSpeechRecognition(true, false, 200, 15_000), false);
    assert.equal(shouldRestartSpeechRecognition(false, true, 200, 15_000), false);
    assert.equal(shouldRestartSpeechRecognition(false, false, 15_000, 15_000), false);
  });

  it('explains microphone and browser speech-service failures', () => {
    assert.match(speechRecognitionErrorMessage('not-allowed'), /Allow microphone access/);
    assert.match(speechRecognitionErrorMessage('audio-capture'), /working microphone/);
    assert.match(speechRecognitionErrorMessage('network'), /try Chrome/);
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

  it('detaches every callback and cancels a pending restart when stopped', () => {
    const originalWindow = globalThis.window;
    const instances: MockRecognition[] = [];
    const scheduled = new Map<number, () => void>();
    let nextTimer = 1;

    class MockRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      maxAlternatives = 0;
      onstart: (() => void) | null = null;
      onresult: ((event: { resultIndex?: number; results: ReturnType<typeof recognitionResults> }) => void) | null = null;
      onerror: ((event: never) => void) | null = null;
      onend: (() => void) | null = null;
      aborted = false;

      constructor() {
        instances.push(this);
      }

      start() {}
      stop() {}
      abort() { this.aborted = true; }
    }

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        SpeechRecognition: MockRecognition,
        setTimeout(callback: () => void) {
          const timer = nextTimer++;
          scheduled.set(timer, callback);
          return timer;
        },
        clearTimeout(timer: number) {
          scheduled.delete(timer);
        },
      },
    });

    try {
      const listening: boolean[] = [];
      const interim: string[] = [];
      const final: string[] = [];
      const controller = startContinuousSpeechRecognition({
        onInterim(value) { interim.push(value); },
        onFinal(value) { final.push(value); },
        onListeningChange(value) { listening.push(value); },
      });
      const first = instances[0]!;
      first.onstart?.();
      assert.deepEqual(listening, [true]);
      first.onresult?.({
        resultIndex: 0,
        results: recognitionResults([{ transcript: 'Alice was reading', confidence: 0.9, isFinal: true }]),
      });
      assert.deepEqual(final, ['Alice was reading']);
      assert.deepEqual(interim, []);

      first.onend?.();
      assert.equal(scheduled.size, 1);
      controller.stop();

      assert.equal(scheduled.size, 0);
      assert.equal(first.onstart, null);
      assert.equal(first.onresult, null);
      assert.equal(first.onerror, null);
      assert.equal(first.onend, null);
      assert.deepEqual(listening, [true, false, false]);
    } finally {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    }
  });
});
