import test from 'node:test';
import assert from 'node:assert/strict';
import type { ContentEngagementEvent } from '@mentor-ai/shared';
import { reconcileLessonCompletionSummary, summarizeContentEngagement } from '../src/services/content-engagement-summary.js';

function event(
  id: string,
  type: ContentEngagementEvent['type'],
  createdAt: string,
  feedback?: ContentEngagementEvent['feedback'],
): ContentEngagementEvent {
  return {
    id,
    studentId: 'student',
    category: 'video',
    contentId: 'video-1',
    type,
    feedback,
    sourceDeviceId: 'device',
    createdAt,
  };
}

test('summarizes playback counts and keeps the newest mentor feedback', () => {
  const summaries = summarizeContentEngagement([
    event('4', 'feedback-selected', '2026-08-25T10:04:00.000Z', 'clear'),
    event('1', 'started', '2026-08-25T10:01:00.000Z'),
    event('3', 'full-play', '2026-08-25T10:03:00.000Z'),
    event('2', 'finished', '2026-08-25T10:02:00.000Z'),
    event('5', 'feedback-selected', '2026-08-25T10:05:00.000Z', 'enjoy-listening'),
  ]);

  assert.deepEqual(summaries.get('video-1'), {
    starts: 1,
    finishes: 1,
    fullPlays: 1,
    feedback: 'enjoy-listening',
  });
});

test('completed lesson statistics repair missing engagement counts without double counting', () => {
  const missing = { starts: 17, finishes: 0, fullPlays: 0 };
  assert.deepEqual(reconcileLessonCompletionSummary(missing, 1), {
    starts: 17, finishes: 1, fullPlays: 1,
  });
  assert.deepEqual(reconcileLessonCompletionSummary({ starts: 17, finishes: 1, fullPlays: 1 }, 1), {
    starts: 17, finishes: 1, fullPlays: 1,
  });
});
