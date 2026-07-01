import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { learningStateService } from '../dist/services/learning-state.service.js';

describe('learning state service', () => {
  it('returns student state and generates a current lesson', async () => {
    const studentState = await learningStateService.getStudentState();
    const lesson = await learningStateService.getCurrentLesson();

    assert.equal(studentState.student.id, 'demo-student');
    assert.equal(studentState.studentModel.version >= 1, true);
    assert.equal(lesson.exercises.length > 0, true);
    assert.equal(lesson.studentModelVersion, studentState.studentModel.version);
  });

  it('does not reuse an unsuitable current lesson for listening mode', async () => {
    const lesson = await learningStateService.getCurrentLesson({
      mode: 'listening',
      isOffline: false,
      speechAvailable: true,
      availableMinutes: 8,
    });

    assert.equal(lesson.targetSkills.includes('listening'), true);
    assert.equal(
      lesson.exercises.some(
        (exercise) =>
          exercise.type === 'listening-text' ||
          (exercise.targetSkill === 'listening' && typeof exercise.audioText === 'string' && exercise.audioText.length > 0),
      ),
      true,
    );
    assert.equal(lesson.exercises[0].type, 'listening-text');
    assert.equal(lesson.exercises[0].audioText.split(/\s+/).length >= 1100, true);
  });

  it('does not reuse the cached listening lesson for speaking mode', async () => {
    const listeningLesson = await learningStateService.getCurrentLesson({
      mode: 'listening',
      isOffline: false,
      speechAvailable: true,
      availableMinutes: 8,
    });
    const speakingLesson = await learningStateService.getCurrentLesson({
      mode: 'speaking',
      isOffline: false,
      speechAvailable: true,
      availableMinutes: 8,
    });

    assert.equal(listeningLesson.exercises[0].type, 'listening-text');
    assert.equal(speakingLesson.title, 'Speaking confidence at work');
    assert.equal(speakingLesson.exercises.some((exercise) => exercise.type === 'repeat-speaking'), true);
  });

  it('does not reuse the cached current lesson when a lesson card requests a specific template', async () => {
    const readingLesson = await learningStateService.getCurrentLesson({
      mode: 'home',
      selectedConcept: 'reading',
      manualConceptChoice: true,
      lessonTemplateKey: 'message-reading',
      isOffline: false,
      speechAvailable: true,
      availableMinutes: 8,
    });
    const vocabularyLesson = await learningStateService.getCurrentLesson({
      mode: 'home',
      selectedConcept: 'vocabulary',
      manualConceptChoice: true,
      lessonTemplateKey: 'travel-vocabulary',
      isOffline: false,
      speechAvailable: true,
      availableMinutes: 8,
    });

    assert.equal(readingLesson.title, 'Reading: short work message');
    assert.equal(vocabularyLesson.title, 'Vocabulary Growth: travel words');
    assert.notEqual(readingLesson.exercises[0].prompt, vocabularyLesson.exercises[0].prompt);
    assert.equal(vocabularyLesson.exercises[0].prompt, 'Choose the meaning of "arrive".');
  });

  it('accepts new synchronized evidence and marks repeats as duplicates', async () => {
    const event = {
      id: `event-service-check-${Date.now()}`,
      studentId: 'demo-student',
      sessionId: 'session-service-check',
      lessonId: 'lesson-service-check',
      exerciseId: 'exercise-service-check',
      type: 'exercise-finished',
      occurredAt: '2026-06-28T10:30:00.000Z',
    };
    const result = {
      id: `result-service-check-${Date.now()}`,
      studentId: 'demo-student',
      sessionId: 'session-service-check',
      lessonId: 'lesson-service-check',
      exerciseId: 'exercise-service-check',
      exerciseType: 'word-order',
      targetSkill: 'grammar',
      response: 'where are you',
      correct: true,
      attempts: 1,
      responseTimeMs: 2400,
      completionState: 'completed',
      evidenceEventIds: [event.id],
      completedAt: '2026-06-28T10:30:01.000Z',
    };

    const firstSync = await learningStateService.synchronize([event], [result]);
    const duplicateSync = await learningStateService.synchronize([event], [result]);

    assert.equal(firstSync.acknowledgements[0]?.status, 'accepted');
    assert.equal(firstSync.statisticsSnapshots.length, 1);
    assert.equal(firstSync.student.id, 'demo-student');
    assert.equal(firstSync.studentModel.studentId, 'demo-student');
    assert.equal(firstSync.studentModelVersion >= 2, true);
    assert.equal(firstSync.recommendation.studentId, 'demo-student');
    assert.equal(duplicateSync.acknowledgements[0]?.status, 'duplicate');
  });

  it('analyzes delayed offline lessons as separate session snapshots', async () => {
    const createdAt = Date.now();
    const firstEvent = {
      id: `event-offline-batch-a-${createdAt}`,
      studentId: 'demo-student',
      sessionId: `session-offline-batch-a-${createdAt}`,
      lessonId: `lesson-offline-batch-a-${createdAt}`,
      exerciseId: 'exercise-offline-batch-a',
      type: 'exercise-finished',
      occurredAt: '2026-06-28T11:00:00.000Z',
    };
    const secondEvent = {
      id: `event-offline-batch-b-${createdAt}`,
      studentId: 'demo-student',
      sessionId: `session-offline-batch-b-${createdAt}`,
      lessonId: `lesson-offline-batch-b-${createdAt}`,
      exerciseId: 'exercise-offline-batch-b',
      type: 'exercise-finished',
      occurredAt: '2026-06-28T12:00:00.000Z',
    };
    const firstResult = {
      id: `result-offline-batch-a-${createdAt}`,
      studentId: 'demo-student',
      sessionId: firstEvent.sessionId,
      lessonId: firstEvent.lessonId,
      exerciseId: firstEvent.exerciseId,
      exerciseType: 'vocabulary-recall',
      targetSkill: 'vocabulary',
      correct: true,
      attempts: 1,
      responseTimeMs: 1800,
      completionState: 'completed',
      evidenceEventIds: [firstEvent.id],
      completedAt: '2026-06-28T11:00:02.000Z',
    };
    const secondResult = {
      id: `result-offline-batch-b-${createdAt}`,
      studentId: 'demo-student',
      sessionId: secondEvent.sessionId,
      lessonId: secondEvent.lessonId,
      exerciseId: secondEvent.exerciseId,
      exerciseType: 'repeat-speaking',
      targetSkill: 'speaking',
      correct: false,
      attempts: 1,
      responseTimeMs: 4200,
      completionState: 'completed',
      evidenceEventIds: [secondEvent.id],
      completedAt: '2026-06-28T12:00:04.000Z',
    };

    const sync = await learningStateService.synchronize([firstEvent, secondEvent], [firstResult, secondResult]);

    assert.equal(sync.acknowledgements.every((acknowledgement) => acknowledgement.status === 'accepted'), true);
    assert.equal(sync.statisticsSnapshots.length, 2);
    assert.deepEqual(
      sync.statisticsSnapshots.map((snapshot) => snapshot.sessionId),
      [firstEvent.sessionId, secondEvent.sessionId],
    );
    assert.deepEqual(
      sync.statisticsSnapshots.map((snapshot) => snapshot.lessonId),
      [firstEvent.lessonId, secondEvent.lessonId],
    );
    assert.equal(sync.statisticsSnapshots[0]?.speechAttempts, 0);
    assert.equal(sync.statisticsSnapshots[1]?.speechAttempts, 1);
  });

  it('stores in-progress session handoffs for continuing on another device', async () => {
    const createdAt = new Date().toISOString();
    const lesson = await learningStateService.getCurrentLesson();
    const handoff = {
      id: `handoff-demo-student-mobile-${Date.now()}`,
      studentId: 'demo-student',
      sourceDevice: 'mobile',
      lesson,
      context: {
        mode: 'listening',
        isOffline: false,
        speechAvailable: true,
        availableMinutes: 8,
      },
      currentExerciseIndex: 0,
      startedAt: createdAt,
      exerciseStartedAt: createdAt,
      events: [],
      results: [],
      speechResults: [],
      updatedAt: createdAt,
    };

    const saved = await learningStateService.upsertSessionHandoff(handoff);
    const handoffs = await learningStateService.listSessionHandoffs();

    assert.equal(saved.studentId, 'demo-student');
    assert.equal(handoffs.some((item) => item.id === handoff.id && item.sourceDevice === 'mobile'), true);
  });
});
