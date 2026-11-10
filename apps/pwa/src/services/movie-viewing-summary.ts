import type { MovieLearningReport } from '@mentor-ai/shared';

// The learner usually watches one 90–120 minute English-language film per
// report, so use the midpoint rather than pretending that runtime was timed.
export const estimatedMovieViewingSeconds = 105 * 60;

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
