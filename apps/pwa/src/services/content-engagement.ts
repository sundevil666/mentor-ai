import type {
  ContentEngagementEvent,
  ContentEngagementEventType,
  ContentFeedbackValue,
  ContentProgressCategory,
} from '@mentor-ai/shared';
import { synchronizeContentEngagement } from './api-client.js';
import { mentorDb } from './indexed-db.js';
import { selectContentEngagementToPrune } from './content-engagement-retention.js';

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
  await pruneContentEngagement();
  window.dispatchEvent(new CustomEvent('mentor-content-engagement', { detail: input.contentId }));
  if (navigator.onLine) void syncContentEngagement().catch(() => undefined);
  return event;
}

export async function loadContentEngagementSummaries(category: ContentProgressCategory) {
  const db = await mentorDb;
  const events = await db.getAll('content-engagement') as ContentEngagementEvent[];
  return summarizeContentEngagement(events.filter((event) => event.category === category));
}

export async function loadAllContentEngagement() {
  const db = await mentorDb;
  return db.getAll('content-engagement') as Promise<ContentEngagementEvent[]>;
}

export async function syncContentEngagement() {
  if (!navigator.onLine) return;
  const db = await mentorDb;
  const local = await db.getAll('content-engagement') as ContentEngagementEvent[];
  if (!local.length) return;
  const merged = await synchronizeContentEngagement(local);
  for (const event of merged) await db.put('content-engagement', event);
  await pruneContentEngagement();
}

async function pruneContentEngagement() {
  const db = await mentorDb;
  const events = await db.getAll('content-engagement') as ContentEngagementEvent[];
  for (const event of selectContentEngagementToPrune(events)) {
    await db.delete('content-engagement', event.id);
  }
}

function getDeviceId() {
  let id = localStorage.getItem(deviceKey);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(deviceKey, id);
  }
  return id;
}
