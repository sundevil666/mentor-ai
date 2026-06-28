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
});
