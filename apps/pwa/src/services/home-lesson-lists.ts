export function belongsToRequiredLessons(isRequired: boolean, hasCompletedOnce: boolean) {
  return isRequired && !hasCompletedOnce;
}

export function belongsToStartedLessons(isRequired: boolean, currentAttemptProgress: number) {
  return !isRequired && currentAttemptProgress > 1 && currentAttemptProgress < 100;
}
