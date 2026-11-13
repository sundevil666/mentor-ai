import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateDailyBalanceGoals, calculateLatestBalanceChange, calculateLearningBalance, summarizeRecentLearningActivity } from '../src/services/learning-balance.js';

const emptyActivity = { grammarSeconds: 0, listeningSeconds: 0, speakingSeconds: 0, phrasesSeconds: 0, audioSeconds: 0, readingSeconds: 0, vocabularySeconds: 0, totalSeconds: 0, updatedAt: null };

describe('learning balance', () => {
  it('recommends speaking when practice is dominated by audio', () => {
    const balance = calculateLearningBalance({ activity: { ...emptyActivity, audioSeconds: 36_000, totalSeconds: 36_000 } });
    assert.equal(balance.primaryFocus.kind, 'speaking');
    assert.equal(balance.rows.find((row) => row.kind === 'audio')?.status, 'strong');
  });

  it('opens the dedicated vocabulary library from its balance card', () => {
    const balance = calculateLearningBalance({ activity: emptyActivity });
    assert.deepEqual(balance.rows.find((row) => row.kind === 'vocabulary')?.route, {
      name: 'dashboard',
      query: { training: 'vocabulary' },
    });
  });

  it('weights active speaking more strongly than passive audio', () => {
    const balance = calculateLearningBalance({ activity: { ...emptyActivity, speakingSeconds: 3_600, audioSeconds: 3_600, totalSeconds: 7_200 } });
    assert.ok(balance.rows.find((row) => row.kind === 'speaking')!.impactPercent > balance.rows.find((row) => row.kind === 'audio')!.impactPercent);
  });

  it('counts estimated movie viewing as cautious listening impact', () => {
    const balance = calculateLearningBalance({ activity: emptyActivity, estimatedMovieSeconds: 7_200 });
    assert.equal(balance.rows.find((row) => row.kind === 'movies')?.impactPercent, 100);
    assert.equal(balance.rows.find((row) => row.kind === 'listening')?.impactPercent, 100);
    assert.equal(balance.rows.reduce((sum, row) => sum + row.targetPercent, 0), 100);
  });

  it('orders skills by their current target gap and keeps movies last', () => {
    const balance = calculateLearningBalance({ activity: { ...emptyActivity, speakingSeconds: 18_000, listeningSeconds: 3_600, totalSeconds: 21_600 }, estimatedMovieSeconds: 7_200 });
    const measuredRows = balance.rows.filter((row) => row.kind !== 'movies');

    assert.deepEqual(measuredRows.map((row) => row.gapPercent), [...measuredRows].map((row) => row.gapPercent).sort((a, b) => b - a));
    assert.deepEqual(measuredRows.map((row) => row.priorityRank), [1, 2, 3, 4, 5, 6, 7]);
    assert.equal(balance.rows.at(-1)?.kind, 'movies');
    assert.equal(balance.primaryFocus.kind, balance.rows[0]?.kind);
  });

  it('derives the latest signed score change from real activity history', () => {
    const activity = { ...emptyActivity, speakingSeconds: 600, audioSeconds: 3_600, totalSeconds: 4_200, updatedAt: '2026-11-10T10:00:00.000Z' };
    const change = calculateLatestBalanceChange({ activity, events: [{
      id: 'event-1', studentId: 'student-1', kind: 'speaking', contentId: 'lesson-travel-questions', activeSeconds: 600,
      sourceDeviceId: 'device-1', startedAt: '2026-11-10T09:50:00.000Z', endedAt: '2026-11-10T10:00:00.000Z',
    }] });
    assert.ok(change);
    assert.ok(change.delta > 0);
    assert.match(change.action, /lesson-travel-questions/);
    assert.equal(change.occurredAt, '2026-11-10T10:00:00.000Z');
  });

  it('shows a book title instead of its internal reading id', () => {
    const bookId = '7d9fe6e0-4150-4c2d-83ed-a75a96ac85ab';
    const activity = { ...emptyActivity, readingSeconds: 600, totalSeconds: 600, updatedAt: '2026-11-10T10:00:00.000Z' };
    const event = { id: 'event-book', studentId: 'student-1', kind: 'reading' as const, contentId: bookId, activeSeconds: 600, sourceDeviceId: 'device-1', startedAt: '2026-11-10T09:50:00.000Z', endedAt: '2026-11-10T10:00:00.000Z' };
    const named = calculateLatestBalanceChange({ activity, events: [event], contentTitles: { [bookId]: 'The Secret Garden' } });
    const missing = calculateLatestBalanceChange({ activity, events: [event] });
    assert.equal(named?.action, 'Reading · The Secret Garden');
    assert.equal(missing?.action, 'Reading');
  });

  it('does not invent a change when there is no activity event', () => {
    assert.equal(calculateLatestBalanceChange({ activity: emptyActivity, events: [] }), null);
  });

  it('uses the latest movie report as a real estimated listening change', () => {
    const change = calculateLatestBalanceChange({
      activity: { ...emptyActivity, speakingSeconds: 3_600, totalSeconds: 3_600 }, events: [], estimatedMovieSecondsPerReport: 6_300,
      movieReports: [{ id: 'movie-1', studentId: 'student-1', movieTitle: 'The King’s Speech', watchedAt: '2026-11-09', report: 'Report', sourceDeviceId: 'device-1', createdAt: '2026-11-10T12:00:00.000Z', updatedAt: '2026-11-10T12:00:00.000Z' }],
    });
    assert.ok(change);
    assert.equal(change.kind, 'movies');
    assert.equal(change.activeSeconds, 6_300);
    assert.match(change.action, /The King’s Speech/);
  });

  it('summarizes only real activity from the rolling 30-day window', () => {
    const events = [
      { id: 'recent', studentId: 'student-1', kind: 'speaking' as const, contentId: 'lesson-1', activeSeconds: 600, sourceDeviceId: 'device-1', startedAt: '2026-11-09T09:50:00.000Z', endedAt: '2026-11-09T10:00:00.000Z' },
      { id: 'old', studentId: 'student-1', kind: 'listening' as const, contentId: 'lesson-2', activeSeconds: 9_000, sourceDeviceId: 'device-1', startedAt: '2026-09-01T09:00:00.000Z', endedAt: '2026-09-01T10:00:00.000Z' },
      { id: 'baseline', studentId: 'student-1', kind: 'reading' as const, contentId: 'historic-device-baseline', activeSeconds: 90_000, sourceDeviceId: 'device-1', startedAt: '2026-11-09T09:00:00.000Z', endedAt: '2026-11-09T10:00:00.000Z' },
    ];
    const totals = summarizeRecentLearningActivity(events, new Date('2026-11-10T12:00:00.000Z'));
    assert.equal(totals.speakingSeconds, 600);
    assert.equal(totals.listeningSeconds, 0);
    assert.equal(totals.readingSeconds, 0);
    assert.equal(totals.totalSeconds, 600);
  });
});


describe('daily balance goals', () => {
  it('offers only one priority per day, completes it after five minutes, and resets tomorrow', () => {
    const now = new Date(2026, 10, 12, 14);
    const initial = calculateDailyBalanceGoals([], 0, now);
    assert.equal(initial.goals.length, 1);
    assert.equal(initial.pending.length, 1);
    assert.equal(initial.current?.kind, 'speaking');
    const event = { id: 'today', studentId: 'student', kind: 'speaking' as const, contentId: 'practice', sourceDeviceId: 'device', startedAt: new Date(2026, 10, 12, 10).toISOString(), endedAt: new Date(2026, 10, 12, 10, 5).toISOString(), activeSeconds: 299 };
    assert.equal(calculateDailyBalanceGoals([event], 0, now).current?.kind, 'speaking');
    const completed = calculateDailyBalanceGoals([{ ...event, activeSeconds: 300 }], 0, now);
    assert.equal(completed.current, null);
    assert.equal(completed.pending.length, 0);
    assert.equal(completed.completed, true);
    assert.equal(calculateDailyBalanceGoals([{ ...event, activeSeconds: 300 }], 0, new Date(2026, 10, 13, 14)).completed, false);
  });
});
