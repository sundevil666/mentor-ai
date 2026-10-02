import type { ContentProgress } from '@mentor-ai/shared';

export interface StartedContentState {
  category: ContentProgress['category'];
  contentId: string;
  updatedAt: string;
  position?: number;
  duration?: number;
}

/** Returns only measurable progress strictly between 0% and 100%. */
export function selectUnfinishedStartedContent(
  progress: ContentProgress[],
): StartedContentState[] {
  const items = new Map<string, StartedContentState>();

  for (const item of progress) {
    const position = Math.max(item.position, item.furthestPosition);
    if (item.completed || position <= 0 || !item.duration || item.duration <= 0) continue;
    const displayedPercent = Math.round((position / item.duration) * 100);
    if (displayedPercent <= 0 || displayedPercent >= 100) continue;
    items.set(`${item.category}:${item.contentId}`, {
      category: item.category,
      contentId: item.contentId,
      updatedAt: item.updatedAt,
      position,
      duration: item.duration,
    });
  }

  return [...items.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
