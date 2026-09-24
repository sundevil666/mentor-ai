import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ReaderVocabularyItem, ReadingPage } from '@mentor-ai/shared';
import { assessBookDifficulty } from '../src/services/book-difficulty-assessment.js';

function page(text: string): ReadingPage {
  return { id: 'page', bookId: 'book', pageNumber: 1, text, wordCount: text.split(/\s+/).length };
}

describe('book difficulty assessment', () => {
  it('recommends fluent reading for simple narrative prose', () => {
    const result = assessBookDifficulty({
      pages: [page('I am at home. You are with me. We go out and have a good day. Then we come back home.')],
      vocabulary: [],
      now: '2026-09-24T00:00:00.000Z',
    });
    assert.equal(result.recommendation, 'read');
    assert.equal(result.confidence, 'low');
    assert.match(result.reasons.at(-1) ?? '', /relies mainly on the book text/);
  });

  it('recommends rewriting dense prose and includes personal difficulty evidence', () => {
    const hard = 'The epistemological incongruities proliferated through incomprehensible bureaucratization, metamorphosing simultaneously into counterintuitive anthropomorphic manifestations.';
    const vocabulary: ReaderVocabularyItem[] = [{
      id: 'reader-vocabulary:student:epistemological',
      studentId: 'student',
      bookId: 'older-book',
      text: 'epistemological',
      normalizedText: 'epistemological',
      kind: 'word',
      translation: '',
      lookupCount: 12,
      pronunciationCount: 2,
      firstLookedUpAt: '2026-09-01T00:00:00.000Z',
      lastLookedUpAt: '2026-09-24T00:00:00.000Z',
    }];
    const result = assessBookDifficulty({ pages: [page(hard)], vocabulary });
    assert.equal(result.recommendation, 'rewrite');
    assert.equal(result.confidence, 'medium');
    assert.ok(result.reasons.some((reason) => reason.includes('match vocabulary')));
  });

  it('uses existing page-reading misses when an old book is analyzed again', () => {
    const text = Array.from({ length: 100 }, () => 'time').join(' ');
    const result = assessBookDifficulty({
      pages: [page(text)],
      vocabulary: [],
      pageSpeech: {
        0: { pageIndex: 0, totalWords: 100, correctWords: 55, missedWords: Array.from({ length: 45 }, (_, index) => ({ index, word: 'time' })) },
      },
    });
    assert.equal(result.confidence, 'medium');
    assert.ok(result.score >= 40);
    assert.ok(result.reasons.some((reason) => reason.includes('45 missed words')));
  });
});
