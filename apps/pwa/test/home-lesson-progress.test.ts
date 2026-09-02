import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calculateLessonSessionProgress,
  canFinishRepeatedLesson,
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
});
