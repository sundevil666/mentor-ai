import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  collectPendingLessons,
  criticalAgeMs,
  describeQueue,
  fingerprintLesson,
  synchronizeLessonQueue,
  warningAgeMs,
} from '../scripts/private-lesson-queue.mjs';

const lesson = {
  id: 'private-test-lesson',
  title: 'Private test lesson',
  createdAt: '2026-09-12T00:00:00.000Z',
  exercises: [],
};

test('detects new and edited lessons by content fingerprint', () => {
  const now = new Date('2026-09-12T12:00:00.000Z');
  const library = { version: 1, lessons: [lesson] };
  const first = collectPendingLessons(library, { syncedFingerprints: {}, pendingSince: {} }, now);
  assert.equal(first.pending.length, 1);

  const synced = { syncedFingerprints: { [lesson.id]: fingerprintLesson(lesson) }, pendingSince: {} };
  assert.equal(collectPendingLessons(library, synced, now).pending.length, 0);
  assert.equal(collectPendingLessons({ ...library, lessons: [{ ...lesson, title: 'Edited' }] }, synced, now).pending.length, 1);
});

test('raises warning at 30 days and critical status at 60 days', () => {
  const now = new Date('2026-09-12T12:00:00.000Z');
  const library = { version: 1, lessons: [lesson] };
  const warning = describeQueue(library, {
    pendingSince: { [lesson.id]: new Date(now.getTime() - warningAgeMs).toISOString() },
    syncedFingerprints: {},
  }, now);
  assert.equal(warning.severity, 'warning');

  const critical = describeQueue(library, {
    pendingSince: { [lesson.id]: new Date(now.getTime() - criticalAgeMs).toISOString() },
    syncedFingerprints: {},
  }, now);
  assert.equal(critical.severity, 'critical');
});

test('keeps lessons pending on failure and respects the daily attempt gate', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mentor-ai-lesson-queue-'));
  const paths = await writeFixture(directory);
  let requests = 0;
  const failed = await synchronizeLessonQueue({
    ...paths,
    now: () => new Date('2026-09-12T12:00:00.000Z'),
    fetchImpl: async () => { requests += 1; return new Response('{"data":{"message":"quota"}}', { status: 500 }); },
  });
  assert.equal(failed.reason, 'failed');
  assert.equal(failed.pendingCount, 1);

  const gated = await synchronizeLessonQueue({
    ...paths,
    now: () => new Date('2026-09-12T13:00:00.000Z'),
    fetchImpl: async () => { requests += 1; return new Response('{}', { status: 200 }); },
  });
  assert.equal(gated.reason, 'not-due');
  assert.equal(requests, 1);
});

test('marks uploaded lesson versions as synchronized after success', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mentor-ai-lesson-queue-'));
  const paths = await writeFixture(directory);
  let uploaded;
  const result = await synchronizeLessonQueue({
    ...paths,
    force: true,
    now: () => new Date('2026-09-12T12:00:00.000Z'),
    fetchImpl: async (_url, init) => {
      uploaded = JSON.parse(init.body);
      return new Response('{"data":{"importedCount":1}}', { status: 200 });
    },
  });
  assert.equal(result.reason, 'synchronized');
  assert.equal(result.pendingCount, 0);
  assert.deepEqual(uploaded, { lessons: [lesson] });
  const state = JSON.parse(await readFile(paths.statePath, 'utf8'));
  assert.equal(state.syncedFingerprints[lesson.id], fingerprintLesson(lesson));
});

async function writeFixture(directory) {
  const libraryPath = join(directory, 'lesson-library.json');
  const statePath = join(directory, 'lesson-sync-state.json');
  const tokenPath = join(directory, 'token');
  await writeFile(libraryPath, JSON.stringify({ version: 1, updatedAt: lesson.createdAt, lessons: [lesson] }));
  await writeFile(tokenPath, 'test-token');
  return { libraryPath, statePath, tokenPath, apiUrl: 'https://example.test/import' };
}
