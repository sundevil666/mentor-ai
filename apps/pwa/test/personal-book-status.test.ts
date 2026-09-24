import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContentProgress, PersonalReadingBook } from '@mentor-ai/shared';
import { personalBookReadingStatus } from '../src/services/personal-book-status.js';

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
});
