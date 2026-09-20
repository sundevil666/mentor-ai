import type { LearningActivityTotals } from '@mentor-ai/shared';

export function preferLocalTotals(local: LearningActivityTotals, remote: LearningActivityTotals): LearningActivityTotals {
  const listeningSeconds = Math.max(local.listeningSeconds, remote.listeningSeconds);
  const readingSeconds = Math.max(local.readingSeconds, remote.readingSeconds);
  const speakingSeconds = Math.max(local.speakingSeconds, remote.speakingSeconds);
  return {
    listeningSeconds,
    readingSeconds,
    speakingSeconds,
    totalSeconds: listeningSeconds + readingSeconds + speakingSeconds,
    updatedAt: !local.updatedAt || (remote.updatedAt && remote.updatedAt > local.updatedAt) ? remote.updatedAt : local.updatedAt,
  };
}
