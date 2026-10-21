import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { isServerMaintenanceDue, runServerMaintenance, serverMaintenanceIntervalMs } from '../src/services/server-maintenance.js';

describe('daily server maintenance gate', () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
  });

  it('runs once per day and records only a successful batch', async () => {
    const first = new Date('2026-09-11T08:00:00.000Z');
    let calls = 0;
    assert.equal(await runServerMaintenance(async () => { calls += 1; }, { now: () => first }), true);
    assert.equal(await runServerMaintenance(async () => { calls += 1; }, { now: () => new Date(first.getTime() + 60_000) }), false);
    assert.equal(calls, 1);
    assert.equal(isServerMaintenanceDue(first.getTime() + serverMaintenanceIntervalMs), true);
  });

  it('retains a daily backoff after failure but permits explicit retries', async () => {
    await assert.rejects(runServerMaintenance(async () => { throw new Error('quota'); }));
    assert.equal(isServerMaintenanceDue(), false);
    let calls = 0;
    assert.equal(await runServerMaintenance(async () => { calls++; }), false);
    assert.equal(await runServerMaintenance(async () => { calls++; }, { force: true }), true);
    assert.equal(calls, 1);
  });

  it('keeps account and book-library windows independent', async () => {
    await runServerMaintenance(async () => {}, { scope: ':first' });
    assert.equal(isServerMaintenanceDue(Date.now(), ':first'), false);
    assert.equal(isServerMaintenanceDue(Date.now(), ':second'), true);
    assert.equal(isServerMaintenanceDue(Date.now(), ':books:first'), true);
  });

  it('deduplicates concurrent wakeups', async () => {
    let release!: () => void;
    let calls = 0;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const first = runServerMaintenance(async () => { calls += 1; await pending; });
    const second = runServerMaintenance(async () => { calls += 1; });
    release();
    assert.equal(await first, true);
    assert.equal(await second, true);
    assert.equal(calls, 1);
  });
});
