import assert from 'node:assert/strict';
import test from 'node:test';
import type { MovieLearningReport } from '@mentor-ai/shared';
import { estimatedMovieViewingSeconds, summarizeMovieViewing } from '../src/services/movie-viewing-summary.js';

function report(id: string): MovieLearningReport {
  return {
    id,
    studentId: 'student-1',
    movieTitle: `Movie ${id}`,
    watchedAt: '2026-10-01',
    report: 'Learning report',
    sourceDeviceId: 'device-1',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };
}

test('summarizes movie reports using the shared approximate runtime', () => {
  assert.equal(estimatedMovieViewingSeconds, 105 * 60);
  assert.deepEqual(summarizeMovieViewing([report('1'), report('2'), report('3')]), {
    movieCount: 3,
    estimatedViewingSeconds: 3 * estimatedMovieViewingSeconds,
  });
});

test('returns an empty summary when there are no movie reports', () => {
  assert.deepEqual(summarizeMovieViewing([]), {
    movieCount: 0,
    estimatedViewingSeconds: 0,
  });
});

test('filters movie estimates by the viewing date window', () => {
  const recent = report('recent');
  recent.watchedAt = '2026-11-09';
  const old = report('old');
  old.watchedAt = '2026-09-01';
  assert.deepEqual(summarizeMovieViewing([recent, old], {
    since: new Date('2026-10-11T00:00:00.000Z'),
    until: new Date('2026-11-10T23:59:59.000Z'),
  }), { movieCount: 1, estimatedViewingSeconds: estimatedMovieViewingSeconds });
});
