import type { ContentEngagementEvent, ContentProgress } from '@mentor-ai/shared';

export interface StartedContentState {
  category: ContentProgress['category'];
  contentId: string;
  updatedAt: string;
  position?: number;
  duration?: number;
}

/** Returns only work that has really started and has no later completion. */
export function selectUnfinishedStartedContent(
  progress: ContentProgress[],
  engagement: ContentEngagementEvent[],
): StartedContentState[] {
  const items = new Map<string, StartedContentState>();

  for (const item of progress) {
    if (item.completed || Math.max(item.position, item.furthestPosition) <= 0) continue;
    items.set(`${item.category}:${item.contentId}`, {
      category: item.category,
      contentId: item.contentId,
      updatedAt: item.updatedAt,
      position: Math.max(item.position, item.furthestPosition),
      duration: item.duration,
    });
  }

  const latest = new Map<string, ContentEngagementEvent>();
  for (const event of engagement) {
    if (event.type === 'feedback-selected') continue;
    const key = `${event.category}:${event.contentId}`;
    const previous = latest.get(key);
    if (!previous || previous.createdAt.localeCompare(event.createdAt) < 0) latest.set(key, event);
  }
  for (const [key, event] of latest) {
    if (event.type === 'finished' || event.type === 'full-play') {
      items.delete(key);
      continue;
    }
    if (event.type === 'started' && !items.has(key)) {
      items.set(key, { category: event.category, contentId: event.contentId, updatedAt: event.createdAt });
    }
  }

  return [...items.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
