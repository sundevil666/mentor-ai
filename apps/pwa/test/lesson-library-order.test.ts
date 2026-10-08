import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { groupLessonsByProgressAndReleaseDate } from '../src/services/lesson-library-order.js';
import type { LessonProgressState } from '../src/services/lesson-category-progress.js';

describe('lesson library ordering', () => {
  it('puts untouched lessons first, then groups each progress section by newest release date', () => {
    const lessons = [
      { templateKey: 'newer-started', addedAt: '2026-10-08T09:00:00.000Z' },
      { templateKey: 'older-new', addedAt: '2026-10-07T09:00:00.000Z' },
      { templateKey: 'newer-completed', addedAt: '2026-10-08T08:00:00.000Z' },
      { templateKey: 'newer-new', addedAt: '2026-10-08T07:00:00.000Z' },
    ];
    const states: Record<string, LessonProgressState> = {
      'newer-started': 'started',
      'older-new': 'new',
      'newer-completed': 'completed',
      'newer-new': 'new',
    };

    const sections = groupLessonsByProgressAndReleaseDate(lessons, (lesson) => states[lesson.templateKey]!);

    assert.deepEqual(sections.map((section) => section.state), ['new', 'started', 'completed']);
    assert.deepEqual(sections[0]?.groups.map((group) => group.dateKey), ['2026-10-08', '2026-10-07']);
    assert.equal(sections[0]?.groups[0]?.dateLabel, '08.10.2026');
    assert.deepEqual(sections[0]?.groups.flatMap((group) => group.lessons.map((lesson) => lesson.templateKey)), ['newer-new', 'older-new']);
    assert.deepEqual(sections[1]?.groups[0]?.lessons.map((lesson) => lesson.templateKey), ['newer-started']);
    assert.deepEqual(sections[2]?.groups[0]?.lessons.map((lesson) => lesson.templateKey), ['newer-completed']);
  });
});
