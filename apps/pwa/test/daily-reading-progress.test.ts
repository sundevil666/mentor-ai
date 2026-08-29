import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countReadingWords,
  createDailyReadingProgress,
  dailyReadingGoalWords,
  dailyWordsRead,
  readingGoalMessage,
  recordDailyReadingPosition,
} from '../src/services/daily-reading-progress.js';

describe('daily reading progress', () => {
  it('counts readable words across book pages', () => {
    assert.equal(countReadingWords([{ text: "Don't stop — well-read learners grow." }, { text: 'One more page.' }]), 8);
  });

  it('counts only forward reading after the first position seen today', () => {
    let progress = createDailyReadingProgress('2026-08-29');
    progress = recordDailyReadingPosition(progress, 'book-a', 1_000);
    progress = recordDailyReadingPosition(progress, 'book-a', 1_600);
    progress = recordDailyReadingPosition(progress, 'book-a', 1_300);
    progress = recordDailyReadingPosition(progress, 'book-b', 200);
    progress = recordDailyReadingPosition(progress, 'book-b', 500);

    assert.equal(dailyWordsRead(progress), 900);
  });

  it('uses an encouraging 2,500-word goal with completion and stretch states', () => {
    assert.equal(dailyReadingGoalWords, 2_500);
    assert.match(readingGoalMessage(0), /30-minute/);
    assert.match(readingGoalMessage(2_000), /Almost/);
    assert.match(readingGoalMessage(2_500), /complete/);
    assert.match(readingGoalMessage(3_750), /beyond/);
  });
});
