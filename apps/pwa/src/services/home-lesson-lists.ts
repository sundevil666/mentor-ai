export function belongsToRequiredLessons(hasCompletedOnce: boolean) {
  return !hasCompletedOnce;
}

export function belongsToStartedLessons(hasCompletedOnce: boolean, currentAttemptProgress: number) {
  return hasCompletedOnce && currentAttemptProgress > 1 && currentAttemptProgress < 100;
}
