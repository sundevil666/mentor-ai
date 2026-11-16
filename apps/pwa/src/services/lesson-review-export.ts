type ReviewRecord = Record<string, unknown>;
type ReviewStores = Record<string, ReviewRecord[]>;

/** Device-only export: deliberately excludes authentication and unrelated stores. */
export function buildLessonReviewExport(studentId: string, stores: ReviewStores, exportedAt: string) {
  const belongsToStudent = (record: ReviewRecord): boolean => {
    const owner = record.studentId ?? record.userId;
    if (owner) return owner === studentId;
    return ['events', 'results'].some((key) => Array.isArray(record[key])
      && (record[key] as ReviewRecord[]).some((item) => item.studentId === studentId));
  };
  const records = Object.fromEntries(['statistics', 'speech-results', 'sync-queue', 'learning-sessions']
    .map((name) => [name, (stores[name] ?? []).filter(belongsToStudent)]));
  const lessonIds = new Set<string>();
  for (const rows of Object.values(records)) for (const row of rows) {
    for (const key of ['lessonId', 'lessonTemplateKey']) if (typeof row[key] === 'string') lessonIds.add(row[key] as string);
    const lesson = row.lesson as ReviewRecord | undefined;
    if (typeof lesson?.id === 'string') lessonIds.add(lesson.id);
  }
  return { version: 1, exportedAt, studentId, source: 'this-device', records,
    lessons: (stores.lessons ?? []).filter((lesson) => lessonIds.has(String(lesson.id))
      || lessonIds.has(String(lesson.lessonTemplateKey))) };
}
