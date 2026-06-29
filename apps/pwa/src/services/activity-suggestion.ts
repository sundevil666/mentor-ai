import {
  getWorkShiftTiming,
  type ActivityPace,
  type ActivitySnapshot,
  type LearningMode,
  type WorkShift,
} from '@mentor-ai/shared';

export interface ActivitySuggestion
  extends Omit<ActivitySnapshot, 'id' | 'studentId' | 'observedAt' | 'suggestedMode'> {
  mode: LearningMode;
}

export function inferActivitySuggestion(
  date: Date,
  preferredWorkShift: WorkShift,
  snapshots: ActivitySnapshot[] = [],
): ActivitySuggestion {
  const localHour = date.getHours();
  const weekday = date.getDay();
  const dayType = weekday === 0 || weekday === 6 ? 'weekend' : 'weekday';
  const workShift = preferredWorkShift === 'unknown' ? inferShiftFromHistory(snapshots, dayType, localHour) : preferredWorkShift;
  const historicalPace = inferHistoricalPace(snapshots, dayType, localHour, workShift);
  const baseline = inferBaselinePace(dayType, workShift, localHour, weekday);
  const activityPace = historicalPace ?? baseline;
  const mode = chooseModeForActivity(activityPace, dayType, workShift, localHour);
  const availableMinutes = chooseMinutesForActivity(activityPace);
  const shiftTiming = getWorkShiftTiming(workShift);

  return {
    localHour,
    weekday,
    dayType,
    workShift,
    shiftTiming,
    activityPace,
    mode,
    availableMinutes,
    reason: createActivityReason(dayType, workShift, activityPace, snapshots.length > 0, weekday, localHour),
  };
}

export function createActivityReason(
  dayType: 'weekday' | 'weekend',
  workShift: WorkShift,
  activityPace: ActivityPace,
  hasHistory: boolean,
  weekday: number,
  localHour: number,
): string {
  const historyNote = hasHistory ? 'Recent activity history is included.' : 'No strong personal pattern yet.';

  if (isThirdShiftRecoveryMorning(workShift, localHour)) {
    return `After a third shift, morning lessons are treated as recovery listening: simple, active audio to stay awake without heavy thinking. ${historyNote}`;
  }

  if (dayType === 'weekend' && weekday === 6 && workShift === 'third') {
    return `Saturday is usually active, but a third-shift Saturday is treated more carefully before the 22:00-06:00 shift. ${historyNote}`;
  }

  if (dayType === 'weekend') {
    return `Weekend sessions are treated as an active learning window with room for deeper listening and repetition. ${historyNote}`;
  }

  if (workShift === 'first') {
    return `First-shift mornings are treated as low-energy, so the plan starts lighter. ${historyNote}`;
  }

  if (workShift === 'second' || workShift === 'third') {
    return `Before a ${workShift}-shift day, mornings are treated as a strong learning window. ${historyNote}`;
  }

  return `The plan uses a ${activityPace} weekday start until more shift evidence is available. ${historyNote}`;
}

function inferShiftFromHistory(snapshots: ActivitySnapshot[], dayType: 'weekday' | 'weekend', localHour: number): WorkShift {
  const matching = snapshots
    .slice(-12)
    .filter((snapshot) => snapshot.dayType === dayType && Math.abs(snapshot.localHour - localHour) <= 3 && snapshot.workShift !== 'unknown');

  if (matching.length === 0) {
    return dayType === 'weekend' ? 'off' : 'unknown';
  }

  const counts = matching.reduce<Record<WorkShift, number>>(
    (counts, snapshot) => ({ ...counts, [snapshot.workShift]: counts[snapshot.workShift] + 1 }),
    { first: 0, second: 0, third: 0, off: 0, unknown: 0 },
  );
  const ranked = (Object.entries(counts) as Array<[WorkShift, number]>)
    .filter(([shift]) => shift !== 'unknown')
    .sort((left, right) => right[1] - left[1]);

  return ranked[0]?.[1] > 0 ? ranked[0][0] : matching.at(-1)?.workShift ?? 'unknown';
}

function inferHistoricalPace(
  snapshots: ActivitySnapshot[],
  dayType: 'weekday' | 'weekend',
  localHour: number,
  workShift: WorkShift,
): ActivityPace | null {
  const matching = snapshots
    .slice(-24)
    .filter(
      (snapshot) =>
        snapshot.dayType === dayType &&
        snapshot.workShift === workShift &&
        Math.abs(snapshot.localHour - localHour) <= 3 &&
        snapshot.lessonCompleted,
    );

  if (matching.length < 2) {
    return null;
  }

  const averageAccuracy = matching.reduce((sum, snapshot) => sum + (snapshot.accuracy ?? 0), 0) / matching.length;
  const averageExercises = matching.reduce((sum, snapshot) => sum + (snapshot.completedExercises ?? 0), 0) / matching.length;

  if (averageAccuracy >= 0.75 && averageExercises >= 4) {
    return 'deep';
  }

  if (averageAccuracy >= 0.55 && averageExercises >= 3) {
    return 'active';
  }

  return 'passive';
}

function inferBaselinePace(
  dayType: 'weekday' | 'weekend',
  workShift: WorkShift,
  localHour: number,
  weekday: number,
): ActivityPace {
  if (isThirdShiftRecoveryMorning(workShift, localHour)) {
    return 'active';
  }

  if (dayType === 'weekend') {
    if (weekday === 6 && workShift === 'third') {
      return localHour < 14 ? 'active' : 'steady';
    }

    return 'deep';
  }

  if (workShift === 'first') {
    return localHour < 12 ? 'passive' : 'steady';
  }

  if (workShift === 'second' || workShift === 'third') {
    return localHour < 12 ? 'active' : 'steady';
  }

  return localHour < 10 ? 'active' : 'steady';
}

function chooseModeForActivity(
  activityPace: ActivityPace,
  dayType: 'weekday' | 'weekend',
  workShift: WorkShift,
  localHour: number,
): LearningMode {
  if (isThirdShiftRecoveryMorning(workShift, localHour)) {
    return 'listening';
  }

  if (activityPace === 'passive') {
    return 'review';
  }

  if (activityPace === 'deep') {
    return dayType === 'weekend' ? 'listening' : 'home';
  }

  return 'home';
}

function chooseMinutesForActivity(activityPace: ActivityPace): number {
  switch (activityPace) {
    case 'passive':
      return 3;
    case 'steady':
      return 6;
    case 'active':
      return 8;
    case 'deep':
      return 12;
  }
}

function isThirdShiftRecoveryMorning(workShift: WorkShift, localHour: number): boolean {
  return workShift === 'third' && localHour >= 5 && localHour < 10;
}
