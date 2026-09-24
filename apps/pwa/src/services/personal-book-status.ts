import type { ContentProgress, PersonalReadingBook } from '@mentor-ai/shared';

export type PersonalBookReadingStatus = 'new' | 'started' | 'finished';
export type PersonalBookAction = 'read' | 'rewrite';

export function personalBookReadingStatus(
  book: PersonalReadingBook,
  progress: ContentProgress | undefined,
  localFurthestProgressRatio = 0,
): PersonalBookReadingStatus {
  const synchronizedRatio = progress?.duration && progress.duration > 0
    ? progress.furthestPosition / progress.duration
    : 0;
  if (progress?.completed || synchronizedRatio >= 0.995 || localFurthestProgressRatio >= 0.995) return 'finished';
  if ((progress?.furthestPosition ?? 0) > 0 || localFurthestProgressRatio > 0 || book.lastOpenedAt) return 'started';
  return 'new';
}

export function personalBookReadingStatusLabel(status: PersonalBookReadingStatus) {
  if (status === 'finished') return 'Finished';
  if (status === 'started') return 'Started';
  return 'New';
}

export function personalBookAction(book: PersonalReadingBook): PersonalBookAction {
  return book.difficultyAssessment?.recommendation === 'rewrite' ? 'rewrite' : 'read';
}

export function sortPersonalBooksByActivity(
  books: readonly PersonalReadingBook[],
  statuses: Readonly<Record<string, PersonalBookReadingStatus>>,
) {
  const rank: Record<PersonalBookReadingStatus, number> = { started: 0, new: 1, finished: 2 };
  return [...books].sort((left, right) => {
    const leftStatus = statuses[left.id] ?? 'new';
    const rightStatus = statuses[right.id] ?? 'new';
    const statusOrder = rank[leftStatus] - rank[rightStatus];
    if (statusOrder !== 0) return statusOrder;
    const leftDate = left.lastOpenedAt ?? left.importedAt;
    const rightDate = right.lastOpenedAt ?? right.importedAt;
    return rightDate.localeCompare(leftDate);
  });
}
