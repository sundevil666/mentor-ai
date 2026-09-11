import type { ReadingTranscriptChunk } from '@mentor-ai/shared';
import { saveReadingTranscripts } from './api-client';
import { mentorDb } from './indexed-db';

const batchSize = 100;
const maxPendingChunks = 500;
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
}

export function syncReadingTranscripts(): Promise<number> {
  activeSync ??= flushAllReadingTranscripts().finally(() => { activeSync = null; });
  return activeSync;
}

async function flushAllReadingTranscripts() {
  if (!navigator.onLine) return 0;
  const db = await mentorDb;
  let savedCount = 0;
  let pending = (await db.getAll('reading-transcript-outbox') as ReadingTranscriptChunk[])
    .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt))
    .slice(0, batchSize);
  while (pending.length > 0) {
    const saved = await saveReadingTranscripts(pending);
    const savedIds = new Set(saved.map((chunk) => chunk.id));
    for (const chunk of pending) {
      if (savedIds.has(chunk.id)) await db.delete('reading-transcript-outbox', chunk.id);
    }
    savedCount += savedIds.size;
    if (savedIds.size < pending.length) return savedCount;
    pending = (await db.getAll('reading-transcript-outbox') as ReadingTranscriptChunk[])
      .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt))
      .slice(0, batchSize);
  }
  return savedCount;
}
