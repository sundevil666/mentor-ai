import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLessonPlan,
  decideNextTeacherAction,
  analyzePronunciationAttempt,
  createObservationFromResults,
  createRecommendationFromModel,
  createEvidenceId,
  demoStudent,
  generateLessonFromPlan,
  getWorkShiftTiming,
  initialStudentModel,
  isLessonDeliverable,
  nextModelVersion,
  scoreExercise,
  summarizeResults,
  updateStudentModelFromResults,
} from '../dist/index.js';

describe('shared domain helpers', () => {
  const conceptFields = {
    concept: 'learning',
    activityType: 'guided-lesson',
    conceptLevel: 'foundation',
    hintCount: 0,
    skipped: false,
    abandoned: false,
    repeatedMistake: false,
    teacherDecision: 'hold',
    reasonForLevelDecision: 'Test fixture.',
    daysSincePractice: 0,
    avoidancePattern: 'none',
    retentionRisk: 'low',
    reviewUrgency: 'none',
  };

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

  it('finds lightweight pronunciation focus words from a speaking attempt', () => {
    const issues = analyzePronunciationAttempt(
      'Where are you?',
      'Where you',
      '2026-06-28T08:00:00.000Z',
    );

    assert.equal(issues.length, 2);
    assert.equal(issues[0].word, 'are');
    assert.equal(issues[0].issueType, 'substitution');
    assert.equal(issues[1].word, 'you');
    assert.equal(issues[1].issueType, 'missing');
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
        ...conceptFields,
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
        ...conceptFields,
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

  it('keeps personal shift commute timing as durable statistics context', () => {
    assert.deepEqual(getWorkShiftTiming('first'), {
      shift: 'first',
      startsAt: '06:00',
      endsAt: '14:00',
      leaveHomeAt: '04:55',
      busLeavesAt: '05:10',
      busArrivesAt: '05:30',
      headphonesOffAt: '05:40',
    });

    assert.deepEqual(getWorkShiftTiming('third'), {
      shift: 'third',
      startsAt: '22:00',
      endsAt: '06:00',
      leaveHomeAt: '20:55',
      busLeavesAt: '21:10',
      busArrivesAt: '21:30',
      headphonesOffAt: '21:40',
    });
  });

  it('generates a deliverable lesson from the current Student Model and context', () => {
    const plan = createLessonPlan(
      initialStudentModel,
      { mode: 'home', isOffline: true, speechAvailable: true, availableMinutes: 8 },
      '2026-06-28T08:00:00.000Z',
    );
    const lesson = generateLessonFromPlan(plan, '2026-06-28T08:00:00.000Z');

    assert.equal(plan.studentModelVersion, initialStudentModel.version);
    assert.equal(plan.concept, 'reading');
    assert.equal(plan.targetSkills.includes('review'), true);
    assert.equal(isLessonDeliverable(lesson), true);
    assert.equal(lesson.exercises.length >= 3, true);
  });

  it('keeps README concepts distinct and gives each concept real lesson content', () => {
    const createdAt = '2026-06-28T08:00:00.000Z';
    const concepts = ['learning', 'reading', 'vocabulary'];
    const lessons = concepts.map((concept) => {
      const plan = createLessonPlan(
        initialStudentModel,
        {
          mode: 'home',
          selectedConcept: concept,
          manualConceptChoice: true,
          isOffline: true,
          speechAvailable: true,
          availableMinutes: 8,
        },
        createdAt,
      );

      return generateLessonFromPlan(plan, createdAt);
    });

    assert.deepEqual(
      lessons.map((lesson) => lesson.concept),
      concepts,
    );
    assert.equal(new Set(lessons.map((lesson) => lesson.title)).size, 3);

    for (const lesson of lessons) {
      assert.equal(isLessonDeliverable(lesson), true);
      assert.equal(lesson.exercises.length >= 3, true);
    }
  });

  it('treats quick listening and speaking as Learning subcategory lessons', () => {
    const createdAt = '2026-06-28T08:00:00.000Z';
    const listeningPlan = createLessonPlan(
      initialStudentModel,
      { mode: 'listening', isOffline: true, speechAvailable: true, availableMinutes: 8 },
      createdAt,
    );
    const speakingPlan = createLessonPlan(
      initialStudentModel,
      { mode: 'speaking', isOffline: true, speechAvailable: true, availableMinutes: 8 },
      createdAt,
    );
    const listeningLesson = generateLessonFromPlan(listeningPlan, createdAt);
    const speakingLesson = generateLessonFromPlan(speakingPlan, createdAt);

    assert.equal(listeningLesson.concept, 'learning');
    assert.equal(speakingLesson.concept, 'learning');
    assert.equal(listeningLesson.title, 'Commute listening routine');
    assert.equal(speakingLesson.title, 'Speaking confidence at work');
    assert.equal(
      listeningLesson.exercises.some((exercise) => exercise.type === 'listening-text'),
      true,
    );
    assert.equal(
      speakingLesson.exercises.some((exercise) => exercise.type === 'repeat-speaking'),
      true,
    );
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
        ...conceptFields,
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
        ...conceptFields,
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
    assert.equal(
      updatedModel.reviewPriorities.some((priority) => priority.skill === 'grammar'),
      true,
    );
    assert.equal(nextPlan.concept, 'reading');
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
        ...conceptFields,
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
    const observation = createObservationFromResults(
      demoStudent.id,
      results,
      '2026-06-28T08:04:00.000Z',
    );
    const recommendation = createRecommendationFromModel(updatedModel, '2026-06-28T08:05:00.000Z');

    assert.equal(observation?.skill, 'speaking');
    assert.deepEqual(observation?.evidenceIds, ['event-speaking']);
    assert.equal(recommendation.studentId, demoStudent.id);
    assert.equal(recommendation.reason.length > 0, true);
  });

  it('respects manual concept selection in lesson planning', () => {
    const plan = createLessonPlan(
      initialStudentModel,
      {
        mode: 'home',
        selectedConcept: 'reading',
        manualConceptChoice: true,
        isOffline: false,
        speechAvailable: true,
        availableMinutes: 6,
      },
      '2026-06-28T08:00:00.000Z',
    );

    assert.equal(plan.concept, 'reading');
    assert.equal(plan.activityType, 'reading-comprehension');
  });

  it('increases a concept level after stable evidence', () => {
    const results = ['a', 'b', 'c'].map((suffix) => ({
      id: `result-stable-${suffix}`,
      studentId: demoStudent.id,
      sessionId: 'session-stable',
      lessonId: 'lesson-stable',
      exerciseId: `exercise-stable-${suffix}`,
      exerciseType: 'vocabulary-recall',
      targetSkill: 'vocabulary',
      ...conceptFields,
      concept: 'vocabulary',
      activityType: 'vocabulary-recall',
      correct: true,
      attempts: 1,
      responseTimeMs: 2500,
      completionState: 'completed',
      evidenceEventIds: [`event-stable-${suffix}`],
      completedAt: '2026-06-28T08:01:00.000Z',
    }));

    const updatedModel = updateStudentModelFromResults(
      initialStudentModel,
      results,
      '2026-06-28T08:04:00.000Z',
    );

    assert.equal(updatedModel.teacherDecision.levelDecision, 'increase');
    assert.equal(
      updatedModel.conceptLevels.vocabulary.score.value >
        initialStudentModel.conceptLevels.vocabulary.score.value,
      true,
    );
  });

  it('decreases a concept level after overload evidence', () => {
    const results = ['a', 'b', 'c'].map((suffix) => ({
      id: `result-overload-${suffix}`,
      studentId: demoStudent.id,
      sessionId: 'session-overload',
      lessonId: 'lesson-overload',
      exerciseId: `exercise-overload-${suffix}`,
      exerciseType: 'listening-comprehension',
      targetSkill: 'listening',
      ...conceptFields,
      concept: 'reading',
      activityType: 'reading-comprehension',
      correct: false,
      attempts: 2,
      responseTimeMs: 15000,
      hintCount: 2,
      completionState: 'completed',
      evidenceEventIds: [`event-overload-${suffix}`],
      completedAt: '2026-06-28T08:01:00.000Z',
    }));

    const updatedModel = updateStudentModelFromResults(
      initialStudentModel,
      results,
      '2026-06-28T08:04:00.000Z',
    );

    assert.equal(updatedModel.teacherDecision.levelDecision, 'decrease');
    assert.equal(
      updatedModel.conceptLevels.reading.score.value <
        initialStudentModel.conceptLevels.reading.score.value,
      true,
    );
  });

  it('holds a concept level when recognition is correct but slow', () => {
    const result = {
      id: 'result-slow-hold',
      studentId: demoStudent.id,
      sessionId: 'session-slow-hold',
      lessonId: 'lesson-slow-hold',
      exerciseId: 'exercise-slow-hold',
      exerciseType: 'vocabulary-recall',
      targetSkill: 'vocabulary',
      ...conceptFields,
      concept: 'vocabulary',
      activityType: 'vocabulary-recall',
      correct: true,
      attempts: 1,
      responseTimeMs: 16000,
      completionState: 'completed',
      evidenceEventIds: ['event-slow-hold'],
      completedAt: '2026-06-28T08:01:00.000Z',
    };

    const decision = decideNextTeacherAction(
      initialStudentModel,
      {
        mode: 'home',
        selectedConcept: 'vocabulary',
        isOffline: false,
        speechAvailable: true,
        availableMinutes: 6,
      },
      [result],
      '2026-06-28T08:02:00.000Z',
    );

    assert.equal(decision.levelDecision, 'hold');
  });

  it('plans a recovery check after a long concept pause', () => {
    const pausedModel = {
      ...initialStudentModel,
      conceptLevels: {
        ...initialStudentModel.conceptLevels,
        reading: {
          ...initialStudentModel.conceptLevels.reading,
          lastPracticedAt: '2026-06-01T08:00:00.000Z',
        },
      },
    };
    const plan = createLessonPlan(
      pausedModel,
      { mode: 'home', isOffline: false, speechAvailable: true, availableMinutes: 6 },
      '2026-06-28T08:00:00.000Z',
    );

    assert.equal(plan.concept, 'reading');
    assert.equal(plan.activityType, 'recovery-check');
    assert.equal(plan.teacherDecision.reason.includes('not been practiced recently'), true);
  });

  it('detects avoided concepts from recent practice history', () => {
    const vocabularyOnlyModel = {
      ...initialStudentModel,
      conceptHistory: [1, 2, 3, 4].map((index) => ({
        concept: 'vocabulary',
        activityType: 'vocabulary-recall',
        practicedAt: `2026-06-2${index}T08:00:00.000Z`,
        accuracy: 1,
        averageResponseTimeMs: 2000,
        completionRate: 1,
        hintCount: 0,
        skippedCount: 0,
        abandonedCount: 0,
        teacherDecision: 'increase',
      })),
    };
    const plan = createLessonPlan(
      vocabularyOnlyModel,
      { mode: 'home', isOffline: false, speechAvailable: true, availableMinutes: 6 },
      '2026-06-28T08:00:00.000Z',
    );

    assert.equal(plan.concept, 'learning');
    assert.equal(plan.activityType, 'recovery-check');
  });
});
