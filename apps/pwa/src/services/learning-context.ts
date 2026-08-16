import type { ActivitySnapshot, LearningContext, StudentModel, WorkShift } from '@mentor-ai/shared';
import { inferActivitySuggestion, type ActivitySuggestion } from './activity-suggestion.js';
import { findCurrentMyShiftDay, type MyShiftActivity } from './my-shift.js';

export type TrainingKey = 'listening' | 'speaking' | 'vocabulary';

export interface TrainingModeOption {
  key: TrainingKey;
  label: string;
  shortLabel: string;
  icon: string;
  reason: string;
}

export interface ShiftTimingRow {
  label: string;
  value: string;
}

export const primaryTrainingModes: TrainingModeOption[] = [
  {
    key: 'listening',
    label: 'Listening',
    shortLabel: 'Listening',
    icon: 'headphones',
    reason: 'Listen first when the window is passive, weekend-sized, or good for audio practice.',
  },
  {
    key: 'speaking',
    label: 'Speaking',
    shortLabel: 'Speaking',
    icon: 'record_voice_over',
    reason: 'Use active speaking when you have enough energy and can answer aloud.',
  },
  {
    key: 'vocabulary',
    label: 'Vocabulary',
    shortLabel: 'Vocabulary',
    icon: 'psychology',
    reason: 'Build recall when the session should be short, focused, or review-heavy.',
  },
];

export function createCurrentActivitySuggestion(
  preferredWorkShift: WorkShift,
  activitySnapshots: ActivitySnapshot[],
  date = new Date(),
  myShiftActivity: MyShiftActivity | null = null,
): ActivitySuggestion {
  const fallback = inferActivitySuggestion(date, preferredWorkShift, activitySnapshots);
  const day = findCurrentMyShiftDay(myShiftActivity, date);

  if (!day) return fallback;

  const current = day.timeline.find((item) => date >= new Date(item.startsAt) && date < new Date(item.endsAt));
  const nextWindow = day.recommendedLearningWindows
    .filter((window) => new Date(window.endsAt) > date)
    .sort((left, right) => right.priority - left.priority)[0];
  const workShift = day.dayType === 'day_off' ? 'off' : inferRemoteShift(day.shift?.startsAt) ?? fallback.workShift;

  if (current?.type === 'commute') {
    return {
      ...fallback,
      workShift,
      activityPace: 'passive',
      mode: 'listening',
      availableMinutes: durationMinutes(date, current.endsAt, 30),
      reason: 'My Shift shows that you are commuting, so this window is reserved for hands-free listening.',
    };
  }

  if (current?.type === 'work') {
    return {
      ...fallback,
      workShift,
      activityPace: 'passive',
      mode: 'review',
      availableMinutes: 3,
      reason: 'My Shift shows that you are at work. Only a very short review is suggested now.',
    };
  }

  if (day.dayType === 'day_off' || current?.type === 'day_off') {
    return {
      ...fallback,
      workShift: 'off',
      activityPace: 'deep',
      mode: 'home',
      availableMinutes: nextWindow?.recommendedDurationMinutes ?? 12,
      reason: 'My Shift shows a day off, so this is a good window for speaking aloud and deeper practice.',
    };
  }

  if (nextWindow && new Date(nextWindow.startsAt) <= date) {
    return {
      ...fallback,
      workShift,
      activityPace: 'active',
      mode: 'home',
      availableMinutes: nextWindow.recommendedDurationMinutes,
      reason: `My Shift recommends this learning window: ${nextWindow.reason}.`,
    };
  }

  return { ...fallback, workShift, reason: `My Shift schedule is connected. ${fallback.reason}` };
}

function inferRemoteShift(startsAt?: string): WorkShift | null {
  if (!startsAt) return null;
  const hour = new Date(startsAt).getHours();
  if (hour >= 4 && hour < 10) return 'first';
  if (hour >= 10 && hour < 18) return 'second';
  return 'third';
}

function durationMinutes(from: Date, endsAt: string, maximum: number): number {
  return Math.max(3, Math.min(maximum, Math.floor((new Date(endsAt).getTime() - from.getTime()) / 60_000)));
}

export function createLearningContext(
  suggestion: ActivitySuggestion,
  options: Partial<LearningContext> = {},
): LearningContext {
  return {
    mode: suggestion.mode,
    isOffline: !navigator.onLine,
    speechAvailable: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    availableMinutes: suggestion.availableMinutes,
    workShift: suggestion.workShift,
    dayType: suggestion.dayType,
    activityPace: suggestion.activityPace,
    startedHour: suggestion.localHour,
    activityReason: suggestion.reason,
    shiftTiming: suggestion.shiftTiming,
    ...options,
  };
}

export function formatActivityMeta(suggestion: ActivitySuggestion): string {
  const day = suggestion.dayType === 'weekend' ? 'Weekend' : 'Weekday';
  return `${day} · ${formatShiftLabel(suggestion.workShift)} · ${suggestion.availableMinutes} min`;
}

export function formatPaceLabel(suggestion: ActivitySuggestion): string {
  switch (suggestion.activityPace) {
    case 'passive':
      return 'Light review';
    case 'steady':
      return 'Steady lesson';
    case 'active':
      return 'Active practice';
    case 'deep':
      return 'Deep listening';
  }
}

export function createShiftTimingRows(suggestion: ActivitySuggestion): ShiftTimingRow[] {
  const timing = suggestion.shiftTiming;

  if (!timing) {
    return [];
  }

  return [
    { label: 'Shift', value: `${timing.startsAt}-${timing.endsAt}` },
    { label: 'Leave home', value: timing.leaveHomeAt },
    { label: 'Bus', value: `${timing.busLeavesAt}-${timing.busArrivesAt}` },
    { label: 'Headphones off', value: timing.headphonesOffAt },
  ];
}

export function chooseRecommendedTraining(suggestion: ActivitySuggestion, studentModel: StudentModel): TrainingKey {
  if (suggestion.mode === 'listening' || suggestion.dayType === 'weekend') {
    return 'listening';
  }

  if (suggestion.activityPace === 'passive' || suggestion.mode === 'review') {
    return 'vocabulary';
  }

  if (suggestion.activityPace === 'active' || suggestion.workShift === 'second' || suggestion.workShift === 'third') {
    return 'speaking';
  }

  return [
    { key: 'vocabulary' as const, value: studentModel.vocabulary.score.value },
    { key: 'listening' as const, value: studentModel.listening.score.value },
    { key: 'speaking' as const, value: studentModel.speaking.score.value },
  ].sort((left, right) => left.value - right.value)[0].key;
}

export function findTrainingMode(key: TrainingKey): TrainingModeOption {
  return primaryTrainingModes.find((item) => item.key === key) ?? primaryTrainingModes[0];
}

function formatShiftLabel(shift: WorkShift): string {
  switch (shift) {
    case 'first':
      return '1st shift';
    case 'second':
      return '2nd shift';
    case 'third':
      return '3rd shift';
    case 'off':
      return 'day off';
    case 'unknown':
      return 'shift unknown';
  }
}
