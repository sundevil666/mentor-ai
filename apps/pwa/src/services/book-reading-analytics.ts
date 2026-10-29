import type { BookReadingAnalyticsReceipt } from '@mentor-ai/shared';
import { mentorDb } from './indexed-db';
import { getAuthToken } from './auth';
import { getContentProgressDeviceId } from './content-progress';
import { synchronizeBookReadingAnalytics } from './api-client';
import { applyBookAnalyticsEvent, bookAnalyticsIntervalMs, flushBookAnalytics, newBookAnalytics,
  type BookAnalyticsEvent, type LocalBookAnalytics, type BookAnalyticsOutbox } from './book-reading-analytics-model';

const storeName = 'book-reading-analytics';

export async function recordBookReadingAnalytics(studentId: string, bookId: string, event: BookAnalyticsEvent): Promise<void> {
  const deviceId = getContentProgressDeviceId();
  const now = new Date().toISOString();
  const fresh = newBookAnalytics(studentId, bookId, deviceId, now);
  const db = await mentorDb;
  const tx = db.transaction(storeName, 'readwrite');
  const current = await tx.store.get(fresh.id) as LocalBookAnalytics | undefined;
  const next = applyBookAnalyticsEvent(current ?? fresh, event, now);
  if (next !== current && next.snapshot.revision > 0) await tx.store.put(next);
  await tx.done;
  if (next !== current && next.snapshot.revision > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mentor-ai:book-reading-analytics-changed', { detail: { studentId, bookId } }));
  }
}

export async function listBookReadingAnalytics(studentId: string): Promise<LocalBookAnalytics[]> {
  const db = await mentorDb;
  return (await db.getAll(storeName) as Array<LocalBookAnalytics | { id: string }>)
    .filter((item): item is LocalBookAnalytics => 'snapshot' in item && item.studentId === studentId);
}

const outbox: BookAnalyticsOutbox = {
  list: listBookReadingAnalytics,
  async claimAttempt(studentId, now) {
    const db = await mentorDb;
    const tx = db.transaction(storeName, 'readwrite');
    const id = JSON.stringify(['attempt', studentId]);
    const previous = await tx.store.get(id) as { attemptedAt: number } | undefined;
    if (previous && now - previous.attemptedAt < bookAnalyticsIntervalMs) { await tx.done; return false; }
    await tx.store.put({ id, attemptedAt: now });
    await tx.done;
    return true;
  },
  async acknowledge(studentId: string, receipts: BookReadingAnalyticsReceipt[]) {
    const db = await mentorDb;
    const tx = db.transaction(storeName, 'readwrite');
    for (const receipt of receipts) {
      const id = JSON.stringify([studentId, receipt.deviceId, receipt.bookId]);
      const current = await tx.store.get(id) as LocalBookAnalytics | undefined;
      if (!current || receipt.revision > current.snapshot.revision) continue;
      current.acknowledgedRevision = Math.max(current.acknowledgedRevision, receipt.revision);
      await tx.store.put(current);
    }
    await tx.done;
  },
};

/** Daily maintenance only. The IDB transaction gate also covers concurrent tabs,
 * restarts and failures. Never bypass it from manual sync or reconnect handlers.
 */
export async function syncBookReadingAnalytics(studentId: string): Promise<number> {
  if (!getAuthToken() || (typeof navigator !== 'undefined' && !navigator.onLine)) return 0;
  return flushBookAnalytics(outbox, studentId, Date.now(), synchronizeBookReadingAnalytics);
}
