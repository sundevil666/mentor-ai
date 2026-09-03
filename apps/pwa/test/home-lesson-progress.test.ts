import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calculateLessonSessionProgress,
  canFinishRepeatedLesson,
  getLessonExerciseNavigation,
} from '../src/services/home-lesson-progress.js';

describe('Home lesson progress', () => {
  it('shows the saved exercise position as a percentage', () => {
    assert.equal(calculateLessonSessionProgress(2, 5), 40);
    assert.equal(calculateLessonSessionProgress(0, 0), 0);
  });

  it('allows force finishing only after an earlier full completion', () => {
    const completedLessonCounts = new Map([['completed-lesson', 1]]);

    assert.equal(canFinishRepeatedLesson('completed-lesson', completedLessonCounts), true);
    assert.equal(canFinishRepeatedLesson('first-attempt', completedLessonCounts), false);
    assert.equal(canFinishRepeatedLesson(undefined, completedLessonCounts), false);
  });

  it('keeps first-pass speaking gated but unlocks navigation after a full lesson completion', () => {
    assert.deepEqual(getLessonExerciseNavigation(false, 2, false), {
      showPrevious: false,
      previousDisabled: false,
      nextLabel: 'Continue',
      nextDisabled: true,
    });
    assert.deepEqual(getLessonExerciseNavigation(false, 2, true), {
      showPrevious: false,
      previousDisabled: false,
      nextLabel: 'Continue',
      nextDisabled: false,
    });
    assert.deepEqual(getLessonExerciseNavigation(true, 2, false), {
      showPrevious: true,
      previousDisabled: false,
      nextLabel: 'Next',
      nextDisabled: false,
    });
  });

  it('disables Previous only on the first step of a repeated lesson', () => {
    assert.equal(getLessonExerciseNavigation(true, 0, false).previousDisabled, true);
    assert.equal(getLessonExerciseNavigation(true, 1, false).previousDisabled, false);
  });
});
