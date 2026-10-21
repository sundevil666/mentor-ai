import { formatDisplayDate } from './date-format.js';
import type { LessonProgressState } from './lesson-category-progress.js';

export interface ReleasedLesson {
  templateKey: string;
  addedAt: string;
}

export interface LessonReleaseGroup<T extends ReleasedLesson> {
  dateKey: string;
  dateLabel: string;
  lessons: T[];
}

export interface LessonProgressSection<T extends ReleasedLesson> {
  state: LessonProgressState;
  label: string;
  groups: LessonReleaseGroup<T>[];
}

const progressOrder: LessonProgressState[] = ['new', 'started', 'completed'];
const progressLabels: Record<LessonProgressState, string> = {
  new: 'Not started',
  started: 'In progress',
  completed: 'Completed',
};

export function groupLessonsByProgressAndReleaseDate<T extends ReleasedLesson>(
  lessons: readonly T[],
  getProgress: (lesson: T) => LessonProgressState,
): LessonProgressSection<T>[] {
  return progressOrder.flatMap((state) => {
    const groups = new Map<string, T[]>();
    for (const lesson of lessons.filter((item) => getProgress(item) === state)) {
      const dateKey = releaseDateKey(lesson.addedAt);
      groups.set(dateKey, [...(groups.get(dateKey) ?? []), lesson]);
    }
    if (groups.size === 0) return [];

    return [{
      state,
      label: progressLabels[state],
      groups: [...groups.entries()]
        .sort(([left], [right]) => right.localeCompare(left))
        .map(([dateKey, groupedLessons]) => ({
          dateKey,
          dateLabel: formatReleaseDate(dateKey),
          lessons: groupedLessons.sort((left, right) => (
            right.addedAt.localeCompare(left.addedAt)
            || left.templateKey.localeCompare(right.templateKey)
          )),
        })),
    }];
  });
}

function releaseDateKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : value.slice(0, 10);
}

function formatReleaseDate(dateKey: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey)
    ? formatDisplayDate(`${dateKey}T12:00:00`)
    : dateKey;
}

export function groupLessonDates<T extends ReleasedLesson>(
  lessons: readonly T[],
  getProgress: (lesson: T) => LessonProgressState,
) {
  const dates = new Map<string, { dateKey: string; dateLabel: string; total: number; completed: number }>();
  for (const lesson of lessons) {
    const dateKey = releaseDateKey(lesson.addedAt);
    const group = dates.get(dateKey) ?? { dateKey, dateLabel: formatReleaseDate(dateKey), total: 0, completed: 0 };
    group.total += 1;
    if (getProgress(lesson) === 'completed') group.completed += 1;
    dates.set(dateKey, group);
  }
  return [...dates.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export function resolveSelectedLessonDate(saved: string | null, dates: readonly { dateKey: string }[]): string | null {
  return dates.find((date) => date.dateKey === saved)?.dateKey ?? dates[0]?.dateKey ?? null;
}
