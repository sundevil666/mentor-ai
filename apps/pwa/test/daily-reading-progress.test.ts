import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createDailyReadingProgress,
  dailyReadingGoalWords,
  dailyReadingTargetWords,
  dailyWordsRead,
  prepareDailyReadingProgress,
  readingGoalMessage,
  recordDailyReadWords,
  recordDailySpokenWords,
  spokenWordsForBook,
} from '../src/services/daily-reading-progress.js';

describe('daily reading progress', () => {
  it('keeps spoken highlighting separate from independently counted reading', () => {
    let progress = createDailyReadingProgress('2026-08-29');
    progress = recordDailySpokenWords(progress, 'book-a', [10, 11, 12, 13]);
    progress = recordDailySpokenWords(progress, 'book-a', [10, 11, 12, 13]);
    progress = recordDailySpokenWords(progress, 'book-a', [13, 14, 15]);
    progress = recordDailySpokenWords(progress, 'book-b', [2, 3]);
    progress = recordDailyReadWords(progress, 'book-a', [0, 1, 2, 3, 4]);
    progress = recordDailyReadWords(progress, 'book-a', [0, 1, 2, 3, 4]);
    progress = recordDailyReadWords(progress, 'book-b', [20, 21]);

    assert.equal(dailyWordsRead(progress), 7);
    assert.deepEqual(spokenWordsForBook(progress, 'book-a'), [10, 11, 12, 13, 14, 15]);
  });

  it('does not credit legacy pagination positions as spoken reading', () => {
    const legacy = {
      date: '2026-08-29',
      books: { 'book-a': { baselineWordPosition: 100, furthestWordPosition: 900 } },
    } as unknown as ReturnType<typeof createDailyReadingProgress>;
    assert.equal(dailyWordsRead(legacy), 0);
  });

  it('never offers a target below 3,000 words', () => {
    assert.equal(dailyReadingGoalWords, 3_000);
    const progress = {
      ...createDailyReadingProgress('2026-08-29'),
      history: [
        { date: '2026-08-27', wordsRead: 1_200 },
        { date: '2026-08-28', wordsRead: 2_800 },
      ],
    };
    assert.equal(dailyReadingTargetWords(progress), 3_000);
    assert.match(readingGoalMessage(0), /30-minute/);
    assert.match(readingGoalMessage(2_400), /Almost/);
    assert.match(readingGoalMessage(3_000), /complete/);
    assert.match(readingGoalMessage(4_500), /beyond/);
  });

  it('raises and holds the target at the rounded recent reading average', () => {
    const progress = {
      ...createDailyReadingProgress('2026-08-30'),
      history: [
        { date: '2026-08-27', wordsRead: 3_600 },
        { date: '2026-08-28', wordsRead: 4_100 },
        { date: '2026-08-29', wordsRead: 3_800 },
      ],
    };
    assert.equal(dailyReadingTargetWords(progress), 3_800);
  });

  it('archives the previous day before starting a fresh independent counter', () => {
    let progress = createDailyReadingProgress('2026-08-29');
    progress = recordDailyReadWords(progress, 'book-a', [1, 2, 3]);
    progress = recordDailySpokenWords(progress, 'book-a', [8, 9]);

    const nextDay = prepareDailyReadingProgress(progress, '2026-08-30');

    assert.equal(nextDay.date, '2026-08-30');
    assert.equal(dailyWordsRead(nextDay), 0);
    assert.deepEqual(nextDay.history, [{ date: '2026-08-29', wordsRead: 3 }]);
  });
});
