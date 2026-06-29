import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  compactAcknowledgedSyncEvent,
  selectRecordsToPrune,
  type RetentionRecord,
} from '../src/services/storage-retention.js';

describe('PWA storage retention', () => {
  it('keeps the newest records and protects active records', () => {
    const records: RetentionRecord[] = [
      { id: 'old', createdAt: '2026-06-01T08:00:00.000Z' },
      { id: 'active', createdAt: '2026-06-02T08:00:00.000Z' },
      { id: 'new', createdAt: '2026-06-03T08:00:00.000Z' },
    ];

    const pruned = selectRecordsToPrune(records, 1, new Set(['active']));

    assert.deepEqual(
      pruned.map((record) => record.id).sort(),
      ['old'],
    );
  });

  it('removes bulky evidence from acknowledged synchronization events', () => {
    const compact = compactAcknowledgedSyncEvent({
      id: 'event-1',
      status: 'accepted',
      occurredAt: '2026-06-03T08:00:00.000Z',
      exerciseResults: [{ id: 'result-1' }],
      speechResults: [{ id: 'speech-1' }],
    });

    assert.equal('exerciseResults' in compact, false);
    assert.equal('speechResults' in compact, false);
  });

  it('keeps pending synchronization events untouched', () => {
    const pending = {
      id: 'event-1',
      status: 'pending',
      occurredAt: '2026-06-03T08:00:00.000Z',
      exerciseResults: [{ id: 'result-1' }],
    };

    assert.equal(compactAcknowledgedSyncEvent(pending), pending);
  });
});
