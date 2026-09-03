export function calculateLessonSessionProgress(currentExerciseIndex: number, exerciseCount: number): number {
  if (exerciseCount <= 0) return 0;
  return Math.round((currentExerciseIndex / exerciseCount) * 100);
}

export function canFinishRepeatedLesson(
  lessonTemplateKey: string | undefined,
  completedLessonCounts: ReadonlyMap<string, number>,
): boolean {
  return Boolean(lessonTemplateKey && (completedLessonCounts.get(lessonTemplateKey) ?? 0) > 0);
}

export function getLessonExerciseNavigation(
  repeatedLesson: boolean,
  currentExerciseIndex: number,
  completionReady: boolean,
) {
  return {
    showPrevious: repeatedLesson,
    previousDisabled: currentExerciseIndex <= 0,
    nextLabel: repeatedLesson ? 'Next' : 'Continue',
    nextDisabled: !repeatedLesson && !completionReady,
  } as const;
}
