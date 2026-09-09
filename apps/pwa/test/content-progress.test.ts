import assert from 'node:assert/strict';
import test from 'node:test';
import type { ContentProgress } from '@mentor-ai/shared';
import { mergeContentProgressForStorage, shouldUseSyncedReaderPosition } from '../src/services/content-progress-merge.js';

function progress(position: number, updatedAt: string): ContentProgress {
  return {
    id: 'reading:book-1',
    studentId: 'student-1',
    category: 'reading',
    contentId: 'book-1',
    position,
    furthestPosition: position,
    duration: 1_000,
    completed: false,
    sourceDeviceId: 'device-1',
    updatedAt,
  };
}

test('a stale synchronization response cannot overwrite a newer local reading position', () => {
  const staleRemote = progress(1, '2026-09-09T10:00:00.000Z');
  const selectedChapter = progress(420, '2026-09-09T10:00:01.000Z');

  const merged = mergeContentProgressForStorage(selectedChapter, staleRemote);

  assert.equal(merged.position, 420);
  assert.equal(merged.updatedAt, selectedChapter.updatedAt);
});

test('a newer synchronized position replaces an older local position', () => {
  const oldLocal = progress(1, '2026-09-09T10:00:00.000Z');
  const remote = progress(420, '2026-09-09T10:00:01.000Z');

  assert.equal(mergeContentProgressForStorage(oldLocal, remote).position, 420);
});

test('reader restoration uses the most recently changed position', () => {
  assert.equal(shouldUseSyncedReaderPosition('2026-09-09T10:00:01.000Z', '2026-09-09T10:00:00.000Z'), false);
  assert.equal(shouldUseSyncedReaderPosition('2026-09-09T10:00:00.000Z', '2026-09-09T10:00:01.000Z'), true);
});
