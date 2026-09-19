import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ReadingPageSpeech } from '../src/services/reading-page-speech.js';

describe('page speech matching', () => {
  it('marks the first unused occurrence once per spoken word', () => {
    const page = new ReadingPageSpeech(2, [
      { index: 20, text: 'The' }, { index: 21, text: 'cat' },
      { index: 22, text: 'the' }, { index: 23, text: 'cat' },
    ]);
    assert.deepEqual(page.match('cat'), [21]);
    assert.deepEqual(page.match('cat'), [23]);
    assert.deepEqual(page.match('cat'), []);
    assert.deepEqual(page.match('the the'), [20, 22]);
    assert.deepEqual(page.summary(), { pageIndex: 2, totalWords: 4, correctWords: 4, missedWords: [] });
  });

  it('ignores words outside the page and records only misses and totals', () => {
    const page = new ReadingPageSpeech(1, [
      { index: 10, text: 'one' }, { index: 11, text: 'two' }, { index: 12, text: 'three' },
    ]);
    assert.deepEqual(page.match('four three wrong'), [12]);
    assert.deepEqual(page.summary(), {
      pageIndex: 1, totalWords: 3, correctWords: 1,
      missedWords: [{ index: 10, word: 'one' }, { index: 11, word: 'two' }],
    });
    const next = new ReadingPageSpeech(2, [{ index: 13, text: 'three' }]);
    assert.deepEqual(next.match('three'), [13]);
    assert.equal(next.nextIndex, 14);
  });

  it('previews without consuming and resumes from a compact summary', () => {
    const words = [{ index: 0, text: 'I' }, { index: 1, text: 'see' }, { index: 2, text: 'I' }];
    const page = new ReadingPageSpeech(0, words);
    assert.deepEqual(page.preview('I I'), [0, 2]);
    assert.deepEqual(page.match('I'), [0]);
    const summary = page.summary();
    const missed = new Set(summary.missedWords.map((word) => word.index));
    const restored = new ReadingPageSpeech(0, words, words.filter((word) => !missed.has(word.index)).map((word) => word.index));
    assert.deepEqual(restored.match('I'), [2]);
  });
});
