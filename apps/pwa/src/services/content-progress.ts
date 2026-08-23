import type { ContentProgress, ContentProgressCategory } from '@mentor-ai/shared';
import { mentorDb } from './indexed-db';
import { synchronizeContentProgress } from './api-client';

const deviceKey = 'mentor-ai-device-id';

export async function loadContentProgress(category: ContentProgressCategory, contentId: string) {
  const db = await mentorDb;
  return db.get('content-progress', `${category}:${contentId}`) as Promise<ContentProgress | undefined>;
}

export async function saveContentProgress(input: Omit<ContentProgress, 'id' | 'sourceDeviceId'>) {
  const db = await mentorDb;
  const id = `${input.category}:${input.contentId}`;
  const previous = await db.get('content-progress', id) as ContentProgress | undefined;
  const progress: ContentProgress = {
    ...input,
    id,
    sourceDeviceId: getDeviceId(),
    furthestPosition: Math.max(previous?.furthestPosition ?? 0, input.furthestPosition, input.position),
  };
  await db.put('content-progress', progress);
  if (navigator.onLine) void syncAllContentProgress().catch(() => undefined);
  return progress;
}

export async function syncAllContentProgress() {
  if (!navigator.onLine) return;
  const db = await mentorDb;
  const local = await db.getAll('content-progress') as ContentProgress[];
  if (!local.length) return;
  const merged = await synchronizeContentProgress(local);
  for (const progress of merged) await db.put('content-progress', progress);
}

function getDeviceId() {
  let id = localStorage.getItem(deviceKey);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(deviceKey, id);
  }
  return id;
}
