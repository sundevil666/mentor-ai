import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BookDifficultyAssessment } from '@mentor-ai/shared';
import { applyReadingReview, isBookDifficultyReviewDue, preserveBookLaneOnDifficultyCheck, recommendNextFreeBook } from '../src/services/book-reading-guidance.js';

const assessment: BookDifficultyAssessment = {
  version: 1, recommendation: 'read', score: 46, confidence: 'low', sampledWords: 1000,
  personalEvidenceCount: 0, reasons: ['Text estimate.'], analyzedAt: '2026-09-01T00:00:00.000Z',
};

describe('book reading guidance', () => {
  it('schedules a review after one week', () => {
    assert.equal(isBookDifficultyReviewDue(assessment, new Date('2026-09-07T23:59:59.000Z')), false);
    assert.equal(isBookDifficultyReviewDue(assessment, new Date('2026-09-08T00:00:00.000Z')), true);
  });

  it('moves only an unbearable book to rewriting without changing its text score', () => {
    const result = applyReadingReview(assessment, { progressRatio: 0.03, rating: 'very-hard', now: '2026-09-08T00:00:00.000Z' });
    assert.equal(result.recommendation, 'rewrite');
    assert.equal(result.readerRating, 'very-hard');
    assert.equal(result.score, assessment.score);
    assert.equal(result.confidence, assessment.confidence);
  });

  it('keeps a personal rating separate from the objective text estimate', () => {
    const result = applyReadingReview({ ...assessment, score: 82, initialScore: 82 }, {
      progressRatio: 0.2, rating: 'comfortable', now: '2026-09-08T00:00:00.000Z',
    });
    assert.equal(result.recommendation, 'read');
    assert.equal(result.score, 82);
  });

  it('keeps a hard but manageable book in reading', () => {
    const result = applyReadingReview(assessment, { progressRatio: 0.1, rating: 'hard', now: '2026-09-08T00:00:00.000Z' });
    assert.equal(result.recommendation, 'read');
    assert.equal(result.score, assessment.score);
    assert.notEqual(result.reasons, assessment.reasons);
  });

  it('detects a started book with no weekly progress as stalled', () => {
    const result = applyReadingReview({ ...assessment, lastReviewedProgressRatio: 0.2 }, {
      progressRatio: 0.2, lastProgressAt: '2026-09-01T00:00:00.000Z', now: '2026-09-10T00:00:00.000Z',
    });
    assert.equal(result.readingState, 'stalled');
    assert.deepEqual(result.reasons, assessment.reasons);
  });

  it('recommends a free next book close to a slightly higher difficulty', () => {
    const result = recommendNextFreeBook(38, ['The Wonderful Wizard of Oz']);
    assert.ok(result);
    assert.equal(result.title, 'The Secret Garden');
    assert.match(result.url, /^https:\/\/www\.gutenberg\.org\/ebooks\//);
  });

  it('removes an imported recommendation even when title punctuation differs', () => {
    const result = recommendNextFreeBook(57, ['Pride & Prejudice']);
    assert.ok(result);
    assert.notEqual(result.title, 'Pride and Prejudice');
  });

  it('returns no recommendation when every catalog book is already imported', () => {
    const result = recommendNextFreeBook(40, [
      "Alice's Adventures in Wonderland", 'The Wonderful Wizard of Oz', 'The Secret Garden',
      'The Adventures of Sherlock Holmes', 'Pride and Prejudice',
    ]);
    assert.equal(result, null);
  });

  it('does not move a book when the user only checks its difficulty again', () => {
    const machineResult = { ...assessment, recommendation: 'rewrite' as const, score: 72 };
    assert.equal(preserveBookLaneOnDifficultyCheck(machineResult, 'read', false).recommendation, 'read');
    assert.equal(preserveBookLaneOnDifficultyCheck(machineResult, 'read', true).recommendation, 'rewrite');
  });
});
