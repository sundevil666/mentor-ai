import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clampProgressRatio,
  formatBookPartLabel,
  splitBookParagraphs,
  tokenizeReaderParagraph,
} from '../src/services/reader-settings.js';

describe('reader presentation helpers', () => {
  it('formats chapters without repeating generic part labels', () => {
    assert.equal(formatBookPartLabel(0, 'Part 1'), '1. Part');
    assert.equal(formatBookPartLabel(1, 'A New Journey'), '2. A New Journey');
  });

  it('tokenizes readable words and clamps persisted progress', () => {
    assert.deepEqual(splitBookParagraphs('First\n\nSecond'), ['First', 'Second']);
    assert.deepEqual(tokenizeReaderParagraph("I'm ready.").map((token) => token.isWord), [
      true,
      false,
      true,
      false,
    ]);
    assert.equal(clampProgressRatio(1.4), 1);
    assert.equal(clampProgressRatio('invalid'), 0);
  });
});
