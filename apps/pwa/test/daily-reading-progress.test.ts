import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createDailyReadingProgress,
  dailyReadingGoalWords,
  dailyWordsRead,
  readingGoalMessage,
  recordDailySpokenWords,
  spokenWordsForBook,
} from '../src/services/daily-reading-progress.js';

describe('daily reading progress', () => {
  it('counts only unique words confirmed by speech for each book', () => {
    let progress = createDailyReadingProgress('2026-08-29');
    progress = recordDailySpokenWords(progress, 'book-a', [10, 11, 12, 13]);
    progress = recordDailySpokenWords(progress, 'book-a', [10, 11, 12, 13]);
    progress = recordDailySpokenWords(progress, 'book-a', [13, 14, 15]);
    progress = recordDailySpokenWords(progress, 'book-b', [2, 3]);

    assert.equal(dailyWordsRead(progress), 8);
    assert.deepEqual(spokenWordsForBook(progress, 'book-a'), [10, 11, 12, 13, 14, 15]);
  });

  it('does not credit legacy pagination positions as spoken reading', () => {
    const legacy = {
      date: '2026-08-29',
      books: { 'book-a': { baselineWordPosition: 100, furthestWordPosition: 900 } },
    } as unknown as ReturnType<typeof createDailyReadingProgress>;
    assert.equal(dailyWordsRead(legacy), 0);
  });

  it('uses an encouraging 2,500-word goal with completion and stretch states', () => {
    assert.equal(dailyReadingGoalWords, 2_500);
    assert.match(readingGoalMessage(0), /30-minute/);
    assert.match(readingGoalMessage(2_000), /Almost/);
    assert.match(readingGoalMessage(2_500), /complete/);
    assert.match(readingGoalMessage(3_750), /beyond/);
  });
});
