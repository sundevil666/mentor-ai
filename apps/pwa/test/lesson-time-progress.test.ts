import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateLessonProgressRatio,
  calculateLessonRemainingRatio,
  calculatePlaybackProgress,
} from '../src/services/lesson-time-progress.js';

describe('lesson time progress', () => {
  it('decreases the remaining bar while a speaking example plays', () => {
    const beforePlayback = calculateLessonProgressRatio(1, 0, 6, false);
    const duringPlayback = calculateLessonProgressRatio(
      1,
      calculatePlaybackProgress(2, 4),
      6,
      false,
    );

    assert.equal(calculateLessonRemainingRatio(beforePlayback), 5 / 6);
    assert.equal(calculateLessonRemainingRatio(duringPlayback), 4.5 / 6);
  });

  it('keeps playback and remaining ratios within the progress bar range', () => {
    assert.equal(calculatePlaybackProgress(-1, 4), 0);
    assert.equal(calculatePlaybackProgress(8, 4), 1);
    assert.equal(calculatePlaybackProgress(1, 0), 0);
    assert.equal(calculateLessonRemainingRatio(2), 0);
  });

  it('shows no remaining progress after lesson completion', () => {
    const completed = calculateLessonProgressRatio(0, 0, 6, true);

    assert.equal(calculateLessonRemainingRatio(completed), 0);
  });
});
