import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Exercise, GeneratedLesson, LearningContext } from '@mentor-ai/shared';
import { buildGeneratedLessonLinks, mergeAvailableLessonCatalog } from '../src/services/lesson-category-progress.js';
import { selectOfflineLesson } from '../src/services/offline-library.js';
import { isLessonAnswerReady } from '../src/services/lesson-answer-readiness.js';
import { getLessonExerciseNavigation } from '../src/services/home-lesson-progress.js';
import { dialoguePreviewStatus, getDialogueExpectedSegments, resolveDialogueExpectedText } from '../src/services/dialogue-speech.js';

function lesson(id: string, exercise: Exercise): GeneratedLesson {
  return {
    id, planId: `plan-${id}`, studentModelVersion: 1, concept: 'learning', conceptLevel: 'developing',
    activityType: 'guided-lesson',
    teacherDecision: {
      concept: 'learning', activityType: 'guided-lesson', levelDecision: 'hold', reason: 'Practice',
      nextRecommendedConcept: 'learning', nextRecommendedActivity: 'guided-lesson',
      createdAt: '2026-09-21T10:00:00.000Z',
    },
    title: `Practice ${id}`,
    purpose: 'Practice a sentence', targetSkills: [exercise.targetSkill], estimatedMinutes: 5,
    exercises: [exercise], localEvaluation: [], recovery: { fallbackMode: 'speaking', message: 'Try again' },
    createdAt: '2026-09-21T10:00:00.000Z',
  } as GeneratedLesson;
}

describe('generated lesson practice contract', () => {
  const correction = lesson('grammar-correction', {
    id: 'correct-sentence', type: 'word-order', targetSkill: 'grammar',
    prompt: 'Correct the sentence', microLesson: '', successTip: '',
    expectedResponse: 'She made him stay at home.',
  });
  const speaking = lesson('spoken-sentence', {
    id: 'say-sentence', type: 'dialogue-translation', targetSkill: 'speaking',
    prompt: 'Say in English', microLesson: '', successTip: '',
    expectedResponse: 'I want the play performed in the school theatre.',
  });
  const listening = lesson('listening-sentence', {
    id: 'hear-sentence', type: 'listening-comprehension', targetSkill: 'listening',
    prompt: 'Listen and answer', microLesson: '', successTip: '', expectedResponse: 'Yes',
  });

  it('keeps every available lesson on Home, in a real category, and openable from its link offline', () => {
    const catalog = mergeAvailableLessonCatalog([correction, speaking], [listening], null, []);
    const links = buildGeneratedLessonLinks(catalog);
    assert.equal(links.length, catalog.length);
    assert.deepEqual(Object.fromEntries(links.map(({ templateKey, category }) => [templateKey, category])), {
      'grammar-correction': 'grammar', 'spoken-sentence': 'speaking', 'listening-sentence': 'listening',
    });

    for (const source of catalog) {
      const link = links.find(({ templateKey }) => templateKey === source.id);
      assert.ok(link, `Home link missing for ${source.id}`);
      assert.ok(['grammar', 'listening', 'speaking'].includes(link.category));
      assert.notEqual(link.category as string, 'home');
      const context = {
        mode: link.mode, selectedConcept: source.concept, lessonTemplateKey: link.templateKey,
        isOffline: true, speechAvailable: true, availableMinutes: 5,
      } as LearningContext;
      assert.equal(selectOfflineLesson(catalog, context)?.id, source.id);
    }
  });

  it('allows Continue on a correction only for the complete accepted answer', () => {
    const exercise = correction.exercises[0]!;
    for (const answer of ['anything', 'to', 'She made him to stay at home.']) {
      const ready = isLessonAnswerReady(exercise, answer, correction.localEvaluation);
      assert.equal(ready, false, answer);
      assert.equal(getLessonExerciseNavigation(false, 0, ready, true).nextDisabled, true);
    }
    const ready = isLessonAnswerReady(exercise, 'she made him stay at home', correction.localEvaluation);
    assert.equal(ready, true);
    assert.equal(getLessonExerciseNavigation(false, 0, ready, true).nextDisabled, false);
  });

  it('gives the same correct result and word highlighting for a supported speech variant', () => {
    const expected = resolveDialogueExpectedText(speaking.exercises[0]!);
    const heard = 'I want the play performed in the school theater';
    assert.equal(dialoguePreviewStatus(heard, expected, true), 'correct');
    assert.equal(getDialogueExpectedSegments(heard, expected).filter(({ matched }) => matched === false).length, 0);
    assert.equal(dialoguePreviewStatus('I want the play performed in the school cafeteria', expected, true), 'incorrect');
  });
});
