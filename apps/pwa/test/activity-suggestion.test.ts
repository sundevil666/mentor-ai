import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { initialStudentModel, type ActivitySnapshot, type WorkShift } from '@mentor-ai/shared';
import { inferActivitySuggestion } from '../src/services/activity-suggestion.js';
import {
  createCurrentActivitySuggestion,
  createPriorityLesson,
  getSynchronizedShiftDisplay,
  getSynchronizedWorkShift,
} from '../src/services/learning-context.js';
import { isMyShiftSyncDue, type MyShiftActivity } from '../src/services/my-shift.js';

describe('PWA activity suggestion', () => {
  it('refreshes My Shift once the daily cache interval has elapsed', () => {
    const now = new Date('2026-06-30T12:00:00.000Z');

    assert.equal(isMyShiftSyncDue('2026-06-29T13:00:00.000Z', now), false);
    assert.equal(isMyShiftSyncDue('2026-06-29T11:59:59.000Z', now), true);
  });

  it('starts by calibrating the skill with the least evidence', () => {
    const model = structuredClone(initialStudentModel);
    model.listening.evidenceCount = 2;
    model.speaking.evidenceCount = 0;
    model.vocabulary.evidenceCount = 1;
    model.grammar.evidenceCount = 1;

    const lesson = createPriorityLesson(model);

    assert.equal(lesson.trainingKey, 'speaking');
    assert.equal(lesson.skillLabel, 'Speaking');
    assert.equal(lesson.phaseLabel, 'Getting to know your weak spots');
  });

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

  it('chooses hands-free listening during a My Shift commute', () => {
    const activity = createMyShiftActivity('workday', 'commute', '2026-06-29T07:00:00.000Z', '2026-06-29T07:45:00.000Z');
    const suggestion = createCurrentActivitySuggestion('unknown', [], new Date('2026-06-29T07:15:00.000Z'), activity);

    assert.equal(suggestion.mode, 'listening');
    assert.equal(suggestion.activityPace, 'passive');
    assert.equal(suggestion.availableMinutes, 30);
    assert.match(suggestion.reason, /commuting/);
  });

  it('chooses speaking-friendly practice on a My Shift day off', () => {
    const activity = createMyShiftActivity('day_off', 'day_off', '2026-07-05T00:00:00.000Z', '2026-07-06T00:00:00.000Z');
    const suggestion = createCurrentActivitySuggestion('unknown', [], new Date('2026-07-05T11:00:00.000Z'), activity);

    assert.equal(suggestion.workShift, 'off');
    assert.equal(suggestion.mode, 'home');
    assert.equal(suggestion.activityPace, 'deep');
    assert.match(suggestion.reason, /speaking aloud/);
  });

  it('keeps the first hours after a shift short and audio-first', () => {
    const activity = createWorkdayActivity('2026-06-29T06:00:00.000Z', '2026-06-29T14:00:00.000Z');
    const suggestion = createCurrentActivitySuggestion('unknown', [], new Date('2026-06-29T15:00:00.000Z'), activity);

    assert.equal(suggestion.mode, 'listening');
    assert.equal(suggestion.activityPace, 'passive');
    assert.equal(suggestion.availableMinutes, 5);
    assert.match(suggestion.reason, /fatigue window/);
  });

  it('uses the fresh window before a shift for active learning', () => {
    const activity = createWorkdayActivity('2026-06-29T14:00:00.000Z', '2026-06-29T22:00:00.000Z');
    const suggestion = createCurrentActivitySuggestion('unknown', [], new Date('2026-06-29T11:00:00.000Z'), activity);

    assert.equal(suggestion.mode, 'home');
    assert.equal(suggestion.activityPace, 'active');
    assert.match(suggestion.reason, /focused audio story/);
  });

  it('shows the synchronized shift using the My Shift timezone', () => {
    const activity = createWorkdayActivity('2026-06-29T20:00:00.000Z', '2026-06-30T04:00:00.000Z');
    activity.user.timezone = 'Europe/Bratislava';

    assert.equal(getSynchronizedWorkShift(activity, new Date('2026-06-29T21:00:00.000Z')), 'third');
    assert.equal(createCurrentActivitySuggestion('second', [], new Date('2026-06-29T21:00:00.000Z'), activity).workShift, 'third');
  });

  it('shows the next scheduled shift on a day off', () => {
    const activity = createMyShiftActivity('day_off', 'day_off', '2026-07-05T00:00:00.000Z', '2026-07-06T00:00:00.000Z');
    activity.range = { from: '2026-06-29', to: '2026-07-05' };
    const workDates = ['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03'];
    activity.days.unshift(...workDates.map((workDate) => ({
      date: workDate,
      dayType: 'workday',
      shift: {
        id: 'shift-3',
        name: 'Night shift',
        startsAt: `${workDate}T20:00:00.000Z`,
        endsAt: new Date(`${workDate}T20:00:00.000Z`).toISOString(),
        isNightShift: true,
        status: 'scheduled',
      },
      timeline: [],
      recommendedLearningWindows: [],
    })));

    activity.days.push({
      date: '2026-07-06',
      dayType: 'workday',
      shift: {
        id: 'shift-2',
        name: 'Second shift',
        startsAt: '2026-07-06T12:00:00.000Z',
        endsAt: '2026-07-06T20:00:00.000Z',
        isNightShift: false,
        status: 'scheduled',
      },
      timeline: [],
      recommendedLearningWindows: [],
    });

    assert.deepEqual(getSynchronizedShiftDisplay(activity, new Date('2026-07-05T12:00:00.000Z')), {
      shift: 'second',
      date: '2026-07-06',
      isNext: true,
    });
    assert.equal(createCurrentActivitySuggestion('second', [], new Date('2026-07-05T12:00:00.000Z'), activity).workShift, 'off');
  });
});

function createWorkdayActivity(startsAt: string, endsAt: string): MyShiftActivity {
  const activity = createMyShiftActivity('workday', 'commute', startsAt, startsAt);
  activity.days[0].shift = {
    id: 'test-shift',
    name: 'Test shift',
    startsAt,
    endsAt,
    isNightShift: false,
    status: 'scheduled',
  };
  activity.days[0].timeline = [];
  return activity;
}

function createMyShiftActivity(
  dayType: string,
  type: 'commute' | 'day_off',
  startsAt: string,
  endsAt: string,
): MyShiftActivity {
  return {
    schemaVersion: '1.0',
    generatedAt: startsAt,
    dataVersion: 'test',
    user: { id: 'test', timezone: 'UTC', locale: 'en' },
    range: { from: startsAt.slice(0, 10), to: startsAt.slice(0, 10) },
    days: [
      {
        date: startsAt.slice(0, 10),
        dayType,
        shift: null,
        timeline: [{ type, startsAt, endsAt, lessonAvailability: 'recommended' }],
        recommendedLearningWindows: [],
      },
    ],
  };
}

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
