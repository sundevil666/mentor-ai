import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  findLastNumberIndex,
  getSentenceStartWordIndexes,
  normalizeListeningSentence,
  tokenizeListeningText,
} from '../src/services/dashboard-listening.js';

describe('dashboard listening helpers', () => {
  it('keeps word offsets and sentence boundaries stable', () => {
    const tokens = tokenizeListeningText('Hello there.  How are you?');
    assert.deepEqual(tokens.map(({ word, trailing }) => ({ word, trailing })), [
      { word: 'Hello', trailing: ' ' },
      { word: 'there.', trailing: '  ' },
      { word: 'How', trailing: ' ' },
      { word: 'are', trailing: ' ' },
      { word: 'you?', trailing: '' },
    ]);
    assert.deepEqual(getSentenceStartWordIndexes(tokens), [0, 2]);
  });

  it('normalizes translation keys and finds the last available boundary', () => {
    assert.equal(normalizeListeningSentence('  Mia:   Hello. '), 'mia: hello.');
    assert.equal(findLastNumberIndex([0, 3, 8], 5), 1);
    assert.equal(findLastNumberIndex([3, 8], 1), -1);
  });
});
