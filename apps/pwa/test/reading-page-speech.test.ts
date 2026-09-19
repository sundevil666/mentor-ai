import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ReadingPageSpeech } from '../src/services/reading-page-speech.js';

describe('page speech matching', () => {
  it('uses repeated words in reading order without accepting a single word ahead', () => {
    const page = new ReadingPageSpeech(2, [
      { index: 20, text: 'The' }, { index: 21, text: 'cat' },
      { index: 22, text: 'the' }, { index: 23, text: 'cat' },
    ]);
    assert.equal(page.attempted, false);
    assert.deepEqual(page.match('cat'), []);
    assert.equal(page.attempted, true);
    assert.deepEqual(page.match('The cat the cat'), [20, 21, 22, 23]);
    assert.deepEqual(page.match('cat'), []);
    assert.deepEqual(page.summary(), { pageIndex: 2, totalWords: 4, correctWords: 4, missedWords: [] });
  });

  it('never highlights a lone matching word later on the page', () => {
    const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'].map((text, index) => ({ index, text }));
    const page = new ReadingPageSpeech(0, words);
    assert.deepEqual(page.preview('seven'), []);
    assert.deepEqual(page.match('seven'), []);
    assert.equal(page.nextIndex, 0);
    assert.deepEqual(page.match('one two three'), [0, 1, 2]);
    assert.deepEqual(page.match('seven'), []);
    assert.deepEqual(page.match('four five six seven'), [3, 4, 5, 6]);
  });

  it('recovers only a consecutive pair after a tiny skipped gap', () => {
    const page = new ReadingPageSpeech(1, [
      { index: 10, text: 'one' }, { index: 11, text: 'two' }, { index: 12, text: 'three' },
    ]);
    assert.deepEqual(page.match('four'), []);
    assert.deepEqual(page.match('two'), []);
    assert.deepEqual(page.match('three'), [11, 12]);
    assert.deepEqual(page.summary(), {
      pageIndex: 1, totalWords: 3, correctWords: 2,
      missedWords: [{ index: 10, word: 'one' }],
    });
    const next = new ReadingPageSpeech(2, [{ index: 13, text: 'three' }]);
    assert.deepEqual(next.match('three'), [13]);
    assert.equal(next.nextIndex, 14);
  });

  it('previews without consuming and resumes from a compact summary', () => {
    const words = [{ index: 0, text: 'I' }, { index: 1, text: 'see' }, { index: 2, text: 'I' }];
    const page = new ReadingPageSpeech(0, words);
    assert.deepEqual(page.preview('I I'), [0]);
    assert.deepEqual(page.match('I'), [0]);
    const summary = page.summary();
    const missed = new Set(summary.missedWords.map((word) => word.index));
    const restored = new ReadingPageSpeech(0, words, words.filter((word) => !missed.has(word.index)).map((word) => word.index));
    assert.deepEqual(restored.match('I'), []);
    assert.deepEqual(restored.match('see I'), [1, 2]);
  });
});
