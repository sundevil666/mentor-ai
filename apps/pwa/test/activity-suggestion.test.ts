import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ActivitySnapshot, WorkShift } from '@mentor-ai/shared';
import { inferActivitySuggestion } from '../src/services/activity-suggestion.js';

describe('PWA activity suggestion', () => {
  it('keeps first-shift mornings light and short', () => {
    const suggestion = inferActivitySuggestion(new Date('2026-06-29T07:30:00'), 'first');

    assert.equal(suggestion.workShift, 'first');
    assert.equal(suggestion.dayType, 'weekday');
    assert.equal(suggestion.activityPace, 'passive');
    assert.equal(suggestion.mode, 'review');
    assert.equal(suggestion.availableMinutes, 3);
    assert.equal(suggestion.shiftTiming?.leaveHomeAt, '04:55');
  });

  it('treats weekend time as a deeper listening window', () => {
    const suggestion = inferActivitySuggestion(new Date('2026-07-05T11:00:00'), 'off');

    assert.equal(suggestion.dayType, 'weekend');
    assert.equal(suggestion.activityPace, 'deep');
    assert.equal(suggestion.mode, 'listening');
    assert.equal(suggestion.availableMinutes, 12);
  });

  it('protects third-shift recovery mornings with listening instead of heavy work', () => {
    const suggestion = inferActivitySuggestion(new Date('2026-06-29T06:30:00'), 'third');

    assert.equal(suggestion.workShift, 'third');
    assert.equal(suggestion.activityPace, 'active');
    assert.equal(suggestion.mode, 'listening');
    assert.equal(suggestion.reason.includes('recovery listening'), true);
  });

  it('learns a likely shift from recent completed activity', () => {
    const snapshots = [
      createSnapshot('first', '2026-06-23T07:00:00.000Z'),
      createSnapshot('second', '2026-06-24T08:00:00.000Z'),
      createSnapshot('second', '2026-06-25T08:30:00.000Z'),
    ];

    const suggestion = inferActivitySuggestion(new Date('2026-06-26T08:15:00'), 'unknown', snapshots);

    assert.equal(suggestion.workShift, 'second');
    assert.equal(suggestion.activityPace, 'deep');
    assert.equal(suggestion.reason.includes('Recent activity history'), true);
  });
});

function createSnapshot(workShift: WorkShift, observedAt: string): ActivitySnapshot {
  const date = new Date(observedAt);

  return {
    id: `activity-${workShift}-${observedAt}`,
    studentId: 'demo-student',
    observedAt,
    localHour: date.getHours(),
    weekday: date.getDay(),
    dayType: date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : 'weekday',
    workShift,
    activityPace: 'active',
    suggestedMode: 'home',
    availableMinutes: 8,
    reason: 'Fixture',
    lessonCompleted: true,
    completedExercises: 4,
    accuracy: 0.8,
    averageResponseTimeMs: 4000,
  };
}
