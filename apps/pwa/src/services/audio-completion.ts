import type { ContentProgress } from '@mentor-ai/shared';
import type { ContentEngagementSummary } from './content-engagement-summary.js';

export function isAudioPlaybackCompleted(
  progress: Pick<ContentProgress, 'completed'> | undefined,
  engagement: Pick<ContentEngagementSummary, 'finishes' | 'fullPlays'> | undefined,
) {
  return Boolean(progress?.completed || engagement?.finishes || engagement?.fullPlays);
}
