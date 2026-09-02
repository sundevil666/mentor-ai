import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ExerciseResult, LearningEvent, SpeechResult } from '@mentor-ai/shared';
import { rewindLessonSession } from '../src/services/lesson-step-navigation.js';

describe('lesson step navigation', () => {
  it('returns to listening and removes its old result before replay', () => {
    const session = {
      currentExerciseIndex: 1,
      exerciseStartedAt: 'before',
      lesson: { exercises: [{ id: 'listen' }, { id: 'speak' }] },
      events: [
        { id: 'start', exerciseId: 'listen' },
        { id: 'finish', exerciseId: 'listen' },
        { id: 'speak-start', exerciseId: 'speak' },
      ] as LearningEvent[],
      results: [{ id: 'listen-result', exerciseId: 'listen' }] as ExerciseResult[],
      speechResults: [] as SpeechResult[],
    };

    assert.equal(rewindLessonSession(session, 'after'), 'listen');
    assert.equal(session.currentExerciseIndex, 0);
    assert.equal(session.exerciseStartedAt, 'after');
    assert.deepEqual(session.events, []);
    assert.deepEqual(session.results, []);
  });

  it('does not leave the first lesson step', () => {
    const session = {
      currentExerciseIndex: 0,
      exerciseStartedAt: 'before',
      lesson: { exercises: [{ id: 'listen' }] },
      events: [] as LearningEvent[],
      results: [] as ExerciseResult[],
      speechResults: [] as SpeechResult[],
    };

    assert.equal(rewindLessonSession(session, 'after'), null);
    assert.equal(session.currentExerciseIndex, 0);
  });
});
