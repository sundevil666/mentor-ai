import type { MovieLearningReport } from '@mentor-ai/shared';

// The learner usually watches one 90–120 minute English-language film per
// report, so use the midpoint rather than pretending that runtime was timed.
export const estimatedMovieViewingSeconds = 105 * 60;

export interface MovieViewingSummary {
  movieCount: number;
  estimatedViewingSeconds: number;
}

export function summarizeMovieViewing(reports: readonly MovieLearningReport[], options?: { since?: Date; until?: Date }): MovieViewingSummary {
  const filteredReports = reports.filter((report) => {
    const watchedAt = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(report.watchedAt) ? `${report.watchedAt}T12:00:00` : report.watchedAt);
    return Number.isFinite(watchedAt)
      && (!options?.since || watchedAt >= options.since.getTime())
      && (!options?.until || watchedAt <= options.until.getTime());
  });
  return {
    movieCount: filteredReports.length,
    estimatedViewingSeconds: filteredReports.length * estimatedMovieViewingSeconds,
  };
}
