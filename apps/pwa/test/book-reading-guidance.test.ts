import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BookDifficultyAssessment } from '@mentor-ai/shared';
import { applyReadingReview, isBookDifficultyReviewDue, recommendNextFreeBook } from '../src/services/book-reading-guidance.js';

const assessment: BookDifficultyAssessment = {
  version: 1, recommendation: 'read', score: 46, confidence: 'low', sampledWords: 1000,
  personalEvidenceCount: 0, reasons: ['Text estimate.'], analyzedAt: '2026-09-01T00:00:00.000Z',
};

describe('book reading guidance', () => {
  it('schedules a review after one week', () => {
    assert.equal(isBookDifficultyReviewDue(assessment, new Date('2026-09-07T23:59:59.000Z')), false);
    assert.equal(isBookDifficultyReviewDue(assessment, new Date('2026-09-08T00:00:00.000Z')), true);
  });

  it('moves a self-rated very hard book to rewriting', () => {
    const result = applyReadingReview(assessment, { progressRatio: 0.03, rating: 'very-hard', now: '2026-09-08T00:00:00.000Z' });
    assert.equal(result.recommendation, 'rewrite');
    assert.equal(result.readerRating, 'very-hard');
    assert.equal(result.confidence, 'high');
  });

  it('lets an explicit comfortable rating override a pessimistic text estimate', () => {
    const result = applyReadingReview({ ...assessment, score: 82, initialScore: 82 }, {
      progressRatio: 0.2, rating: 'comfortable', now: '2026-09-08T00:00:00.000Z',
    });
    assert.equal(result.recommendation, 'read');
  });

  it('detects a started book with no weekly progress as stalled', () => {
    const result = applyReadingReview({ ...assessment, lastReviewedProgressRatio: 0.2 }, {
      progressRatio: 0.2, lastProgressAt: '2026-09-01T00:00:00.000Z', now: '2026-09-10T00:00:00.000Z',
    });
    assert.equal(result.readingState, 'stalled');
    assert.ok(result.reasons.some((reason) => reason.includes('stalled')));
  });

  it('recommends a free next book close to a slightly higher difficulty', () => {
    const result = recommendNextFreeBook(38, ['The Wonderful Wizard of Oz']);
    assert.equal(result.title, 'The Secret Garden');
    assert.match(result.url, /^https:\/\/www\.gutenberg\.org\/ebooks\//);
  });
});
