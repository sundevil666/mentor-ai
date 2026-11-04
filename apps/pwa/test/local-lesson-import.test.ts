import assert from 'node:assert/strict';
import { it } from 'node:test';
import { parseLocalLessonImport, refreshImportedLessonSession } from '../src/services/local-lesson-import.js';
const lesson = { id: 'sample', planId: 'sample-plan', lessonTemplateKey: 'sample-template', concept: 'learning', conceptLevel: 'developing', activityType: 'guided-lesson', createdAt: '2026-01-01T00:00:00Z', teacherDecision: { reason: 'Practice' }, recovery: { message: 'Retry' }, title: 'Sample', purpose: 'Practice', targetSkills: ['speaking'], estimatedMinutes: 5, localEvaluation: [], exercises: [{ id: 'sample-step', type: 'repeat-speaking', prompt: 'Speak', expectedResponse: 'Hello', audioText: 'Hello' }] };
it('accepts a spoken library and rejects duplicate identities or missing speech targets', () => {
  assert.equal(parseLocalLessonImport(JSON.stringify({ lessons: [lesson] }))[0]?.id, 'sample');
  assert.throws(() => parseLocalLessonImport(JSON.stringify([lesson, lesson])));
  assert.throws(() => parseLocalLessonImport(JSON.stringify([{ ...lesson, exercises: [{ ...lesson.exercises[0], expectedResponse: '' }] }])));
  assert.throws(() => parseLocalLessonImport('null'));
});
it('refreshes a resumed step without resetting progress, evidence or original release date', () => {
  const original = parseLocalLessonImport(JSON.stringify([lesson]))[0]!;
  const session = { lesson: original, currentExerciseIndex: 0, results: [{ correct: true }], events: ['saved'], startedAt: 'earlier' };
  const replacement = { ...original, createdAt: 'later', exercises: [{ ...original.exercises[0]!, prompt: 'Updated instruction' }] };
  const refreshed = refreshImportedLessonSession(session, [replacement]);
  assert.equal(refreshed.lesson.exercises[0]?.prompt, 'Updated instruction');
  assert.equal(refreshed.lesson.createdAt, original.createdAt);
  assert.equal(refreshed.currentExerciseIndex, session.currentExerciseIndex);
  assert.strictEqual(refreshed.results, session.results);
  assert.strictEqual(refreshed.events, session.events);
  assert.equal(refreshed.startedAt, session.startedAt);
  assert.equal(session.lesson.exercises[0]?.prompt, 'Speak');
  assert.strictEqual(refreshImportedLessonSession(session, [{ ...replacement, exercises: [] }]), session);
  assert.strictEqual(refreshImportedLessonSession(session, [{ ...replacement, exercises: [{ ...replacement.exercises[0]!, id: 'different' }] }]), session);
  const completed = { ...session, completedAt: 'finished' };
  assert.strictEqual(refreshImportedLessonSession(completed, [replacement]), completed);
});
it('accepts mixed written recall and spoken steps while retaining required microphone audio', () => {
  const written = { ...lesson.exercises[0], id: 'written-step', type: 'vocabulary-recall', prompt: 'Write the answer', audioText: undefined };
  const mixed = { ...lesson, exercises: [written, lesson.exercises[0]] };
  assert.equal(parseLocalLessonImport(JSON.stringify([mixed]))[0]?.exercises.length, 2);
  assert.throws(() => parseLocalLessonImport(JSON.stringify([{ ...mixed, exercises: [written, { ...lesson.exercises[0], audioText: undefined }] }])));
  assert.throws(() => parseLocalLessonImport(JSON.stringify([{ ...lesson, exercises: [{ ...written, type: 'unknown' }] }])));
});
