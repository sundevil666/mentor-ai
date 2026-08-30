import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { alignReadingSpeech, boundTabletReadingProgress, tokenizeReadingSpeech } from '../src/services/reading-speech-tracker.js';
import { normalizeReadingAudio } from '../src/services/local-reading-transcriber.js';

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

  it('trims a repeated-word match that jumps into an unread tablet sentence', () => {
    const bounded = boundTabletReadingProgress([15956, 15957, 15958, 15959, 15960, 15961, 15962, 15977], 15955, 9);
    assert.deepEqual(bounded, [15956, 15957, 15958, 15959, 15960, 15961, 15962]);
  });

  it('keeps a coherent longer tablet phrase even when recognition starts ahead of the old anchor', () => {
    const coherent = Array.from({ length: 18 }, (_, index) => 15937 + index);
    assert.deepEqual(boundTabletReadingProgress(coherent, 15914, 15), coherent);
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
});
