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
    assert.equal(firstSync.studentModelVersion >= 2, true);
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
});
