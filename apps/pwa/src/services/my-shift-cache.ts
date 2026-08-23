import { mentorDb } from './indexed-db.js';
import type { MyShiftActivity } from './my-shift.js';

const activityCacheKey = 'current' as const;

export interface MyShiftActivityCache {
  id: typeof activityCacheKey;
  activity: MyShiftActivity;
  synchronizedAt: string;
}

export async function readCachedMyShiftActivity(): Promise<MyShiftActivityCache | null> {
  const db = await mentorDb;
  return (await db.get('my-shift-cache', activityCacheKey) as MyShiftActivityCache | undefined) ?? null;
}

export async function cacheMyShiftActivity(
  activity: MyShiftActivity,
  synchronizedAt = new Date().toISOString(),
): Promise<MyShiftActivityCache> {
  const cached: MyShiftActivityCache = { id: activityCacheKey, activity, synchronizedAt };
  const db = await mentorDb;
  await db.put('my-shift-cache', cached);
  return cached;
}
