import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { groupLessonsByProgressAndReleaseDate, groupLessonDates, resolveSelectedLessonDate } from '../src/services/lesson-library-order.js';
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

it('aggregates whole dates across progress states and marks completion only after the final lesson', () => {
  const lessons = [
    { templateKey: 'a', addedAt: '2026-10-21T09:00:00Z' },
    { templateKey: 'b', addedAt: '2026-10-21T10:00:00Z' },
    { templateKey: 'c', addedAt: '2026-10-12T10:00:00Z' },
  ];
  const dates = groupLessonDates(lessons, (lesson) => lesson.templateKey === 'b' ? 'started' : 'completed');
  assert.deepEqual(dates.map((date) => [date.dateKey, date.completed, date.total]), [['2026-10-21', 1, 2], ['2026-10-12', 1, 1]]);
  assert.equal(resolveSelectedLessonDate('2026-10-12', dates), '2026-10-12');
  assert.equal(resolveSelectedLessonDate('removed-date', dates), '2026-10-21');
  assert.equal(resolveSelectedLessonDate(null, []), null);
  const complete = groupLessonDates(lessons, () => 'completed');
  assert.equal(complete[0]?.completed, complete[0]?.total);
});

it('orders Speaking cards as started, untouched, then completed', () => {
  const lessons = [
    { templateKey: 'new', addedAt: '2026-10-21T10:00:00Z' },
    { templateKey: 'completed', addedAt: '2026-10-21T11:00:00Z' },
    { templateKey: 'started', addedAt: '2026-10-21T09:00:00Z' },
  ];
  const sections = groupLessonsByProgressAndReleaseDate(lessons, (lesson) => lesson.templateKey as LessonProgressState, ['started', 'new', 'completed']);
  assert.deepEqual(sections.flatMap((section) => section.groups.flatMap((group) => group.lessons.map((lesson) => lesson.templateKey))), ['started', 'new', 'completed']);
});
