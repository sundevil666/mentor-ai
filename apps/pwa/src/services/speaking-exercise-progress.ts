const storageKeyPrefix = 'mentor-ai:speaking-exercise-successes:';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createSpeakingExerciseProgressKey(
  lessonTemplateKey: string | undefined,
  exerciseIndex: number,
  expectedResponse: string | undefined,
): string | null {
  const normalizedResponse = expectedResponse?.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  if (!lessonTemplateKey || !normalizedResponse || exerciseIndex < 0) return null;
  return `${lessonTemplateKey}:${exerciseIndex}:${normalizedResponse}`;
}

export function readSuccessfulSpeakingExerciseKeys(
  studentId: string,
  storage: StorageLike | undefined = browserStorage(),
): Set<string> {
  if (!storage) return new Set();

  try {
    const value = storage.getItem(storageKey(studentId));
    const parsed = value ? JSON.parse(value) as unknown : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveSuccessfulSpeakingExerciseKey(
  studentId: string,
  exerciseKey: string,
  storage: StorageLike | undefined = browserStorage(),
): Set<string> {
  const successfulKeys = readSuccessfulSpeakingExerciseKeys(studentId, storage);
  successfulKeys.add(exerciseKey);
  try {
    storage?.setItem(storageKey(studentId), JSON.stringify([...successfulKeys]));
  } catch {
    // Keep the successful state for this page even when private storage is unavailable.
  }
  return successfulKeys;
}

export function clearSuccessfulSpeakingExerciseKeys(
  studentId: string,
  storage: StorageLike | undefined = browserStorage(),
) {
  try {
    storage?.removeItem(storageKey(studentId));
  } catch {
    // Resetting the rest of the local learning data must still continue.
  }
}

function storageKey(studentId: string) {
  return `${storageKeyPrefix}${studentId}`;
}

function browserStorage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage;
}
