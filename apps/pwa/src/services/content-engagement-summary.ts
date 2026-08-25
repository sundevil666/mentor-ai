import type { ContentEngagementEvent, ContentFeedbackValue } from '@mentor-ai/shared';

export interface ContentEngagementSummary {
  starts: number;
  finishes: number;
  fullPlays: number;
  feedback?: ContentFeedbackValue;
}

export function summarizeContentEngagement(events: ContentEngagementEvent[]) {
  const summaries = new Map<string, ContentEngagementSummary>();
  const sorted = [...events].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  for (const event of sorted) {
    const summary = summaries.get(event.contentId) ?? { starts: 0, finishes: 0, fullPlays: 0 };
    if (event.type === 'started') summary.starts += 1;
    if (event.type === 'finished') summary.finishes += 1;
    if (event.type === 'full-play') summary.fullPlays += 1;
    if (event.type === 'feedback-selected' && event.feedback) summary.feedback = event.feedback;
    summaries.set(event.contentId, summary);
  }
  return summaries;
}
