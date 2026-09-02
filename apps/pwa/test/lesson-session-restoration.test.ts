import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveRestoredLessonSessions } from '../src/services/lesson-session-restoration.js';

describe('lesson session restoration', () => {
  const activeLesson = { id: 'lesson-session-1' };
  const olderPausedLesson = { id: 'lesson-session-older' };

  it('restores the exact prepared lesson as active after an app update', () => {
    assert.deepEqual(
      resolveRestoredLessonSessions(activeLesson, [olderPausedLesson], activeLesson.id),
      { activeSession: activeLesson, pausedSessions: [olderPausedLesson] },
    );
  });

  it('keeps an ordinary reload paused when there is no update marker', () => {
    assert.deepEqual(
      resolveRestoredLessonSessions(activeLesson, [olderPausedLesson], null),
      { activeSession: null, pausedSessions: [olderPausedLesson, activeLesson] },
    );
  });

  it('keeps every incomplete saved lesson and drops completed sessions', () => {
    const completedLesson = { id: 'completed', completedAt: '2026-09-02T09:00:00.000Z' };

    assert.deepEqual(
      resolveRestoredLessonSessions(null, [olderPausedLesson, completedLesson, activeLesson], null),
      { activeSession: null, pausedSessions: [olderPausedLesson, activeLesson] },
    );
  });

  it('does not resume the wrong or completed session', () => {
    assert.equal(resolveRestoredLessonSessions(activeLesson, [], 'different-session').activeSession, null);
    assert.equal(
      resolveRestoredLessonSessions({ ...activeLesson, completedAt: '2026-09-02T09:00:00.000Z' }, [], activeLesson.id).activeSession,
      null,
    );
  });
});
