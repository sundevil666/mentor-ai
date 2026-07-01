import type { ActivitySnapshot, LearningContext, StudentModel, WorkShift } from '@mentor-ai/shared';
import { inferActivitySuggestion, type ActivitySuggestion } from 'src/services/activity-suggestion';

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
): ActivitySuggestion {
  return inferActivitySuggestion(date, preferredWorkShift, activitySnapshots);
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
