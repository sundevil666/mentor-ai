import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { initialStudentModel } from '@mentor-ai/shared';
import { calculateLevelJourney } from '../src/services/level-journey.js';

const emptyActivity = { listeningSeconds: 0, readingSeconds: 0, speakingSeconds: 0, totalSeconds: 0, updatedAt: null };

describe('level journey forecast', () => {
  it('shows a paused A0 to A1 route without recent activity', () => {
    const journey = calculateLevelJourney(initialStudentModel, emptyActivity, [], new Date('2026-09-04T12:00:00Z'));
    assert.equal(journey.currentLevel, 'A0');
    assert.equal(journey.nextLevel, 'A1');
    assert.equal(journey.daysRemaining, null);
    assert.equal(journey.daysLabel, 'paused');
  });

  it('moves progress and shortens the forecast when practice increases', () => {
    const now = new Date('2026-09-04T12:00:00Z');
    const slower = calculateLevelJourney(initialStudentModel, { ...emptyActivity, totalSeconds: 10 * 3_600, listeningSeconds: 10 * 3_600, updatedAt: now.toISOString() }, [], now);
    const faster = calculateLevelJourney(initialStudentModel, { ...emptyActivity, totalSeconds: 20 * 3_600, listeningSeconds: 20 * 3_600, updatedAt: now.toISOString() }, [], now);
    assert.equal(faster.progressPercent > slower.progressPercent, true);
    assert.equal((faster.daysRemaining ?? Infinity) < (slower.daysRemaining ?? Infinity), true);
  });

  it('stops projecting days after a week without activity', () => {
    const journey = calculateLevelJourney(initialStudentModel, {
      ...emptyActivity, totalSeconds: 20 * 3_600, listeningSeconds: 20 * 3_600, updatedAt: '2026-08-20T12:00:00Z',
    }, [], new Date('2026-09-04T12:00:00Z'));
    assert.equal(journey.daysRemaining, null);
  });

  it('uses a recent synchronized lesson instead of falsely showing paused', () => {
    const now = new Date('2026-09-04T12:00:00Z');
    const journey = calculateLevelJourney(initialStudentModel, emptyActivity, [{
      id: 'statistics-remote', studentId: 'demo-student', sessionId: 'session-remote', lessonId: 'lesson-remote',
      accuracy: 0.8, averageResponseTimeMs: 2_000, attempts: 3, completedExercises: 3, audioReplays: 0,
      speechAttempts: 2, pronunciationIssueCount: 0, pronunciationFocus: [], activeSeconds: 24 * 60,
      fatigueSignal: { value: 0, confidence: 0 }, createdAt: '2026-09-04T10:00:00Z',
    }], now);
    assert.notEqual(journey.daysRemaining, null);
  });
});
