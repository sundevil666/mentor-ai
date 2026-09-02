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

export function calculateLessonRemainingRatio(progressRatio: number): number {
  return 1 - clampRatio(progressRatio);
}

function clampRatio(value: number): number {
  return Math.min(1, Math.max(0, value));
}
