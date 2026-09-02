export function calculateLessonProgressRatio(
  currentExerciseIndex: number,
  exerciseProgress: number,
  exerciseCount: number,
  completed: boolean,
): number {
  if (exerciseCount <= 0) return 0;
  if (completed) return 1;

  return clampRatio((currentExerciseIndex + clampRatio(exerciseProgress)) / exerciseCount);
}

export function calculatePlaybackProgress(currentTime: number, duration: number): number {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return 0;
  return clampRatio(currentTime / duration);
}

export function estimateAudioTotalSeconds(
  wordCount: number,
  measuredDurationSeconds = 0,
  measuredWordCount = 0,
): number {
  if (measuredDurationSeconds > 0 && measuredWordCount > 0) {
    return Math.max(1, measuredDurationSeconds / measuredWordCount * wordCount);
  }

  return Math.max(1, Math.round(wordCount / 2.2));
}

export function calculateRemainingSeconds(totalSeconds: number, progressRatio: number): number {
  return Math.max(0, Math.round(totalSeconds * (1 - clampRatio(progressRatio))));
}

export function formatRemainingClockTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `-${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function clampRatio(value: number): number {
  return Math.min(1, Math.max(0, value));
}
