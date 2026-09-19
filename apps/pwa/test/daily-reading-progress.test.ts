import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  annualReadingPace,
  annualReadingPaceMessage,
  createDailyReadingProgress,
  dailyReadingGoalWords,
  dailyReadingTargetWords,
  dailyWordsRead,
  millisecondsUntilNextReadingDay,
  prepareDailyReadingProgress,
  readingGoalMessage,
  recordDailyReadWords,
  recordDailySpokenWords,
  spokenWordsForBook,
} from '../src/services/daily-reading-progress.js';
import { bookReadingForecast, formatReadingDaysRemaining } from '../src/services/book-reading-forecast.js';

describe('daily reading progress', () => {
  it('moves the finish date forward after an idle day without changing required reading days', () => {
    const first = bookReadingForecast(30_000, 3_000, 3_000, new Date(2026, 8, 13));
    const idleNextDay = bookReadingForecast(30_000, 3_000, 3_000, new Date(2026, 8, 14));

    assert.equal(first.readingDaysRemaining, 9);
    assert.equal(idleNextDay.readingDaysRemaining, 9);
    assert.equal(first.finishDate.getDate(), 21);
    assert.equal(idleNextDay.finishDate.getDate(), 22);
  });

  it('shortens the reading forecast after progress beyond the daily target', () => {
    const forecast = bookReadingForecast(30_000, 7_000, 3_000, new Date(2026, 8, 13));

    assert.equal(forecast.wordsRemaining, 23_000);
    assert.equal(forecast.readingDaysRemaining, 23 / 3);
    assert.equal(forecast.finishDate.getDate(), 20);
  });

  it('reduces fractional reading days with each page while keeping one finish date', () => {
    const today = new Date(2026, 8, 19);
    const before = bookReadingForecast(16_000, 0, 3_200, today);
    const afterOnePage = bookReadingForecast(16_000, 160, 3_200, today);
    const afterTwoPages = bookReadingForecast(16_000, 320, 3_200, today);
    const afterTwoDays = bookReadingForecast(16_000, 6_320, 3_200, new Date(2026, 8, 21));

    assert.equal(before.readingDaysRemaining, 5);
    assert.equal(afterOnePage.readingDaysRemaining, 4.95);
    assert.equal(afterTwoPages.readingDaysRemaining, 4.9);
    assert.equal(afterTwoDays.readingDaysRemaining, 3.025);
    assert.equal(formatReadingDaysRemaining(before.readingDaysRemaining), '5,00 reading days left');
    assert.equal(formatReadingDaysRemaining(afterOnePage.readingDaysRemaining), '4,95 reading days left');
    assert.equal(formatReadingDaysRemaining(afterTwoDays.readingDaysRemaining), '3,02 reading days left');
    assert.deepEqual(
      [before, afterOnePage, afterTwoPages, afterTwoDays].map(({ finishDate }) => finishDate.toDateString()),
      [23, 23, 23, 24].map((day) => new Date(2026, 8, day).toDateString()),
    );
  });

  it('shows no remaining days when the book is complete', () => {
    const forecast = bookReadingForecast(16_000, 16_000, 3_200, new Date(2026, 8, 19));
    assert.equal(forecast.readingDaysRemaining, 0);
    assert.equal(formatReadingDaysRemaining(forecast.readingDaysRemaining), 'Book complete');
    assert.equal(forecast.finishDate.getDate(), 19);
  });

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
        { date: '2026-08-27', wordsRead: 1_200, targetWords: 3_000 },
        { date: '2026-08-28', wordsRead: 2_800, targetWords: 3_000 },
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
        { date: '2026-08-27', wordsRead: 3_600, targetWords: 3_000 },
        { date: '2026-08-28', wordsRead: 4_100, targetWords: 3_600 },
        { date: '2026-08-29', wordsRead: 3_800, targetWords: 3_900 },
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
    assert.deepEqual(nextDay.history, [{ date: '2026-08-29', wordsRead: 3, targetWords: 3_000 }]);
  });

  it('updates the daily target at the next local day while the reader stays open', () => {
    let progress = createDailyReadingProgress('2026-09-19');
    progress = recordDailyReadWords(progress, 'book-a', Array.from({ length: 3_600 }, (_, index) => index));
    assert.equal(dailyReadingTargetWords(progress), 3_000);

    progress = prepareDailyReadingProgress(progress, '2026-09-20');
    assert.equal(progress.date, '2026-09-20');
    assert.equal(dailyWordsRead(progress), 0);
    assert.equal(dailyReadingTargetWords(progress), 3_600);
    assert.equal(bookReadingForecast(16_000, 3_600, dailyReadingTargetWords(progress), new Date(2026, 8, 20)).readingDaysRemaining, 12_400 / 3_600);
  });

  it('schedules the next refresh at local midnight', () => {
    assert.equal(millisecondsUntilNextReadingDay(new Date(2026, 8, 19, 23, 59, 30)), 30_000);
    assert.equal(millisecondsUntilNextReadingDay(new Date(2026, 8, 19, 0, 0, 0)), 86_400_000);
  });

  it('keeps an absolute yearly pace while the daily counter resets', () => {
    let progress = createDailyReadingProgress('2026-08-28');
    progress = recordDailyReadWords(progress, 'book-a', Array.from({ length: 4_000 }, (_, index) => index));
    progress = prepareDailyReadingProgress(progress, '2026-08-29');
    progress = recordDailyReadWords(progress, 'book-b', Array.from({ length: 3_500 }, (_, index) => index));

    assert.deepEqual(annualReadingPace(progress), {
      actualWords: 724_500,
      balanceWords: 500,
      expectedWords: 724_000,
      trackedDays: 241,
    });
  });

  it('includes missed calendar days in the yearly pace', () => {
    let progress = createDailyReadingProgress('2026-08-28');
    progress = recordDailyReadWords(progress, 'book-a', Array.from({ length: 4_000 }, (_, index) => index));
    progress = prepareDailyReadingProgress(progress, '2026-08-30');

    assert.deepEqual(progress.history, [
      { date: '2026-08-28', wordsRead: 4_000, targetWords: 3_000 },
      { date: '2026-08-29', wordsRead: 0, targetWords: 4_000 },
    ]);
    assert.deepEqual(annualReadingPace(progress), {
      actualWords: 721_000,
      balanceWords: -7_000,
      expectedWords: 728_000,
      trackedDays: 242,
    });
  });

  it('uses both encouragement and burnout-aware yearly motivation', () => {
    assert.match(annualReadingPaceMessage(-800, 3_000), /little more/i);
    assert.match(annualReadingPaceMessage(-12_000, 3_000), /gently/i);
    assert.match(annualReadingPaceMessage(2_000, 3_000), /take it easy/i);
    assert.match(annualReadingPaceMessage(21_000, 3_000), /burnout/i);
  });
});
