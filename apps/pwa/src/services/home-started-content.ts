import type { ContentProgress } from '@mentor-ai/shared';

export interface StartedContentState {
  category: ContentProgress['category'];
  contentId: string;
  updatedAt: string;
  position: number;
  duration: number;
  progress: number;
}

/** Keeps synchronized content with real, unfinished progress above one percent. */
export function selectUnfinishedStartedContent(progress: ContentProgress[]): StartedContentState[] {
  const items = new Map<string, StartedContentState>();

  for (const item of progress) {
    // `completed` and `furthestPosition` are intentionally cumulative across
    // attempts. The Home list describes the current attempt, so only the
    // current position may decide whether it is started or finished.
    const position = item.position;
    if (position <= 0 || !item.duration || item.duration <= 0) continue;
    const percent = (position / item.duration) * 100;
    const completionGap = Math.max(1, item.duration * 0.005);
    const finishedAtEnd = item.completed && item.duration - position <= completionGap;
    if (finishedAtEnd) continue;
    if (percent <= 1 || percent >= 100) continue;
    items.set(`${item.category}:${item.contentId}`, {
      category: item.category,
      contentId: item.contentId,
      updatedAt: item.updatedAt,
      position,
      duration: item.duration,
      progress: Math.min(99, Math.round(percent)),
    });
  }

  return [...items.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
