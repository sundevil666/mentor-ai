import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GeneratedLesson } from '@mentor-ai/shared';
import { prioritizeNewLessons } from '../src/services/offline-lesson-updates.js';

function lesson(id: string, priority: number, doFirst = false, createdAt = '2026-09-12T10:00:00.000Z') {
  return { id, priority, doFirst, createdAt } as GeneratedLesson;
}

describe('new lesson catalog priority', () => {
  it('keeps the do-first lesson above higher numeric priorities', () => {
    const sorted = prioritizeNewLessons([
      lesson('medium', 50),
      lesson('highest-number', 999),
      lesson('required', 1, true),
    ]);
    assert.deepEqual(sorted.map(({ id }) => id), ['required', 'highest-number', 'medium']);
  });

  it('orders remaining lessons by priority and then recency', () => {
    const sorted = prioritizeNewLessons([
      lesson('older', 80, false, '2026-09-10T10:00:00.000Z'),
      lesson('lower', 70, false, '2026-09-12T10:00:00.000Z'),
      lesson('newer', 80, false, '2026-09-11T10:00:00.000Z'),
    ]);
    assert.deepEqual(sorted.map(({ id }) => id), ['newer', 'older', 'lower']);
  });
});
