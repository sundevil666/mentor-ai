import assert from 'node:assert/strict';
import { it } from 'node:test';
import { buildActivityBaselineEvents, preferLocalTotals } from '../src/services/learning-activity-totals.js';

it('keeps unsent local listening time while accepting newer server activity', () => {
  const empty = { grammarSeconds: 0, phrasesSeconds: 0, audioSeconds: 0, vocabularySeconds: 0 };
  const local = { ...empty, listeningSeconds: 5 * 3_600, readingSeconds: 0, speakingSeconds: 0, totalSeconds: 5 * 3_600, updatedAt: '2026-09-20T10:00:00Z' };
  const remote = { ...empty, listeningSeconds: 2 * 3_600, readingSeconds: 900, speakingSeconds: 0, totalSeconds: 2 * 3_600 + 900, updatedAt: '2026-09-20T11:00:00Z' };
  assert.deepEqual(preferLocalTotals(local, remote), {
    ...empty, listeningSeconds: 5 * 3_600, readingSeconds: 900, speakingSeconds: 0,
    totalSeconds: 5 * 3_600 + 900, updatedAt: remote.updatedAt,
  });
});

it('uploads only the unsynchronized part of a larger historic device total', () => {
  const empty = { grammarSeconds: 0, phrasesSeconds: 0, audioSeconds: 0, vocabularySeconds: 0, readingSeconds: 0, speakingSeconds: 0 };
  const local = { ...empty, listeningSeconds: 6 * 3_600 + 24 * 60, totalSeconds: 6 * 3_600 + 24 * 60, updatedAt: '2026-10-01T09:44:00Z' };
  const remote = { ...empty, listeningSeconds: 2 * 3_600 + 51 * 60, totalSeconds: 2 * 3_600 + 51 * 60, updatedAt: '2026-10-01T09:43:00Z' };

  const events = buildActivityBaselineEvents(local, remote, 'student-1', 'phone-1');
  assert.deepEqual(events.map(({ kind, activeSeconds }) => ({ kind, activeSeconds })), [
    { kind: 'listening', activeSeconds: 3 * 3_600 + 33 * 60 },
  ]);
  assert.equal(events[0]?.id, 'activity-baseline:phone-1:listening:2026-10-01T09:44:00Z');
});

it('preserves the historic device difference after current queued activity reaches the server', () => {
  const empty = { grammarSeconds: 0, phrasesSeconds: 0, audioSeconds: 0, vocabularySeconds: 0, readingSeconds: 0, speakingSeconds: 0 };
  const local = { ...empty, listeningSeconds: 6 * 3_600 + 24 * 60, totalSeconds: 6 * 3_600 + 24 * 60, updatedAt: '2026-10-01T10:00:00Z' };
  const remoteAfterPendingUpload = { ...empty, listeningSeconds: 3 * 3_600 + 60, totalSeconds: 3 * 3_600 + 60, updatedAt: '2026-10-01T10:00:00Z' };

  const events = buildActivityBaselineEvents(local, remoteAfterPendingUpload, 'student-1', 'phone-1');
  assert.equal(events[0]?.activeSeconds, 3 * 3_600 + 23 * 60);
});
