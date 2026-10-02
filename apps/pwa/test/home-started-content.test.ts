import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContentEngagementEvent, ContentProgress } from '@mentor-ai/shared';
import { selectUnfinishedStartedContent } from '../src/services/home-started-content.js';

const progress = (overrides: Partial<ContentProgress>): ContentProgress => ({
  id: 'audio:one', studentId: 'student', category: 'audio', contentId: 'one', position: 20,
  furthestPosition: 20, duration: 100, completed: false, sourceDeviceId: 'device',
  updatedAt: '2026-10-02T08:00:00.000Z', ...overrides,
});
const event = (type: ContentEngagementEvent['type'], createdAt: string): ContentEngagementEvent => ({
  id: `${type}:${createdAt}`, studentId: 'student', category: 'audio', contentId: 'two', type,
  sourceDeviceId: 'device', createdAt,
});

describe('Home started content', () => {
  it('keeps partial synchronized progress and removes completed content', () => {
    const selected = selectUnfinishedStartedContent([
      progress({}),
      progress({ id: 'reading:book', category: 'reading', contentId: 'book', completed: true }),
    ], []);
    assert.deepEqual(selected.map((item) => item.contentId), ['one']);
  });

  it('removes a start after its later finish and keeps a later new start', () => {
    assert.equal(selectUnfinishedStartedContent([], [
      event('started', '2026-10-02T08:00:00.000Z'),
      event('finished', '2026-10-02T08:10:00.000Z'),
    ]).length, 0);
    assert.equal(selectUnfinishedStartedContent([], [
      event('finished', '2026-10-02T08:10:00.000Z'),
      event('started', '2026-10-02T08:20:00.000Z'),
    ])[0]?.contentId, 'two');
  });
});
