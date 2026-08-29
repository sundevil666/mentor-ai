import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sanitizePersonalReadingBookArchive } from '../dist/services/personal-reading-books.service.js';

function createArchive(overrides = {}) {
  const id = 'book-sync-test';
  const timestamp = '2026-08-29T12:00:00.000Z';
  return {
    source: { id: `${id}:source`, type: 'manual', provider: 'student-device', importedAt: timestamp },
    book: {
      id,
      title: 'Cloud book',
      level: 'unknown',
      language: 'en',
      sourceId: `${id}:source`,
      pageCount: 1,
      chapterCount: 1,
      wordCount: 4,
      importedAt: timestamp,
      updatedAt: timestamp,
      fileName: 'cloud-book.txt',
      format: 'txt',
      rightsConfirmed: true,
      ...overrides,
    },
    chapters: [{ id: `${id}:chapter:1`, bookId: id, title: 'Part 1', order: 0, pageIds: [`${id}:page:1`] }],
    pages: [{ id: `${id}:page:1`, bookId: id, chapterId: `${id}:chapter:1`, pageNumber: 1, text: 'Read on another device.', wordCount: 4 }],
  };
}

describe('personal reading book cloud storage', () => {
  it('accepts a valid private TXT archive', () => {
    const archive = createArchive();
    assert.deepEqual(sanitizePersonalReadingBookArchive(archive), archive);
  });

  it('rejects a page belonging to another book', () => {
    const archive = createArchive();
    archive.pages[0].bookId = 'another-book';
    assert.equal(sanitizePersonalReadingBookArchive(archive), undefined);
  });

  it('requires the student rights confirmation', () => {
    assert.equal(sanitizePersonalReadingBookArchive(createArchive({ rightsConfirmed: false })), undefined);
  });
});
