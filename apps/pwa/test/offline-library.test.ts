import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { selectExpiredOfflineLessons, type OfflineLesson } from '../src/services/offline-library.js';

describe('offline lesson retention', () => {
  it('selects lessons that were not opened within their category period', () => {
    const now = Date.parse('2026-08-23T12:00:00.000Z');
    const lessons: OfflineLesson[] = [
      { id: 'old', category: 'listening', title: 'Old', downloadedAt: '2026-08-01T12:00:00.000Z', lastOpenedAt: '2026-08-01T12:00:00.000Z', estimatedBytes: 10 },
      { id: 'recent', category: 'speaking', title: 'Recent', downloadedAt: '2026-08-20T12:00:00.000Z', lastOpenedAt: '2026-08-20T12:00:00.000Z', estimatedBytes: 10 },
    ];
    assert.deepEqual(selectExpiredOfflineLessons(lessons, { listening: 14, speaking: 7, videos: 30 }, now).map((lesson) => lesson.id), ['old']);
  });
});
