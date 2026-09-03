import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clearSuccessfulSpeakingExerciseKeys,
  createSpeakingExerciseProgressKey,
  readSuccessfulSpeakingExerciseKeys,
  saveSuccessfulSpeakingExerciseKey,
} from '../src/services/speaking-exercise-progress.js';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('Lesson exercise progress', () => {
  it('creates a stable key from the lesson, step, and normalized answer', () => {
    assert.equal(
      createSpeakingExerciseProgressKey('polite-speaking', 2, '  Could you   repeat that PLEASE '),
      'polite-speaking:2:could you repeat that please',
    );
    assert.equal(createSpeakingExerciseProgressKey(undefined, 2, 'answer'), null);
  });

  it('uses the same persistent progress for listening-text exercises', () => {
    const storage = createStorage();
    const exerciseKey = createSpeakingExerciseProgressKey('commute-listening', 0, 'listened');
    assert.ok(exerciseKey);

    saveSuccessfulSpeakingExerciseKey('student-1', exerciseKey, storage);
    assert.equal(readSuccessfulSpeakingExerciseKeys('student-1', storage).has(exerciseKey), true);
  });

  it('remembers a successful exercise for one student until learning data is cleared', () => {
    const storage = createStorage();
    const exerciseKey = 'polite-speaking:2:could you repeat that please';

    saveSuccessfulSpeakingExerciseKey('student-1', exerciseKey, storage);
    assert.deepEqual([...readSuccessfulSpeakingExerciseKeys('student-1', storage)], [exerciseKey]);
    assert.deepEqual([...readSuccessfulSpeakingExerciseKeys('student-2', storage)], []);

    clearSuccessfulSpeakingExerciseKeys('student-1', storage);
    assert.deepEqual([...readSuccessfulSpeakingExerciseKeys('student-1', storage)], []);
  });
});
