import type { ReadingTranscriptChunk } from '@mentor-ai/shared';
import { saveReadingTranscripts } from './api-client';
import { mentorDb } from './indexed-db';

const batchSize = 50;
const flushDelayMs = 20_000;
const maxPendingChunks = 500;
let flushTimer: number | null = null;
let activeSync: Promise<number> | null = null;

export async function queueReadingTranscript(chunk: ReadingTranscriptChunk) {
  const db = await mentorDb;
  await db.put('reading-transcript-outbox', chunk);
  const pending = await db.getAll('reading-transcript-outbox') as ReadingTranscriptChunk[];
  for (const stale of pending
    .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt))
    .slice(0, Math.max(0, pending.length - maxPendingChunks))) {
    await db.delete('reading-transcript-outbox', stale.id);
  }
  scheduleReadingTranscriptSync(pending.length >= batchSize ? 0 : flushDelayMs);
}

export function scheduleReadingTranscriptSync(delayMs = flushDelayMs) {
  if (!navigator.onLine) return;
  if (flushTimer !== null) {
    if (delayMs > 0) return;
    window.clearTimeout(flushTimer);
  }
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void syncReadingTranscripts().catch(() => undefined);
  }, delayMs);
}

export function syncReadingTranscripts(): Promise<number> {
  activeSync ??= flushReadingTranscripts().finally(() => { activeSync = null; });
  return activeSync;
}

async function flushReadingTranscripts() {
  if (!navigator.onLine) return 0;
  const db = await mentorDb;
  const pending = (await db.getAll('reading-transcript-outbox') as ReadingTranscriptChunk[])
    .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt))
    .slice(0, batchSize);
  if (pending.length === 0) return 0;
  const saved = await saveReadingTranscripts(pending);
  const savedIds = new Set(saved.map((chunk) => chunk.id));
  for (const chunk of pending) {
    if (savedIds.has(chunk.id)) await db.delete('reading-transcript-outbox', chunk.id);
  }
  const remaining = await db.count('reading-transcript-outbox');
  if (remaining > 0) scheduleReadingTranscriptSync();
  return savedIds.size;
}
