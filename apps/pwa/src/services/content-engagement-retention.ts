import type { ContentEngagementEvent } from '@mentor-ai/shared';

export const contentEngagementMaxAgeMs = 90 * 86_400_000;
export const contentEngagementMaxEntries = 1_000;

export function selectContentEngagementToPrune(
  events: ContentEngagementEvent[],
  now = Date.now(),
): ContentEngagementEvent[] {
  const fresh = events
    .filter((event) => {
      const createdAt = Date.parse(event.createdAt);
      return Number.isFinite(createdAt) && now - createdAt < contentEngagementMaxAgeMs;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const retainedIds = new Set(fresh.slice(0, contentEngagementMaxEntries).map((event) => event.id));
  return events.filter((event) => !retainedIds.has(event.id));
}
