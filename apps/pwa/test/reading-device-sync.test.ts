import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReadingDeviceSession, ReadingResumeSnapshot } from '@mentor-ai/shared';
import { chooseReadingResumeState } from '../src/services/reading-device-sync.js';

function device(overrides: Partial<ReadingDeviceSession> = {}): ReadingDeviceSession {
  return {
    id: 'tablet:book-1', studentId: 'student-1', bookId: 'book-1', deviceId: 'tablet', deviceLabel: 'iPad',
    position: 420, sentenceStartPosition: 416, sentenceEndPosition: 428, status: 'closed',
    progressUpdatedAt: '2026-09-09T10:00:00.000Z', lastSeenAt: '2026-09-09T10:00:01.000Z', ...overrides,
  };
}

test('selects the newest exact position reported by any signed-in device', () => {
  const snapshot: ReadingResumeSnapshot = { devices: [device()], serverTime: '2026-09-09T10:00:05.000Z' };
  const result = chooseReadingResumeState(snapshot, 'laptop');
  assert.deepEqual([result.position, result.sentenceStartPosition, result.sentenceEndPosition], [420, 416, 428]);
});

test('asks for a reading device that disappeared before closing its session', () => {
  const snapshot: ReadingResumeSnapshot = {
    devices: [device({ status: 'reading', lastSeenAt: '2026-09-09T09:59:30.000Z' })],
    serverTime: '2026-09-09T10:00:05.000Z',
  };
  assert.equal(chooseReadingResumeState(snapshot, 'laptop').waitingDevices[0]?.deviceLabel, 'iPad');
});

test('confirms a recently responding or cleanly closed device', () => {
  const snapshot: ReadingResumeSnapshot = {
    devices: [device({ status: 'reading', lastSeenAt: '2026-09-09T09:59:55.000Z' }), device({ deviceId: 'phone', id: 'phone:book-1' })],
    serverTime: '2026-09-09T10:00:05.000Z',
  };
  const result = chooseReadingResumeState(snapshot, 'laptop');
  assert.equal(result.waitingDevices.length, 0);
  assert.equal(result.synchronizedDevices.length, 2);
});
