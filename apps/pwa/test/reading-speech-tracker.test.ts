import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { alignReadingSpeech, tokenizeReadingSpeech } from '../src/services/reading-speech-tracker.js';

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
});
