import assert from 'node:assert/strict';
import { it } from 'node:test';
import { preferLocalTotals } from '../src/services/learning-activity-totals.js';

it('keeps unsent local listening time while accepting newer server activity', () => {
  const local = { listeningSeconds: 5 * 3_600, readingSeconds: 0, speakingSeconds: 0, totalSeconds: 5 * 3_600, updatedAt: '2026-09-20T10:00:00Z' };
  const remote = { listeningSeconds: 2 * 3_600, readingSeconds: 900, speakingSeconds: 0, totalSeconds: 2 * 3_600 + 900, updatedAt: '2026-09-20T11:00:00Z' };
  assert.deepEqual(preferLocalTotals(local, remote), {
    listeningSeconds: 5 * 3_600, readingSeconds: 900, speakingSeconds: 0,
    totalSeconds: 5 * 3_600 + 900, updatedAt: remote.updatedAt,
  });
});
