import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContentProgress } from '@mentor-ai/shared';
import { selectUnfinishedStartedContent } from '../src/services/home-started-content.js';

const progress = (overrides: Partial<ContentProgress>): ContentProgress => ({
  id: 'audio:one', studentId: 'student', category: 'audio', contentId: 'one', position: 20,
  furthestPosition: 20, duration: 100, completed: false, sourceDeviceId: 'device',
  updatedAt: '2026-10-02T08:00:00.000Z', ...overrides,
});
describe('Home started content', () => {
  it('keeps only synchronized progress strictly between zero and completion', () => {
    const selected = selectUnfinishedStartedContent([
      progress({}),
      progress({ id: 'audio:zero', contentId: 'zero', position: 0, furthestPosition: 0 }),
      progress({ id: 'audio:full', contentId: 'full', position: 100, furthestPosition: 100 }),
      progress({ id: 'audio:rounded-zero', contentId: 'rounded-zero', position: 0.4, furthestPosition: 0.4 }),
      progress({ id: 'audio:rounded-full', contentId: 'rounded-full', position: 99.6, furthestPosition: 99.6 }),
      progress({ id: 'audio:unknown-total', contentId: 'unknown-total', duration: undefined }),
      progress({ id: 'reading:book', category: 'reading', contentId: 'book', completed: true }),
    ]);
    assert.deepEqual(selected.map((item) => item.contentId), ['one']);
  });

  it('does not treat an item without measurable progress as started', () => {
    assert.equal(selectUnfinishedStartedContent([]).length, 0);
  });
});
