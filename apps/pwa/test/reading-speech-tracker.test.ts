import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { alignReadingSpeech, boundTabletReadingProgress, confirmTabletReadingWordIndexes, tokenizeReadingSpeech } from '../src/services/reading-speech-tracker.js';
import { normalizeReadingAudio, startLocalReadingTranscriber } from '../src/services/local-reading-transcriber.js';

const reference = tokenizeReadingSpeech('Alice was beginning to get very tired of sitting by her sister on the bank. She read the sentence again because practice matters.');

describe('reading speech tracking', () => {
  it('aligns an imperfect phrase with nearby book text', () => {
    const result = alignReadingSpeech(reference, 'Alice was beginning get very tired sitting by her sister', 0);
    assert.equal(result.accepted, true);
    assert.ok(result.coverage >= 0.7);
    assert.deepEqual(result.matchedWordIndexes.slice(0, 3), [0, 1, 2]);
  });

  it('keeps enough backward context for rereading a sentence', () => {
    const first = alignReadingSpeech(reference, 'she read the sentence again because practice matters', 10);
    const repeated = alignReadingSpeech(reference, 'she read sentence again because practice matters', first.anchorIndex);
    assert.equal(first.accepted, true);
    assert.equal(repeated.accepted, true);
    assert.equal(repeated.matchedWordIndexes[0], first.matchedWordIndexes[0]);
    assert.equal(repeated.matchedWordIndexes.at(-1), first.matchedWordIndexes.at(-1));
    assert.ok(repeated.matchedWordIndexes.every((index) => first.matchedWordIndexes.includes(index)));
  });

  it('rejects unrelated background speech and short accidental matches', () => {
    assert.equal(alignReadingSpeech(reference, 'turn the television down in the kitchen', 0).accepted, false);
    assert.equal(alignReadingSpeech(reference, 'Alice was', 0).accepted, false);
  });

  it('does not jump to repeated words far ahead of the reading position', () => {
    const repeatedWords = tokenizeReadingSpeech([
      'we are reading this page together',
      ...Array.from({ length: 80 }, (_, index) => `filler${index}`),
      'the old house now is quiet',
    ].join(' '));
    const result = alignReadingSpeech(repeatedWords, 'the old house now is quiet', 0);

    assert.equal(result.accepted, false);
  });

  it('allows the browser recognizer to recover from a wider visible-page offset', () => {
    const browserReference = tokenizeReadingSpeech([
      ...Array.from({ length: 40 }, (_, index) => `filler${index}`),
      'the browser finds this exact spoken sentence',
    ].join(' '));

    assert.equal(alignReadingSpeech(browserReference, 'the browser finds this exact spoken sentence', 0).accepted, false);
    assert.equal(alignReadingSpeech(browserReference, 'the browser finds this exact spoken sentence', 0, { maxForwardWords: 360 }).accepted, true);
  });

  it('accepts a partially accurate nearby tablet transcript without relaxing browser matching', () => {
    const tabletReference = tokenizeReadingSpeech('one two three four five six seven eight');
    const imperfectTranscript = 'one two unclear words five six wrong sounds';

    assert.equal(alignReadingSpeech(tabletReference, imperfectTranscript, 0).accepted, false);
    assert.equal(alignReadingSpeech(tabletReference, imperfectTranscript, 0, { minCoverage: 0.45 }).accepted, true);
  });

  it('accepts three nearby tablet matches out of seven recognized words', () => {
    const tabletReference = tokenizeReadingSpeech('the dog begins to bark and the reply comes almost immediately');
    const noisyTranscript = 'the dog unclear sounds reply wrong noise';

    assert.equal(alignReadingSpeech(tabletReference, noisyTranscript, 0, { minCoverage: 0.45 }).accepted, false);
    assert.equal(alignReadingSpeech(tabletReference, noisyTranscript, 0, { minCoverage: 0.4 }).accepted, true);
  });

  it('accepts a high-confidence tablet phrase spread by omitted book words', () => {
    const tabletReference = tokenizeReadingSpeech('start I a b finish c d the e f last g h bites i j of k l my m n sandwich o p just q r as s t Camila u v finishes w x hers today');
    const result = alignReadingSpeech(tabletReference, 'I finish the last bites of my sandwich just as Camila finishes hers', 1, { minCoverage: 0.4 });

    assert.equal(result.coverage, 1);
    assert.equal(result.accepted, true);
    assert.deepEqual(result.matchedWordIndexes, [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37]);
  });

  it('trims a repeated-word match that jumps into an unread tablet sentence', () => {
    const bounded = boundTabletReadingProgress([15956, 15957, 15958, 15959, 15960, 15961, 15962, 15977], 15955, 9);
    assert.deepEqual(bounded, [15956, 15957, 15958, 15959, 15960, 15961, 15962]);
  });

  it('keeps a coherent longer tablet phrase even when recognition starts ahead of the old anchor', () => {
    const coherent = Array.from({ length: 18 }, (_, index) => 15937 + index);
    assert.deepEqual(boundTabletReadingProgress(coherent, 15914, 15), coherent);
  });

  it('rejects the far-backward false match observed in the tablet log', () => {
    assert.deepEqual(boundTabletReadingProgress([36081, 36082, 36083], 36309, 8), []);
  });

  it('recovers one or two words lost at a chunk boundary', () => {
    assert.deepEqual(confirmTabletReadingWordIndexes([36197, 36198, 36199, 36200], 36195, 15), [36195, 36196, 36197, 36198, 36199, 36200]);
  });

  it('recovers tiny internal holes but leaves larger skipped ranges uncredited', () => {
    assert.deepEqual(confirmTabletReadingWordIndexes([10, 11, 13, 16, 20], 10, 9), [10, 11, 12, 13, 14, 15, 16, 20]);
  });
});

