import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateLessonProgressRatio,
  calculatePlaybackProgress,
  calculateRemainingSeconds,
  estimateAudioTotalSeconds,
  formatRemainingClockTime,
} from '../src/services/lesson-time-progress.js';

describe('lesson time progress', () => {
  it('fills the progress bar from left to right while a speaking example plays', () => {
    const beforePlayback = calculateLessonProgressRatio(1, 0, 6, false);
    const duringPlayback = calculateLessonProgressRatio(
      1,
      calculatePlaybackProgress(2, 4),
      6,
      false,
    );

    assert.equal(beforePlayback, 1 / 6);
    assert.equal(duringPlayback, 1.5 / 6);
    assert.ok(duringPlayback > beforePlayback);
  });

  it('keeps playback and remaining ratios within the progress bar range', () => {
    assert.equal(calculatePlaybackProgress(-1, 4), 0);
    assert.equal(calculatePlaybackProgress(8, 4), 1);
    assert.equal(calculatePlaybackProgress(1, 0), 0);
  });

  it('fills the progress bar after lesson completion', () => {
    const completed = calculateLessonProgressRatio(0, 0, 6, true);

    assert.equal(completed, 1);
  });

  it('marks the decreasing time with a minus sign', () => {
    assert.equal(formatRemainingClockTime(300), '-5:00');
    assert.equal(formatRemainingClockTime(299), '-4:59');
  });

  it('uses the current dialogue duration instead of the estimated lesson duration', () => {
    const dialogueDuration = estimateAudioTotalSeconds(120, 15, 30);

    assert.equal(dialogueDuration, 60);
    assert.equal(calculateRemainingSeconds(dialogueDuration, 0.5), 30);
    assert.equal(calculateRemainingSeconds(dialogueDuration, 1), 0);
  });
});
