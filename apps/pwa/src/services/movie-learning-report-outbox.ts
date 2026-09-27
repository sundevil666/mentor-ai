import type { MovieLearningReport } from '@mentor-ai/shared';

export interface MovieReportStorage {
  list(): Promise<MovieLearningReport[]>;
  put(report: MovieLearningReport): Promise<void>;
}

export function createMovieReport(
  input: { studentId: string; movieTitle: string; watchedAt: string; report: string },
  sourceDeviceId: string,
  id = `movie-report:${crypto.randomUUID()}`,
  createdAt = new Date().toISOString(),
): MovieLearningReport {
  return {
    id,
    studentId: input.studentId,
    movieTitle: input.movieTitle.trim().slice(0, 160),
    watchedAt: input.watchedAt,
    report: input.report.trim().slice(0, 20_000),
    sourceDeviceId,
    createdAt,
    updatedAt: createdAt,
  };
}

export async function synchronizeMovieReports(
  storage: MovieReportStorage,
  upload: (reports: MovieLearningReport[]) => Promise<MovieLearningReport[]>,
  online: boolean,
) {
  if (!online) return 0;
  const pending = (await storage.list())
    .filter((report) => !report.synchronizedAt)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(0, 50);
  if (!pending.length) return 0;
  const acknowledged = await upload(pending);
  const acknowledgedIds = new Set(acknowledged.map((report) => report.id));
  for (const report of pending) {
    if (acknowledgedIds.has(report.id)) await storage.put({ ...report, synchronizedAt: report.updatedAt });
  }
  return acknowledgedIds.size;
}
