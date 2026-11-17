export type WorkShift = 'first' | 'second' | 'third' | 'off' | 'unknown';

export interface WorkShiftSchedule {
  shift: WorkShift;
  startsAtMinutes: number;
  endsAtMinutes: number;
  leaveHomeMinutesBeforeStart: number;
  busLeavesMinutesBeforeStart: number;
  busArrivesMinutesBeforeStart: number;
  headphonesOffMinutesBeforeStart: number;
}

export interface WorkShiftTiming {
  shift: WorkShift;
  startsAt: string;
  endsAt: string;
  leaveHomeAt: string;
  busLeavesAt: string;
  busArrivesAt: string;
  headphonesOffAt: string;
}

export const workShiftSchedules: Record<
  Exclude<WorkShift, 'off' | 'unknown'>,
  WorkShiftSchedule
> = {
  first: createWorkShiftSchedule('first', 6 * 60, 14 * 60),
  second: createWorkShiftSchedule('second', 14 * 60, 22 * 60),
  third: createWorkShiftSchedule('third', 22 * 60, 6 * 60),
};

export function getWorkShiftTiming(workShift: WorkShift): WorkShiftTiming | undefined {
  if (workShift === 'off' || workShift === 'unknown') return undefined;
  const schedule = workShiftSchedules[workShift];
  return {
    shift: workShift,
    startsAt: formatClockMinutes(schedule.startsAtMinutes),
    endsAt: formatClockMinutes(schedule.endsAtMinutes),
    leaveHomeAt: formatClockMinutes(schedule.startsAtMinutes - schedule.leaveHomeMinutesBeforeStart),
    busLeavesAt: formatClockMinutes(schedule.startsAtMinutes - schedule.busLeavesMinutesBeforeStart),
    busArrivesAt: formatClockMinutes(schedule.startsAtMinutes - schedule.busArrivesMinutesBeforeStart),
    headphonesOffAt: formatClockMinutes(schedule.startsAtMinutes - schedule.headphonesOffMinutesBeforeStart),
  };
}

function createWorkShiftSchedule(
  shift: Exclude<WorkShift, 'off' | 'unknown'>,
  startsAtMinutes: number,
  endsAtMinutes: number,
): WorkShiftSchedule {
  return {
    shift,
    startsAtMinutes,
    endsAtMinutes,
    leaveHomeMinutesBeforeStart: 65,
    busLeavesMinutesBeforeStart: 50,
    busArrivesMinutesBeforeStart: 30,
    headphonesOffMinutesBeforeStart: 20,
  };
}

function formatClockMinutes(minutes: number): string {
  const normalizedMinutes = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}
