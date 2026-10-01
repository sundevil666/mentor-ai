import type { LearningActivityEvent, LearningActivityKind, LearningActivityTotals } from '@mentor-ai/shared';
import { synchronizeLearningActivity } from './api-client';
import { readAuthSession } from './auth';
import { mentorDb } from './indexed-db';
import { buildActivityBaselineEvents, preferLocalTotals } from './learning-activity-totals';

const deviceKey = 'mentor-ai-device-id';
const summaryId = 'current';
const maxCheckpointSeconds = 60;
const batchKey = 'mentor-ai:learning-activity-batch';
let activeActivitySync: Promise<LearningActivityTotals> | null = null;

export async function recordLearningActivity(input: {
  studentId: string;
  kind: LearningActivityKind;
  contentId: string;
  activeSeconds: number;
  startedAt?: string;
  endedAt?: string;
}) {
  const activeSeconds = Math.max(1, Math.round(input.activeSeconds));
  const endedAt = input.endedAt ?? new Date().toISOString();
  const db = await mentorDb;
  const id = `activity:${getDeviceId()}:${getBatchId()}:${input.kind}`;
  const previous = await db.get('learning-activity-outbox', id) as LearningActivityEvent | undefined;
  const latestEvent: LearningActivityEvent = {
      id,
      studentId: input.studentId,
      kind: input.kind,
      contentId: 'daily-category-total',
      activeSeconds: (previous?.activeSeconds ?? 0) + activeSeconds,
      sourceDeviceId: getDeviceId(),
      startedAt: previous?.startedAt ?? input.startedAt ?? new Date(Date.parse(endedAt) - activeSeconds * 1_000).toISOString(),
      endedAt,
  };
  await db.put('learning-activity-outbox', latestEvent);
  window.dispatchEvent(new Event('mentor-learning-activity-updated'));
  return latestEvent!;
}

export async function loadLearningActivityTotals(): Promise<LearningActivityTotals> {
  const db = await mentorDb;
  const remote = await db.get('learning-activity-summary', summaryId) as (LearningActivityTotals & { id: string }) | undefined;
  const pending = await db.getAll('learning-activity-outbox') as LearningActivityEvent[];
  const totals: LearningActivityTotals = normalizeTotals(remote);
  return pending.reduce((result, event) => addSeconds(result, event.kind, event.activeSeconds, event.endedAt), totals);
}

export async function pendingLearningActivityCount(): Promise<number> {
  const db = await mentorDb;
  return db.count('learning-activity-outbox');
}

export function syncLearningActivity(): Promise<LearningActivityTotals> {
  activeActivitySync ??= performLearningActivitySync().finally(() => { activeActivitySync = null; });
  return activeActivitySync;
}

async function performLearningActivitySync(): Promise<LearningActivityTotals> {
  if (!navigator.onLine) return loadLearningActivityTotals();
  const db = await mentorDb;
  const localTotals = await loadLearningActivityTotals();
  const pending = await db.getAll('learning-activity-outbox') as LearningActivityEvent[];
  let remoteTotals: LearningActivityTotals;
  if (pending.length > 0) {
    rotateBatchId();
    const result = await synchronizeLearningActivity(pending, localTotals);
    const acknowledged = new Set(result.acknowledgedIds);
    for (const event of pending) if (acknowledged.has(event.id)) await db.delete('learning-activity-outbox', event.id);
    remoteTotals = result.totals;
  } else {
    remoteTotals = (await synchronizeLearningActivity([], localTotals)).totals;
  }

  const studentId = readAuthSession()?.user.id;
  const baselineEvents = studentId
    ? buildActivityBaselineEvents(localTotals, remoteTotals, studentId, getDeviceId())
    : [];
  if (baselineEvents.length > 0) {
    for (const event of baselineEvents) await db.put('learning-activity-outbox', event);
    const result = await synchronizeLearningActivity(baselineEvents, localTotals);
    const acknowledged = new Set(result.acknowledgedIds);
    for (const event of baselineEvents) if (acknowledged.has(event.id)) await db.delete('learning-activity-outbox', event.id);
    remoteTotals = result.totals;
  }

  const synchronizedTotals = studentId ? remoteTotals : preferLocalTotals(localTotals, remoteTotals);
  await db.put('learning-activity-summary', { id: summaryId, ...synchronizedTotals });
  window.dispatchEvent(new Event('mentor-learning-activity-updated'));
  return loadLearningActivityTotals();
}

export class ActiveLearningTimer {
  private lastRecordedAt = 0;

  constructor(private readonly input: { studentId: () => string; kind: LearningActivityKind; contentId: () => string }) {}

  start(now = Date.now()) { this.lastRecordedAt = now; }

  async checkpoint(now = Date.now(), force = false) {
    if (!this.lastRecordedAt) return;
    const elapsed = Math.min(maxCheckpointSeconds, Math.floor((now - this.lastRecordedAt) / 1_000));
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
  return {
    grammarSeconds: 0, listeningSeconds: 0, speakingSeconds: 0, phrasesSeconds: 0,
    audioSeconds: 0, readingSeconds: 0, vocabularySeconds: 0, totalSeconds: 0, updatedAt: null,
  };
}

function normalizeTotals(value?: Partial<LearningActivityTotals>): LearningActivityTotals {
  const totals = { ...emptyTotals(), ...value };
  totals.totalSeconds = totals.grammarSeconds + totals.listeningSeconds + totals.speakingSeconds
    + totals.phrasesSeconds + totals.audioSeconds + totals.readingSeconds + totals.vocabularySeconds;
  return totals;
}

function getDeviceId() {
  let id = localStorage.getItem(deviceKey);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(deviceKey, id); }
  return id;
}

function getBatchId() {
  let id = localStorage.getItem(batchKey);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(batchKey, id); }
  return id;
}

function rotateBatchId() {
  localStorage.setItem(batchKey, crypto.randomUUID());
}
