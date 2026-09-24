import type { ContentProgress, PersonalReadingBook } from '@mentor-ai/shared';

export type PersonalBookReadingStatus = 'new' | 'started' | 'finished';

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
