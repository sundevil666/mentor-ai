import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findResumableLessonSession, resolveRestoredLessonSessions } from '../src/services/lesson-session-restoration.js';

describe('lesson session restoration', () => {
  const activeLesson = { id: 'lesson-session-1' };
  const olderPausedLesson = { id: 'lesson-session-older' };

  it('restores the exact prepared lesson as active after an app update', () => {
    assert.deepEqual(
      resolveRestoredLessonSessions(activeLesson, [olderPausedLesson], activeLesson.id),
      { activeSession: activeLesson, pausedSessions: [olderPausedLesson] },
    );
  });

  it('restores an ordinary reload at the saved exercise without an update marker', () => {
    assert.deepEqual(
      resolveRestoredLessonSessions(activeLesson, [olderPausedLesson], null),
      { activeSession: activeLesson, pausedSessions: [olderPausedLesson] },
    );
  });

  it('keeps every incomplete saved lesson and drops completed sessions', () => {
    const completedLesson = { id: 'completed', completedAt: '2026-09-02T09:00:00.000Z' };

    assert.deepEqual(
      resolveRestoredLessonSessions(null, [olderPausedLesson, completedLesson, activeLesson], null),
      { activeSession: null, pausedSessions: [olderPausedLesson, activeLesson] },
    );
  });

  it('ignores stale update markers and never resumes completed sessions', () => {
    assert.equal(resolveRestoredLessonSessions(activeLesson, [], 'different-session').activeSession, activeLesson);
    assert.equal(
      resolveRestoredLessonSessions({ ...activeLesson, completedAt: '2026-09-02T09:00:00.000Z' }, [], activeLesson.id).activeSession,
      null,
    );
  });
});

it('preserves later-step evidence and selects the unfinished lesson when reopening its card', () => {
  const saved = { id: 'saved-session', lesson: { id: 'sample', lessonTemplateKey: 'sample-template' }, currentExerciseIndex: 3, results: [{ exerciseId: 'step-1', correct: true }], events: ['hint'], startedAt: 'original' };
  const other = { ...saved, id: 'other', lesson: { id: 'other', lessonTemplateKey: 'other-template' } };
  const restored = resolveRestoredLessonSessions(saved, [saved, other], null);
  assert.strictEqual(restored.activeSession, saved);
  assert.equal(restored.activeSession?.currentExerciseIndex, 3);
  assert.strictEqual(restored.activeSession?.results, saved.results);
  assert.deepEqual(restored.pausedSessions, [other]);
  assert.strictEqual(findResumableLessonSession([saved, other], 'sample-template'), saved);
  assert.equal(findResumableLessonSession([{ ...saved, completedAt: 'done' }], 'sample-template'), undefined);
  assert.equal(findResumableLessonSession([other], 'sample-template'), undefined);
});
