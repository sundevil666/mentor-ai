import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MovieLearningReport } from '@mentor-ai/shared';
import { createMovieReport, synchronizeMovieReports, type MovieReportStorage } from '../src/services/movie-learning-report-outbox.js';

class MemoryMovieReportStorage implements MovieReportStorage {
  reports = new Map<string, MovieLearningReport>();
  async list() { return [...this.reports.values()]; }
  async put(report: MovieLearningReport) { this.reports.set(report.id, report); }
}

describe('movie learning reports', () => {
  it('keeps a report locally when the database upload fails', async () => {
    const storage = new MemoryMovieReportStorage();
    const report = createMovieReport({ studentId: 'student', movieTitle: 'Arrival', watchedAt: '2026-09-27', report: 'Fast speech was difficult.' }, 'device', 'report-1', '2026-09-27T18:00:00.000Z');
    await storage.put(report);

    await assert.rejects(synchronizeMovieReports(storage, async () => { throw new Error('DB blocked'); }, true));
    assert.equal((await storage.list())[0]?.synchronizedAt, undefined);
  });

  it('marks only acknowledged reports as synchronized', async () => {
    const storage = new MemoryMovieReportStorage();
    const first = createMovieReport({ studentId: 'student', movieTitle: 'Arrival', watchedAt: '2026-09-27', report: 'Report one' }, 'device', 'report-1', '2026-09-27T18:00:00.000Z');
    const second = createMovieReport({ studentId: 'student', movieTitle: 'Dune', watchedAt: '2026-09-26', report: 'Report two' }, 'device', 'report-2', '2026-09-27T18:01:00.000Z');
    await storage.put(first);
    await storage.put(second);

    assert.equal(await synchronizeMovieReports(storage, async () => [first], true), 1);
    const saved = await storage.list();
    assert.equal(saved.find((item) => item.id === first.id)?.synchronizedAt, first.updatedAt);
    assert.equal(saved.find((item) => item.id === second.id)?.synchronizedAt, undefined);
  });

  it('does not upload while offline', async () => {
    const storage = new MemoryMovieReportStorage();
    await storage.put(createMovieReport({ studentId: 'student', movieTitle: 'Arrival', watchedAt: '2026-09-27', report: 'Report' }, 'device'));
    let calls = 0;
    assert.equal(await synchronizeMovieReports(storage, async () => { calls += 1; return []; }, false), 0);
    assert.equal(calls, 0);
  });
});
