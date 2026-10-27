import { learningActivityKinds, type LearningActivityEvent, type MovieLearningReport, type StatisticsSnapshot } from '@mentor-ai/shared';

export type HistoryGrouping = 'day' | 'week' | 'month' | 'year';
export const practiceSeries = [
  { kind: 'grammar', label: 'Grammar', color: '#5875de' },
  { kind: 'listening', label: 'Lesson listening', color: '#2795ad' },
  { kind: 'speaking', label: 'Speaking', color: '#c45b9e' },
  { kind: 'phrases', label: 'Phrases', color: '#b58029' },
  { kind: 'audio', label: 'Audio', color: '#9571d4' },
  { kind: 'reading', label: 'Reading', color: '#269c7e' },
  { kind: 'vocabulary', label: 'Vocabulary', color: '#ce7056' },
] as const;

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function bucketDate(date: Date, grouping: HistoryGrouping): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (grouping === 'week') result.setDate(result.getDate() - (result.getDay() + 6) % 7);
  if (grouping === 'month' || grouping === 'year') result.setDate(1);
  if (grouping === 'year') result.setMonth(0);
  return result;
}
export function buildPracticeHistory(events: LearningActivityEvent[], snapshots: StatisticsSnapshot[], start: string, end: string, grouping: HistoryGrouping, movies: MovieLearningReport[] = []) {
  const from = new Date(`${start}T00:00:00`);
  const until = new Date(`${end}T23:59:59.999`);
  const buckets = [];
  for (const cursor = bucketDate(from, grouping); cursor <= until && buckets.length < 3700;) {
    buckets.push({ key: localDateKey(cursor), seconds: Object.fromEntries(learningActivityKinds.map((kind) => [kind, 0])) as Record<typeof learningActivityKinds[number], number>, movies: 0, lessons: 0, exercises: 0, words: 0, accuracySum: 0 });
    if (grouping === 'year') cursor.setFullYear(cursor.getFullYear() + 1);
    else if (grouping === 'month') cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + (grouping === 'week' ? 7 : 1));
  }
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  let undatedSeconds = 0;
  for (const event of new Map(events.map((event) => [event.id, event])).values()) {
    if (!Number.isFinite(event.activeSeconds) || event.activeSeconds <= 0) continue;
    const first = new Date(event.startedAt), last = new Date(event.endedAt);
    const firstKey = localDateKey(bucketDate(first, grouping)), lastKey = localDateKey(bucketDate(last, grouping));
    // Never invent a daily distribution for legacy batches or migrated lifetime totals.
    if (event.contentId === 'historic-device-baseline' || firstKey !== lastKey || !Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime())) {
      undatedSeconds += event.activeSeconds;
      continue;
    }
    if (last < from || last > until) continue;
    if (first < from) { undatedSeconds += event.activeSeconds; continue; }
    const bucket = byKey.get(lastKey);
    if (bucket && learningActivityKinds.includes(event.kind)) bucket.seconds[event.kind] += event.activeSeconds;
  }
  for (const snapshot of new Map(snapshots.map((snapshot) => [snapshot.id, snapshot])).values()) {
    const date = new Date(snapshot.createdAt);
    if (!Number.isFinite(date.getTime()) || date < from || date > until) continue;
    const bucket = byKey.get(localDateKey(bucketDate(date, grouping)));
    if (!bucket) continue;
    bucket.lessons++;
    bucket.exercises += Math.max(0, snapshot.completedExercises);
    bucket.words += Math.max(0, snapshot.spokenWords ?? 0);
    bucket.accuracySum += snapshot.accuracy;
  }
  for (const movie of new Map(movies.map((movie) => [movie.id, movie])).values()) {
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(movie.watchedAt) ? `${movie.watchedAt}T12:00:00` : movie.watchedAt);
    if (!Number.isFinite(date.getTime()) || date < from || date > until) continue;
    const bucket = byKey.get(localDateKey(bucketDate(date, grouping)));
    if (bucket) bucket.movies++;
  }
  return { buckets, undatedSeconds };
}
