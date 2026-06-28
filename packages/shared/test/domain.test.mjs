import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLessonPlan,
  createObservationFromResults,
  createRecommendationFromModel,
  createEvidenceId,
  demoStudent,
  generateLessonFromPlan,
  initialStudentModel,
  isLessonDeliverable,
  nextModelVersion,
  scoreExercise,
  summarizeResults,
  updateStudentModelFromResults,
} from '../dist/index.js';

describe('shared domain helpers', () => {
  it('creates stable evidence ids from student, session, and event identity', () => {
    assert.equal(
      createEvidenceId({
        id: 'event-1',
        studentId: 'student-1',
        sessionId: 'session-1',
      }),
      'student-1:session-1:event-1',
    );
  });

  it('validates only deliverable generated lessons', () => {
    const lesson = {
      id: 'lesson-1',
      planId: 'plan-1',
      studentModelVersion: 1,
      title: 'Question word order',
      purpose: 'Stabilize word order in simple questions.',
      targetSkills: ['grammar'],
      estimatedMinutes: 6,
      exercises: [
        {
          id: 'exercise-1',
          type: 'word-order',
          prompt: 'Order the words: you / are / where',
          targetSkill: 'grammar',
          expectedResponse: 'where are you',
        },
      ],
      localEvaluation: [{ exerciseId: 'exercise-1', acceptedResponses: ['where are you'] }],
      recovery: { fallbackMode: 'review', message: 'Return to a shorter review.' },
      createdAt: '2026-06-28T08:00:00.000Z',
    };

    assert.equal(isLessonDeliverable(lesson), true);
    assert.equal(isLessonDeliverable({ ...lesson, purpose: '' }), false);
  });

  it('scores exact expected responses and accepts any non-empty speech fallback response', () => {
    assert.equal(
      scoreExercise(
        {
          id: 'exercise-1',
          type: 'vocabulary-recall',
          prompt: 'Translate: dobrý deň',
          targetSkill: 'vocabulary',
          expectedResponse: 'good afternoon',
        },
        ' Good Afternoon ',
      ),
      true,
    );

    assert.equal(
      scoreExercise(
        {
          id: 'exercise-2',
          type: 'repeat-speaking',
          prompt: 'Repeat the sentence.',
          targetSkill: 'speaking',
        },
        'spoken attempt',
      ),
      true,
    );
  });

  it('summarizes completed exercise results conservatively', () => {
    const summary = summarizeResults([
      {
        id: 'result-1',
        studentId: 'student-1',
        sessionId: 'session-1',
        lessonId: 'lesson-1',
        exerciseId: 'exercise-1',
        exerciseType: 'vocabulary-recall',
        targetSkill: 'vocabulary',
        response: 'hello',
        correct: true,
        attempts: 1,
        responseTimeMs: 3000,
        completionState: 'completed',
        evidenceEventIds: ['event-1'],
        completedAt: '2026-06-28T08:00:00.000Z',
      },
      {
        id: 'result-2',
        studentId: 'student-1',
        sessionId: 'session-1',
        lessonId: 'lesson-1',
        exerciseId: 'exercise-2',
        exerciseType: 'word-order',
        targetSkill: 'grammar',
        response: 'you are where',
        correct: false,
        attempts: 2,
        responseTimeMs: 13000,
        completionState: 'completed',
        evidenceEventIds: ['event-2'],
        completedAt: '2026-06-28T08:01:00.000Z',
      },
    ]);

    assert.equal(summary.accuracy, 0.5);
    assert.equal(summary.averageResponseTimeMs, 8000);
    assert.equal(summary.attempts, 3);
    assert.equal(summary.completedExercises, 2);
    assert.equal(summary.fatigueSignal.confidence, 0.3);
  });

  it('increments Student Model versions explicitly', () => {
    assert.equal(nextModelVersion({ version: 4 }), 5);
  });

  it('generates a deliverable lesson from the current Student Model and context', () => {
    const plan = createLessonPlan(
      initialStudentModel,
      { mode: 'home', isOffline: true, speechAvailable: true, availableMinutes: 8 },
      '2026-06-28T08:00:00.000Z',
    );
    const lesson = generateLessonFromPlan(plan, '2026-06-28T08:00:00.000Z');

    assert.equal(plan.studentModelVersion, initialStudentModel.version);
    assert.equal(plan.targetSkills.includes('review'), true);
    assert.equal(isLessonDeliverable(lesson), true);
    assert.equal(lesson.exercises.length, 5);
  });

  it('updates the Student Model from lesson evidence and changes the next plan', () => {
    const results = [
      {
        id: 'result-grammar',
        studentId: demoStudent.id,
        sessionId: 'session-1',
        lessonId: 'lesson-1',
        exerciseId: 'exercise-grammar',
        exerciseType: 'word-order',
        targetSkill: 'grammar',
        response: 'you are where',
        correct: false,
        attempts: 2,
        responseTimeMs: 14000,
        completionState: 'completed',
        evidenceEventIds: ['event-grammar'],
        completedAt: '2026-06-28T08:01:00.000Z',
      },
      {
        id: 'result-vocabulary',
        studentId: demoStudent.id,
        sessionId: 'session-1',
        lessonId: 'lesson-1',
        exerciseId: 'exercise-vocabulary',
        exerciseType: 'vocabulary-recall',
        targetSkill: 'vocabulary',
        response: 'good afternoon',
        correct: true,
        attempts: 1,
        responseTimeMs: 3000,
        completionState: 'completed',
        evidenceEventIds: ['event-vocabulary'],
        completedAt: '2026-06-28T08:02:00.000Z',
      },
    ];

    const updatedModel = updateStudentModelFromResults(
      initialStudentModel,
      results,
      '2026-06-28T08:03:00.000Z',
    );
    const nextPlan = createLessonPlan(
      updatedModel,
      { mode: 'recovery', isOffline: false, speechAvailable: true, availableMinutes: 6 },
      '2026-06-28T08:04:00.000Z',
    );

    assert.equal(updatedModel.version, 2);
    assert.equal(updatedModel.grammar.score.value < initialStudentModel.grammar.score.value, true);
    assert.equal(updatedModel.reviewPriorities.some((priority) => priority.skill === 'grammar'), true);
    assert.equal(nextPlan.goal.skill, 'grammar');
    assert.equal(nextPlan.difficulty, 'supportive');
  });

  it('creates evidence-grounded observation and recommendation records', () => {
    const results = [
      {
        id: 'result-speaking',
        studentId: demoStudent.id,
        sessionId: 'session-1',
        lessonId: 'lesson-1',
        exerciseId: 'exercise-speaking',
        exerciseType: 'repeat-speaking',
        targetSkill: 'speaking',
        response: '',
        correct: false,
        attempts: 1,
        responseTimeMs: 9000,
        completionState: 'completed',
        evidenceEventIds: ['event-speaking'],
        completedAt: '2026-06-28T08:01:00.000Z',
      },
    ];
    const updatedModel = updateStudentModelFromResults(
      initialStudentModel,
      results,
      '2026-06-28T08:03:00.000Z',
    );
    const observation = createObservationFromResults(demoStudent.id, results, '2026-06-28T08:04:00.000Z');
    const recommendation = createRecommendationFromModel(updatedModel, '2026-06-28T08:05:00.000Z');

    assert.equal(observation?.skill, 'speaking');
    assert.deepEqual(observation?.evidenceIds, ['event-speaking']);
    assert.equal(recommendation.studentId, demoStudent.id);
    assert.equal(recommendation.reason.length > 0, true);
  });
});
