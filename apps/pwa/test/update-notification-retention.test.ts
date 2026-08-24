import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { selectRetainedUpdateNotifications } from '../src/services/update-notification-retention.js';

const notification = (id: string, day: number, read: boolean) => ({
  id,
  createdAt: `2026-08-${String(day).padStart(2, '0')}T08:00:00.000Z`,
  readAt: read ? `2026-08-${String(day).padStart(2, '0')}T09:00:00.000Z` : null,
});

describe('update notification retention', () => {
  it('keeps every unread notification and the five newest read notifications', () => {
    const retained = selectRetainedUpdateNotifications([
      ...Array.from({ length: 8 }, (_, index) => notification(`unread-${index}`, index + 1, false)),
      ...Array.from({ length: 7 }, (_, index) => notification(`read-${index}`, index + 10, true)),
    ]);

    assert.equal(retained.filter((item) => item.readAt === null).length, 8);
    assert.deepEqual(
      retained.filter((item) => item.readAt !== null).map((item) => item.id),
      ['read-6', 'read-5', 'read-4', 'read-3', 'read-2'],
    );
  });

  it('keeps fewer than five read notifications when that is all that exists', () => {
    const retained = selectRetainedUpdateNotifications([
      notification('read-1', 1, true),
      notification('read-2', 2, true),
    ]);

    assert.deepEqual(retained.map((item) => item.id), ['read-2', 'read-1']);
  });
});
