import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { LearningActivityEvent, MovieLearningReport, StatisticsSnapshot } from '@mentor-ai/shared';
import { buildPracticeHistory } from '../src/services/practice-history.js';
const event = (overrides: Partial<LearningActivityEvent> = {}): LearningActivityEvent => ({ id: 'one', studentId: 'student', kind: 'reading', contentId: 'daily-category-total', sourceDeviceId: 'device', activeSeconds: 120, startedAt: '2026-10-25T12:00:00', endedAt: '2026-10-25T12:02:00', ...overrides });
it('fills empty days and deduplicates synchronized and pending events', () => {
  const result = buildPracticeHistory([event(), event()], [], '2026-10-24', '2026-10-26', 'day');
  assert.equal(result.buckets.length, 3);
  assert.deepEqual(result.buckets.map((bucket) => bucket.seconds.reading), [0, 120, 0]);
});
it('excludes undated baselines and multi-day batches rather than inventing daily practice', () => {
  const events = [event({ startedAt: '2026-10-24T12:00:00' }), event({ id: 'baseline', contentId: 'historic-device-baseline' })];
  const daily = buildPracticeHistory(events, [], '2026-10-01', '2026-10-31', 'day');
  assert.equal(daily.undatedSeconds, 240);
  assert.equal(daily.buckets.reduce((sum, bucket) => sum + bucket.seconds.reading, 0), 0);
  const monthly = buildPracticeHistory(events, [], '2026-10-01', '2026-10-31', 'month');
  assert.equal(monthly.buckets[0]?.seconds.reading, 120);
  assert.equal(monthly.undatedSeconds, 120);
});
it('uses Monday weeks and respects selected boundaries', () => {
  const result = buildPracticeHistory([event(), event({ id: 'outside', endedAt: '2026-10-27T12:00:00' })], [], '2026-10-24', '2026-10-26', 'week');
  assert.deepEqual(result.buckets.map((bucket) => bucket.key), ['2026-10-19', '2026-10-26']);
  assert.equal(result.buckets[0]?.seconds.reading, 120);
  assert.equal(result.buckets[1]?.seconds.reading, 0);
});
it('aggregates real lesson productivity without adding it to practice time', () => {
  const snapshot = { id: 'lesson', createdAt: '2026-10-25T13:00:00', accuracy: .8, completedExercises: 8, spokenWords: 20 } as StatisticsSnapshot;
  const result = buildPracticeHistory([event()], [snapshot, snapshot], '2026-01-01', '2026-12-31', 'year');
  assert.equal(result.buckets[0]?.lessons, 1);
  assert.equal(result.buckets[0]?.exercises, 8);
  assert.equal(result.buckets[0]?.accuracySum, .8);
  assert.equal(result.buckets[0]?.words, 20);
  assert.equal(result.buckets[0]?.seconds.reading, 120);
});
it('handles month boundaries and invalid event dates', () => {
  const result = buildPracticeHistory([event({ startedAt: 'invalid', endedAt: 'invalid' })], [], '2026-09-30', '2026-11-01', 'month');
  assert.deepEqual(result.buckets.map((bucket) => bucket.key), ['2026-09-01', '2026-10-01', '2026-11-01']);
  assert.equal(result.undatedSeconds, 120);
});

it('does not credit a whole legacy batch to a partially selected month', () => {
  const result = buildPracticeHistory([event({ startedAt: '2026-10-01T12:00:00' })], [], '2026-10-24', '2026-10-26', 'month');
  assert.equal(result.buckets[0]?.seconds.reading, 0);
  assert.equal(result.undatedSeconds, 120);
});

it('counts movies by watched date, deduplicates reports, and never adds estimated minutes', () => {
  const movie = { id: 'movie-one', watchedAt: '2026-10-25', createdAt: '2026-10-27T12:00:00Z' } as MovieLearningReport;
  for (const grouping of ['day', 'week', 'month', 'year'] as const) {
    const result = buildPracticeHistory([], [], '2026-10-24', '2026-10-26', grouping, [movie, movie, { ...movie, id: 'outside', watchedAt: '2026-10-27' }]);
    assert.equal(result.buckets.reduce((sum, bucket) => sum + bucket.movies, 0), 1);
    assert.equal(result.buckets.reduce((sum, bucket) => sum + Object.values(bucket.seconds).reduce((a, b) => a + b, 0), 0), 0);
  }
});