describe('tablet reading audio preparation', () => {
  it('amplifies a quiet speech signal without clipping it', () => {
    const input = Float32Array.from([0.01, -0.02, 0.015, -0.01]);
    const result = normalizeReadingAudio(input);
    assert.equal(result.usable, true);
    assert.ok(result.gain > 1);
    assert.ok(Math.max(...Array.from(result.audio, Math.abs)) <= 0.95);
  });

  it('does not send near-silence to Whisper as speech', () => {
    const result = normalizeReadingAudio(Float32Array.from([0.0001, -0.0002, 0.0001]));
    assert.equal(result.usable, false);
    assert.equal(result.gain, 1);
  });

  it('keeps the loaded Whisper worker ready across pause and restart', async () => {
    const originalWorker = globalThis.Worker;
    const originalWindow = globalThis.window;
    let workerCount = 0;
    let initializationCount = 0;
    const fakeWorkers: FakeWorker[] = [];
    class FakeWorker {
      onmessage: ((event: MessageEvent<{ type: string }>) => void) | null = null;
      constructor() {
        workerCount += 1;
        fakeWorkers.push(this);
      }
      postMessage(message: { type?: string }) {
        if (message.type !== 'init') return;
        initializationCount += 1;
        queueMicrotask(() => this.onmessage?.({ data: { type: 'ready' } } as MessageEvent<{ type: string }>));
      }
      terminate() { /* The shared ready worker must not be terminated on pause. */ }
    }
    Object.assign(globalThis, {
      Worker: FakeWorker,
      window: { setTimeout, clearTimeout },
    });
    const stream = { active: false } as MediaStream;
    let readyCount = 0;
    let transcriptCount = 0;
    const options = {
      onTranscript: () => { transcriptCount += 1; },
      onReady: () => { readyCount += 1; },
      onProgress: () => undefined,
      onError: (message: string) => assert.fail(message),
    };
    try {
      const first = startLocalReadingTranscriber(stream, options);
      await new Promise((resolve) => setTimeout(resolve, 0));
      first.stop();
      const second = startLocalReadingTranscriber(stream, options);
      await new Promise((resolve) => setTimeout(resolve, 0));
      second.stop();
      assert.equal(workerCount, 1);
      assert.equal(initializationCount, 1);
      assert.equal(readyCount, 2);
      fakeWorkers[0]!.onmessage?.({ data: { type: 'result', id: 1, text: 'final partial words' } } as unknown as MessageEvent<{ type: string }>);
      assert.equal(transcriptCount, 1);
    } finally {
      Object.assign(globalThis, { Worker: originalWorker, window: originalWindow });
    }
  });
});
