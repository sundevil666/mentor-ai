import type { MovieLearningReport } from '@mentor-ai/shared';

export const estimatedMovieViewingSeconds = 2 * 60 * 60;

export interface MovieViewingSummary {
  movieCount: number;
  estimatedViewingSeconds: number;
}

export function summarizeMovieViewing(reports: readonly MovieLearningReport[]): MovieViewingSummary {
  return {
    movieCount: reports.length,
    estimatedViewingSeconds: reports.length * estimatedMovieViewingSeconds,
  };
}
