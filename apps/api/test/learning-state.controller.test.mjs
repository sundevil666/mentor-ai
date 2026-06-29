import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getConfiguration,
  getCurrentLesson,
  getStudentState,
  synchronizeLearningEvents,
  upsertSessionHandoff,
} from '../dist/controllers/learning-state.controller.js';

describe('learning state controllers', () => {
  it('returns configuration as an API response envelope', async () => {
    const { res } = createMockResponse();

    await getConfiguration({}, res);

    assert.equal(res.body.data.supportedLanguages.includes('en'), true);
    assert.equal(res.body.data.synchronizationProtocolVersion, 1);
    assert.equal(res.body.data.speech.advancedPronunciationScoring, false);
  });

  it('returns current student state and lessons through controllers', async () => {
    const studentState = createMockResponse();
    const lesson = createMockResponse();

    await getStudentState({}, studentState.res, throwNext);
    await getCurrentLesson({ body: {} }, lesson.res, throwNext);

    assert.equal(studentState.res.body.data.student.id, 'demo-student');
    assert.equal(lesson.res.body.data.exercises.length > 0, true);
    assert.equal(typeof lesson.res.body.data.exercises[0].microLesson, 'string');
  });

  it('synchronizes speech evidence into pronunciation statistics', async () => {
    const stamp = Date.now();
    const { res } = createMockResponse();

    await synchronizeLearningEvents(
      {
        body: {
          events: [
            {
              id: `event-controller-pronunciation-${stamp}`,
              studentId: 'demo-student',
              sessionId: `session-controller-pronunciation-${stamp}`,
              lessonId: `lesson-controller-pronunciation-${stamp}`,
              exerciseId: 'exercise-speaking',
              type: 'exercise-finished',
              occurredAt: '2026-06-28T08:00:00.000Z',
            },
          ],
          exerciseResults: [
            {
              id: `result-controller-pronunciation-${stamp}`,
              studentId: 'demo-student',
              sessionId: `session-controller-pronunciation-${stamp}`,
              lessonId: `lesson-controller-pronunciation-${stamp}`,
              exerciseId: 'exercise-speaking',
              exerciseType: 'repeat-speaking',
              targetSkill: 'speaking',
              concept: 'learning',
              activityType: 'guided-lesson',
              conceptLevel: 'foundation',
              correct: false,
              attempts: 1,
              responseTimeMs: 3000,
              hintCount: 0,
              skipped: false,
              abandoned: false,
              repeatedMistake: true,
              teacherDecision: 'hold',
              reasonForLevelDecision: 'Controller fixture.',
              completionState: 'completed',
              evidenceEventIds: [`event-controller-pronunciation-${stamp}`],
              completedAt: '2026-06-28T08:00:01.000Z',
            },
          ],
          speechResults: [
            {
              id: `speech-controller-pronunciation-${stamp}`,
              studentId: 'demo-student',
              sessionId: `session-controller-pronunciation-${stamp}`,
              exerciseId: 'exercise-speaking',
              speechAvailable: true,
              speechDetected: true,
              expectedText: 'Where are you?',
              heardText: 'Where you',
              pronunciationIssues: [{ id: 'issue-are', word: 'are', issueType: 'missing', confidence: 0.7 }],
              completedAt: '2026-06-28T08:00:01.000Z',
            },
          ],
        },
      },
      res,
      throwNext,
    );

    assert.equal(res.body.data.acknowledgements[0].status, 'accepted');
    assert.equal(res.body.data.statisticsSnapshots[0].pronunciationIssueCount, 1);
    assert.deepEqual(res.body.data.statisticsSnapshots[0].pronunciationFocus, ['are']);
  });

  it('passes invalid session handoff errors to the error pipeline', async () => {
    let capturedError;
    const { res } = createMockResponse();

    await upsertSessionHandoff(
      {
        body: {
          id: 'bad-handoff',
          studentId: 'another-student',
          events: [],
          results: [],
          speechResults: [],
        },
      },
      res,
      (error) => {
        capturedError = error;
      },
    );

    assert.equal(capturedError.message.includes('identity validation'), true);
  });
});

function createMockResponse() {
  const res = {
    body: undefined,
    json(body) {
      this.body = body;
      return this;
    },
  };

  return { res };
}

function throwNext(error) {
  if (error) {
    throw error;
  }
}
