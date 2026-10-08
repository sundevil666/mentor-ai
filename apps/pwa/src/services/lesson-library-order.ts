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
