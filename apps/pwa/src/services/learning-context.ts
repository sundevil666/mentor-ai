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

export interface PriorityLesson {
  trainingKey: TrainingKey;
  skillLabel: string;
  title: string;
  reason: string;
  phaseLabel: string;
  scorePercent: number;
  evidenceCount: number;
}

export interface SynchronizedShiftDisplay {
  shift: WorkShift;
  date: string;
  isNext: boolean;
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
  const workShift = day.dayType === 'day_off'
    ? 'off'
    : inferRemoteShift(day.shift?.startsAt, myShiftActivity?.user.timezone, day.shift?.id) ?? fallback.workShift;

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

  const shiftStartsAt = day.shift ? new Date(day.shift.startsAt) : null;
  const shiftEndsAt = day.shift ? new Date(day.shift.endsAt) : null;
  const hoursUntilShift = shiftStartsAt ? (shiftStartsAt.getTime() - date.getTime()) / 3_600_000 : null;
  const hoursAfterShift = shiftEndsAt ? (date.getTime() - shiftEndsAt.getTime()) / 3_600_000 : null;

  if (hoursAfterShift !== null && hoursAfterShift >= 0 && hoursAfterShift <= 4) {
    return {
      ...fallback,
      workShift,
      activityPace: 'passive',
      mode: 'listening',
      availableMinutes: 5,
      reason: 'My Shift shows that your shift has just ended. Mentor AI keeps this fatigue window audio-first and short.',
    };
  }

  if (hoursUntilShift !== null && hoursUntilShift > 0 && hoursUntilShift <= 4) {
    return {
      ...fallback,
      workShift,
      activityPace: 'active',
      mode: 'home',
      availableMinutes: nextWindow?.recommendedDurationMinutes ?? 10,
      reason: 'My Shift shows that you are still fresh before work, so this window favors an interactive lesson or focused video.',
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

export function getSynchronizedWorkShift(activity: MyShiftActivity | null, date = new Date()): WorkShift | null {
  return getSynchronizedShiftDisplay(activity, date)?.shift ?? null;
}

export function getSynchronizedShiftDisplay(
  activity: MyShiftActivity | null,
  date = new Date(),
): SynchronizedShiftDisplay | null {
  if (!activity) return null;
  const dateKey = formatDateInTimeZone(date, activity.user.timezone);
  const today = activity.days.find((day) => day.date === dateKey);
  const scheduledDay = today?.shift
    ? today
    : activity.days
      .filter((day) => day.date > dateKey && day.shift)
      .sort((left, right) => left.date.localeCompare(right.date))[0];
  if (!scheduledDay?.shift) return null;
  const shift = inferRemoteShift(
    scheduledDay.shift.startsAt,
    activity.user.timezone,
    scheduledDay.shift.id,
  );
  return shift ? { shift, date: scheduledDay.date, isNext: scheduledDay.date !== dateKey } : null;
}

function inferRemoteShift(startsAt?: string, timeZone?: string, shiftId?: string): WorkShift | null {
  if (/shift[-_ ]?1$/i.test(shiftId ?? '')) return 'first';
  if (/shift[-_ ]?2$/i.test(shiftId ?? '')) return 'second';
  if (/shift[-_ ]?3$/i.test(shiftId ?? '')) return 'third';
  if (!startsAt) return null;
  const hourPart = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(startsAt)).find((part) => part.type === 'hour')?.value;
  const hour = Number(hourPart);
  if (!Number.isFinite(hour)) return null;
  if (hour >= 4 && hour < 10) return 'first';
  if (hour >= 10 && hour < 18) return 'second';
  return 'third';
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
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
  if (suggestion.mode === 'listening') return 'Audio-first';
  if (suggestion.mode === 'review') return 'Short review';
  if (suggestion.mode === 'home' && suggestion.activityPace === 'active') return 'Interactive lesson or video';

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
    return 'listening';
  }

  if (suggestion.activityPace === 'active' || suggestion.workShift === 'second' || suggestion.workShift === 'third') {
    return 'speaking';
  }

  return [
    { key: 'listening' as const, value: studentModel.listening.score.value },
    { key: 'speaking' as const, value: studentModel.speaking.score.value },
  ].sort((left, right) => left.value - right.value)[0].key;
}

export function createPriorityLesson(studentModel: StudentModel): PriorityLesson {
  const skills = [
    { key: 'listening' as const, label: 'Listening', state: studentModel.listening },
    { key: 'speaking' as const, label: 'Speaking', state: studentModel.speaking },
    { key: 'vocabulary' as const, label: 'Vocabulary', state: studentModel.vocabulary },
    { key: 'grammar' as const, label: 'Grammar', state: studentModel.grammar },
  ];
  const needsCalibration = skills.filter((skill) => skill.state.evidenceCount < 3);
  const priorityPool = needsCalibration.length > 0 ? needsCalibration : skills;
  const priority = [...priorityPool].sort((left, right) => {
    const evidenceDifference = left.state.evidenceCount - right.state.evidenceCount;
    return needsCalibration.length > 0
      ? evidenceDifference || left.state.score.value - right.state.score.value
      : left.state.score.value - right.state.score.value;
  })[0];
  const isCalibration = needsCalibration.length > 0;
  const trainingKey: TrainingKey = priority.key === 'grammar' ? 'speaking' : priority.key;

  return {
    trainingKey,
    skillLabel: priority.label,
    title: isCalibration
      ? `Let me check your ${priority.label.toLowerCase()}`
      : `Strengthen your ${priority.label.toLowerCase()} first`,
    reason: isCalibration
      ? `I still need a little more evidence about this skill. This lesson helps me find the right level and choose better lessons for you next.`
      : `${priority.label} is currently your weakest measured skill, so improving it will give you the most useful progress today.`,
    phaseLabel: isCalibration ? 'Getting to know your weak spots' : 'Based on your learning history',
    scorePercent: Math.round(priority.state.score.value * 100),
    evidenceCount: priority.state.evidenceCount,
  };
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
