import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContentProgress } from '@mentor-ai/shared';
import { selectUnfinishedStartedContent } from '../src/services/home-started-content.js';

const progress = (overrides: Partial<ContentProgress>): ContentProgress => ({
  id: 'lesson:one', studentId: 'student', category: 'lesson', contentId: 'one', position: 20,
  furthestPosition: 20, duration: 100, completed: false, sourceDeviceId: 'device',
  updatedAt: '2026-10-02T08:00:00.000Z', ...overrides,
});

describe('Home started content', () => {
  it('keeps synchronized progress strictly above one percent and below completion', () => {
    const selected = selectUnfinishedStartedContent([
      progress({}),
      progress({ id: 'lesson:zero', contentId: 'zero', position: 0, furthestPosition: 0 }),
      progress({ id: 'lesson:one-percent', contentId: 'one-percent', position: 1, furthestPosition: 1 }),
      progress({ id: 'lesson:partial', contentId: 'partial', position: 2, furthestPosition: 2 }),
      progress({ id: 'lesson:full', contentId: 'full', position: 100, furthestPosition: 100 }),
      progress({ id: 'lesson:historic-completion', contentId: 'historic-completion', position: 25, furthestPosition: 100, completed: true }),
    ]);
    assert.deepEqual(selected.map((item) => item.contentId), ['one', 'partial', 'historic-completion']);
  });
});
