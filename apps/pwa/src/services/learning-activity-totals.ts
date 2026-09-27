import type { LearningActivityTotals } from '@mentor-ai/shared';

export function preferLocalTotals(local: LearningActivityTotals, remote: LearningActivityTotals): LearningActivityTotals {
  const grammarSeconds = Math.max(local.grammarSeconds ?? 0, remote.grammarSeconds ?? 0);
  const listeningSeconds = Math.max(local.listeningSeconds ?? 0, remote.listeningSeconds ?? 0);
  const speakingSeconds = Math.max(local.speakingSeconds ?? 0, remote.speakingSeconds ?? 0);
  const phrasesSeconds = Math.max(local.phrasesSeconds ?? 0, remote.phrasesSeconds ?? 0);
  const audioSeconds = Math.max(local.audioSeconds ?? 0, remote.audioSeconds ?? 0);
  const readingSeconds = Math.max(local.readingSeconds ?? 0, remote.readingSeconds ?? 0);
  const vocabularySeconds = Math.max(local.vocabularySeconds ?? 0, remote.vocabularySeconds ?? 0);
  return {
    grammarSeconds, listeningSeconds, speakingSeconds, phrasesSeconds, audioSeconds, readingSeconds, vocabularySeconds,
    totalSeconds: grammarSeconds + listeningSeconds + speakingSeconds + phrasesSeconds + audioSeconds + readingSeconds + vocabularySeconds,
    updatedAt: !local.updatedAt || (remote.updatedAt && remote.updatedAt > local.updatedAt) ? remote.updatedAt : local.updatedAt,
  };
}
