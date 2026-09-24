import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContentProgress, PersonalReadingBook } from '@mentor-ai/shared';
import { personalBookAction, personalBookReadingStatus, sortPersonalBooksByActivity } from '../src/services/personal-book-status.js';

const book: PersonalReadingBook = {
  id: 'book', title: 'Book', level: 'unknown', language: 'en', sourceId: 'source', pageCount: 1,
  chapterCount: 1, wordCount: 100, importedAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-24T00:00:00.000Z',
  fileName: 'book.txt', format: 'txt', rightsConfirmed: true,
};

function progress(input: Partial<ContentProgress>): ContentProgress {
  return {
    id: 'reading:book', studentId: 'student', category: 'reading', contentId: 'book', position: 0,
    furthestPosition: 0, completed: false, sourceDeviceId: 'device', updatedAt: '2026-09-24T00:00:00.000Z',
    ...input,
  };
}

describe('personal book reading status', () => {
  it('keeps an untouched import new', () => assert.equal(personalBookReadingStatus(book, undefined), 'new'));
  it('marks an opened or advanced book as started', () => {
    assert.equal(personalBookReadingStatus({ ...book, lastOpenedAt: '2026-09-24T01:00:00.000Z' }, undefined), 'started');
    assert.equal(personalBookReadingStatus(book, progress({ furthestPosition: 12, duration: 100 })), 'started');
  });
  it('marks synchronized and local completion as finished', () => {
    assert.equal(personalBookReadingStatus(book, progress({ completed: true })), 'finished');
    assert.equal(personalBookReadingStatus(book, undefined, 1), 'finished');
  });

  it('separates read and rewrite recommendations while keeping unassessed books readable', () => {
    assert.equal(personalBookAction(book), 'read');
    assert.equal(personalBookAction({ ...book, difficultyAssessment: {
      version: 1, recommendation: 'rewrite', score: 80, confidence: 'medium', sampledWords: 100,
      personalEvidenceCount: 12, reasons: ['Dense text.'], analyzedAt: '2026-09-24T00:00:00.000Z',
    } }), 'rewrite');
  });

  it('puts the most recently started books first and finished books last', () => {
    const olderStarted = { ...book, id: 'older', lastOpenedAt: '2026-09-20T00:00:00.000Z' };
    const newerStarted = { ...book, id: 'newer', lastOpenedAt: '2026-09-24T00:00:00.000Z' };
    const untouched = { ...book, id: 'untouched', importedAt: '2026-09-25T00:00:00.000Z' };
    const finished = { ...book, id: 'finished', lastOpenedAt: '2026-09-26T00:00:00.000Z' };
    assert.deepEqual(
      sortPersonalBooksByActivity([finished, untouched, olderStarted, newerStarted], {
        older: 'started', newer: 'started', untouched: 'new', finished: 'finished',
      }).map((item) => item.id),
      ['newer', 'older', 'untouched', 'finished'],
    );
  });
});
