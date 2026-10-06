import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { visibleMovieReportPages } from '../src/services/movie-report-pagination.js';

describe('movie report pagination', () => {
  it('shows every page when there are no more than five', () => {
    assert.deepEqual(visibleMovieReportPages(1, 1), [1]);
    assert.deepEqual(visibleMovieReportPages(3, 5), [1, 2, 3, 4, 5]);
  });

  it('keeps the first, nearby and last pages visible near the beginning', () => {
    assert.deepEqual(visibleMovieReportPages(1, 10), [1, 2, 3, 4, 10]);
    assert.deepEqual(visibleMovieReportPages(2, 10), [1, 2, 3, 4, 10]);
  });

  it('centers the current page and keeps both boundaries when possible', () => {
    assert.deepEqual(visibleMovieReportPages(6, 12), [1, 5, 6, 7, 12]);
  });

  it('keeps five pages visible near the end', () => {
    assert.deepEqual(visibleMovieReportPages(12, 12), [1, 9, 10, 11, 12]);
  });
});
