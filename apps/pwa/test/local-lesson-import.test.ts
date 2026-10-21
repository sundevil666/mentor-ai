import assert from 'node:assert/strict';
import { it } from 'node:test';
import { parseLocalLessonImport } from '../src/services/local-lesson-import.js';
const lesson = { id: 'sample', planId: 'sample-plan', lessonTemplateKey: 'sample-template', concept: 'learning', conceptLevel: 'developing', activityType: 'guided-lesson', createdAt: '2026-01-01T00:00:00Z', teacherDecision: { reason: 'Practice' }, recovery: { message: 'Retry' }, title: 'Sample', purpose: 'Practice', targetSkills: ['speaking'], estimatedMinutes: 5, localEvaluation: [], exercises: [{ id: 'sample-step', type: 'repeat-speaking', prompt: 'Speak', expectedResponse: 'Hello', audioText: 'Hello' }] };
it('accepts a spoken library and rejects duplicate identities or missing speech targets', () => {
  assert.equal(parseLocalLessonImport(JSON.stringify({ lessons: [lesson] }))[0]?.id, 'sample');
  assert.throws(() => parseLocalLessonImport(JSON.stringify([lesson, lesson])));
  assert.throws(() => parseLocalLessonImport(JSON.stringify([{ ...lesson, exercises: [{ ...lesson.exercises[0], expectedResponse: '' }] }])));
  assert.throws(() => parseLocalLessonImport('null'));
});
