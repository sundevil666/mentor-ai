import type {
  ContentEngagementEvent,
  ContentEngagementEventType,
  ContentFeedbackValue,
  ContentProgressCategory,
} from '@mentor-ai/shared';
import { synchronizeContentEngagement } from './api-client.js';
import { mentorDb } from './indexed-db.js';

const deviceKey = 'mentor-ai-device-id';

export interface ContentEngagementSummary {
  starts: number;
  finishes: number;
  fullPlays: number;
  feedback?: ContentFeedbackValue;
}

export { summarizeContentEngagement } from './content-engagement-summary.js';
import { summarizeContentEngagement } from './content-engagement-summary.js';

export async function recordContentEngagement(input: {
  studentId: string;
  category: ContentProgressCategory;
  contentId: string;
  type: ContentEngagementEventType;
  feedback?: ContentFeedbackValue;
}) {
  const event: ContentEngagementEvent = {
    ...input,
    id: `engagement:${crypto.randomUUID()}`,
    sourceDeviceId: getDeviceId(),
    createdAt: new Date().toISOString(),
  };
  const db = await mentorDb;
  await db.put('content-engagement', event);
  if (navigator.onLine) void syncContentEngagement().catch(() => undefined);
  return event;
}

export async function loadContentEngagementSummaries(category: ContentProgressCategory) {
  const db = await mentorDb;
  const events = await db.getAll('content-engagement') as ContentEngagementEvent[];
  return summarizeContentEngagement(events.filter((event) => event.category === category));
}

export async function syncContentEngagement() {
  if (!navigator.onLine) return;
  const db = await mentorDb;
  const local = await db.getAll('content-engagement') as ContentEngagementEvent[];
  if (!local.length) return;
  const merged = await synchronizeContentEngagement(local);
  for (const event of merged) await db.put('content-engagement', event);
}

function getDeviceId() {
  let id = localStorage.getItem(deviceKey);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(deviceKey, id);
  }
  return id;
}
