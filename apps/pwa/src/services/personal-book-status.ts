import type { BookReaderDifficultyRating, ContentProgress, PersonalReadingBook } from '@mentor-ai/shared';

export type PersonalBookReadingStatus = 'new' | 'started' | 'finished';
export type PersonalBookAction = 'read' | 'rewrite';
export type PersonalBookKanbanColumn = PersonalBookAction | 'done';

export function bookReaderDifficultyRatingLabel(rating: BookReaderDifficultyRating | undefined) {
  if (rating === 'very-hard') return 'Unbearable';
  if (rating === 'hard') return 'Hard, but manageable';
  if (rating === 'comfortable') return 'Comfortable';
  if (rating === 'easy') return 'Easy';
  return 'How does it feel?';
}

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
  const rating = book.difficultyAssessment?.readerRating;
  if (rating === 'easy' || rating === 'comfortable' || rating === 'hard') return 'read';
  if (rating === 'very-hard') return 'rewrite';
  return book.difficultyAssessment?.recommendation === 'rewrite' ? 'rewrite' : 'read';
}

export function personalBookKanbanColumn(
  book: PersonalReadingBook,
  status: PersonalBookReadingStatus,
): PersonalBookKanbanColumn {
  return status === 'finished' ? 'done' : personalBookAction(book);
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
