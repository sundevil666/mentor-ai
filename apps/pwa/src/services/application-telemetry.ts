import type { ApplicationTelemetryEvent, ApplicationTelemetryEventType } from '@mentor-ai/shared';
import { synchronizeApplicationTelemetry } from './api-client.js';
import { mentorDb } from './indexed-db.js';

const deviceKey = 'mentor-ai-device-id';
const sessionId = crypto.randomUUID();
const maximumLocalEvents = 2_000;

export async function recordApplicationTelemetry(input: {
  studentId: string;
  type: ApplicationTelemetryEventType;
  severity?: ApplicationTelemetryEvent['severity'];
  route?: string;
  errorCode?: string;
}) {
  const event: ApplicationTelemetryEvent = {
    id: `telemetry:${crypto.randomUUID()}`,
    studentId: input.studentId,
    sessionId,
    sourceDeviceId: getDeviceId(),
    type: input.type,
    severity: input.severity ?? 'info',
    route: sanitizeLabel(input.route),
    errorCode: sanitizeLabel(input.errorCode),
    appVersion: process.env.APP_VERSION ?? 'development',
    occurredAt: new Date().toISOString(),
  };
  const db = await mentorDb;
  await db.put('application-telemetry', event);
  await pruneLocalEvents();
  window.dispatchEvent(new Event('mentor-analysis-data-updated'));
  if (navigator.onLine) void syncApplicationTelemetry().catch(() => undefined);
  return event;
}

export async function loadApplicationTelemetry() {
  const db = await mentorDb;
  return db.getAll('application-telemetry') as Promise<ApplicationTelemetryEvent[]>;
}

export async function syncApplicationTelemetry() {
  if (!navigator.onLine) return;
  const db = await mentorDb;
  const local = await loadApplicationTelemetry();
  if (!local.length) return;
  const merged = await synchronizeApplicationTelemetry(local);
  for (const event of merged) await db.put('application-telemetry', event);
  await pruneLocalEvents();
}

function sanitizeLabel(value?: string) {
  return value?.replace(/[\r\n\t]/g, ' ').trim().slice(0, 160) || undefined;
}

function getDeviceId() {
  let id = localStorage.getItem(deviceKey);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(deviceKey, id);
  }
  return id;
}

async function pruneLocalEvents() {
  const db = await mentorDb;
  const events = await loadApplicationTelemetry();
  const stale = events.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).slice(maximumLocalEvents);
  for (const event of stale) await db.delete('application-telemetry', event.id);
}
