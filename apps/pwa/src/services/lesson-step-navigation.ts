import type { ExerciseResult, LearningEvent, SpeechResult } from '@mentor-ai/shared';

export interface RewindableLessonSession {
  currentExerciseIndex: number;
  exerciseStartedAt: string;
  lesson: { exercises: Array<{ id: string }> };
  events: LearningEvent[];
  results: ExerciseResult[];
  speechResults: SpeechResult[];
}

export function rewindLessonSession(
  session: RewindableLessonSession,
  revisitedAt: string,
): string | null {
  if (session.currentExerciseIndex <= 0) {
    return null;
  }

  const previousIndex = session.currentExerciseIndex - 1;
  const previousExercise = session.lesson.exercises[previousIndex];

  if (!previousExercise) {
    return null;
  }

  session.currentExerciseIndex = previousIndex;
  session.exerciseStartedAt = revisitedAt;
  const rewoundExerciseIds = new Set(
    session.lesson.exercises.slice(previousIndex).map((exercise) => exercise.id),
  );
  session.events = session.events.filter(
    (event) => !event.exerciseId || !rewoundExerciseIds.has(event.exerciseId),
  );
  session.results = session.results.filter((result) => !rewoundExerciseIds.has(result.exerciseId));
  session.speechResults = session.speechResults.filter(
    (result) => !rewoundExerciseIds.has(result.exerciseId),
  );

  return previousExercise.id;
}
