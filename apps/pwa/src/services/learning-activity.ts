import type { LearningActivityEvent, LearningActivityKind, LearningActivityTotals } from '@mentor-ai/shared';
import { synchronizeLearningActivity } from './api-client';
import { mentorDb } from './indexed-db';

const deviceKey = 'mentor-ai-device-id';
const summaryId = 'current';
const maxChunkSeconds = 60;

export async function recordLearningActivity(input: {
  studentId: string;
  kind: LearningActivityKind;
  contentId: string;
  activeSeconds: number;
  startedAt?: string;
  endedAt?: string;
}) {
  let remainingSeconds = Math.max(1, Math.round(input.activeSeconds));
  const endedAt = input.endedAt ?? new Date().toISOString();
  const db = await mentorDb;
  let chunkEnd = Date.parse(endedAt);
  let latestEvent: LearningActivityEvent | undefined;
  while (remainingSeconds > 0) {
    const activeSeconds = Math.min(maxChunkSeconds, remainingSeconds);
    const chunkStart = chunkEnd - activeSeconds * 1_000;
    latestEvent = {
      id: `activity:${crypto.randomUUID()}`,
      studentId: input.studentId,
      kind: input.kind,
      contentId: input.contentId,
      activeSeconds,
      sourceDeviceId: getDeviceId(),
      startedAt: new Date(chunkStart).toISOString(),
      endedAt: new Date(chunkEnd).toISOString(),
    };
    await db.put('learning-activity-outbox', latestEvent);
    remainingSeconds -= activeSeconds;
    chunkEnd = chunkStart;
  }
  window.dispatchEvent(new Event('mentor-learning-activity-updated'));
  if (navigator.onLine) void syncLearningActivity().catch(() => undefined);
  return latestEvent!;
}

export async function loadLearningActivityTotals(): Promise<LearningActivityTotals> {
  const db = await mentorDb;
  const remote = await db.get('learning-activity-summary', summaryId) as (LearningActivityTotals & { id: string }) | undefined;
  const pending = await db.getAll('learning-activity-outbox') as LearningActivityEvent[];
  const totals: LearningActivityTotals = remote ?? emptyTotals();
  return pending.reduce((result, event) => addSeconds(result, event.kind, event.activeSeconds, event.endedAt), totals);
}

export async function syncLearningActivity(): Promise<LearningActivityTotals> {
  if (!navigator.onLine) return loadLearningActivityTotals();
  const db = await mentorDb;
  const pending = await db.getAll('learning-activity-outbox') as LearningActivityEvent[];
  const result = await synchronizeLearningActivity(pending);
  const acknowledged = new Set(result.acknowledgedIds);
  for (const event of pending) if (acknowledged.has(event.id)) await db.delete('learning-activity-outbox', event.id);
  await db.put('learning-activity-summary', { id: summaryId, ...result.totals });
  window.dispatchEvent(new Event('mentor-learning-activity-updated'));
  return loadLearningActivityTotals();
}

export class ActiveLearningTimer {
  private lastRecordedAt = 0;

  constructor(private readonly input: { studentId: () => string; kind: LearningActivityKind; contentId: () => string }) {}

  start(now = Date.now()) { this.lastRecordedAt = now; }

  async checkpoint(now = Date.now(), force = false) {
    if (!this.lastRecordedAt) return;
    const elapsed = Math.min(maxChunkSeconds, Math.floor((now - this.lastRecordedAt) / 1_000));
    if (elapsed < (force ? 1 : 15)) return;
    this.lastRecordedAt = now;
    await recordLearningActivity({
      studentId: this.input.studentId(),
      kind: this.input.kind,
      contentId: this.input.contentId(),
      activeSeconds: elapsed,
    });
  }

  async stop(now = Date.now()) {
    await this.checkpoint(now, true);
    this.lastRecordedAt = 0;
  }
}

function addSeconds(totals: LearningActivityTotals, kind: LearningActivityKind, seconds: number, updatedAt: string) {
  const result = { ...totals, updatedAt: !totals.updatedAt || updatedAt > totals.updatedAt ? updatedAt : totals.updatedAt };
  result[`${kind}Seconds`] += seconds;
  result.totalSeconds += seconds;
  return result;
}

function emptyTotals(): LearningActivityTotals {
  return { listeningSeconds: 0, readingSeconds: 0, speakingSeconds: 0, totalSeconds: 0, updatedAt: null };
}

function getDeviceId() {
  let id = localStorage.getItem(deviceKey);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(deviceKey, id); }
  return id;
}
