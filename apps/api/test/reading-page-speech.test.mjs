import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sanitizeReadingPageSpeech } from '../dist/services/reading-page-speech.service.js';

const valid = { bookId: 'book-1', summary: { pageIndex: 3, totalWords: 3, correctWords: 1, missedWords: [{ index: 7, word: 'door' }, { index: 8, word: 'opened' }] } };

describe('reading page speech validation', () => {
  it('accepts counts with only the unconfirmed words', () => {
    assert.deepEqual(sanitizeReadingPageSpeech(valid), valid);
  });
  it('rejects inconsistent counts, duplicate positions, and oversized payloads', () => {
    assert.equal(sanitizeReadingPageSpeech({ ...valid, summary: { ...valid.summary, correctWords: 2 } }), null);
    assert.equal(sanitizeReadingPageSpeech({ ...valid, summary: { ...valid.summary, missedWords: [{ index: 7, word: 'door' }, { index: 7, word: 'door' }] } }), null);
    assert.equal(sanitizeReadingPageSpeech({ ...valid, bookId: 'x'.repeat(161) }), null);
  });
});
