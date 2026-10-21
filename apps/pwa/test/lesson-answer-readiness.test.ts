import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Exercise, LocalEvaluationRule } from '@mentor-ai/shared';
import { isLessonAnswerReady, requiresExactLessonAnswer, requiresSpokenLessonAnswer } from '../src/services/lesson-answer-readiness.js';
import { getLessonExerciseNavigation } from '../src/services/home-lesson-progress.js';

describe('typed lesson answer readiness', () => {
  const correction = {
    id: 'make-correction',
    type: 'word-order',
    prompt: 'Correct: The illness made him to stay at home.',
    expectedResponse: 'The illness made him stay at home.',
  } as Exercise;

  it('keeps Continue disabled until the whole corrected sentence is entered', () => {
    const rules: LocalEvaluationRule[] = [];
    assert.equal(requiresExactLessonAnswer(correction, rules), true);
    for (const answer of ['anything', 'to', 'stay', 'The illness made him to stay at home.']) {
      assert.equal(isLessonAnswerReady(correction, answer, rules), false, answer);
      assert.equal(getLessonExerciseNavigation(false, 0, isLessonAnswerReady(correction, answer, rules), true).nextDisabled, true);
    }
    assert.equal(isLessonAnswerReady(correction, 'the illness made him stay at home', rules), true);
    assert.equal(getLessonExerciseNavigation(false, 0, true, true).nextDisabled, false);
    assert.equal(getLessonExerciseNavigation(true, 0, false, true).nextDisabled, true);
  });

  it('accepts an explicitly allowed alternative and keeps open answers usable', () => {
    const rules = [{ exerciseId: correction.id, acceptedResponses: ['His illness made him stay home.'] }];
    assert.equal(isLessonAnswerReady(correction, 'His illness made him stay home', rules), true);
    assert.equal(isLessonAnswerReady({ ...correction, expectedResponse: undefined }, 'my own sentence', []), true);
  });
});

describe('spoken lesson input', () => {
  it('uses the recorder for dialogue and full spoken responses, keeping writing typed', () => {
    assert.equal(requiresSpokenLessonAnswer({ type: 'repeat-speaking' }), true);
    assert.equal(requiresSpokenLessonAnswer({ type: 'dialogue-translation' }), true);
    assert.equal(requiresSpokenLessonAnswer({ type: 'word-order' }), false);
    assert.equal(getLessonExerciseNavigation(true, 0, false, true).nextDisabled, true);
  });
});
