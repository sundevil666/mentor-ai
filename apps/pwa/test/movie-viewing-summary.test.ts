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
