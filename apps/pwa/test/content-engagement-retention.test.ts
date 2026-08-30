import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContentEngagementEvent } from '@mentor-ai/shared';
import {
  contentEngagementMaxAgeMs,
  contentEngagementMaxEntries,
  selectContentEngagementToPrune,
} from '../src/services/content-engagement-retention.js';

function event(id: string, createdAt: string): ContentEngagementEvent {
  return {
    id,
    studentId: 'student',
    sourceDeviceId: 'device',
    category: 'audio',
    contentId: 'story',
    type: 'started',
    createdAt,
  };
}

describe('content engagement retention', () => {
  it('removes events after 90 days', () => {
    const now = Date.parse('2026-08-30T12:00:00.000Z');
    const old = event('old', new Date(now - contentEngagementMaxAgeMs).toISOString());
    const recent = event('recent', new Date(now - contentEngagementMaxAgeMs + 1).toISOString());
    assert.deepEqual(selectContentEngagementToPrune([old, recent], now).map(({ id }) => id), ['old']);
  });

  it('keeps only the newest 1,000 events', () => {
    const now = Date.parse('2026-08-30T12:00:00.000Z');
    const events = Array.from({ length: contentEngagementMaxEntries + 1 }, (_, index) => (
      event(String(index), new Date(now - index * 1_000).toISOString())
    ));
    assert.deepEqual(selectContentEngagementToPrune(events, now).map(({ id }) => id), [String(contentEngagementMaxEntries)]);
  });
});
