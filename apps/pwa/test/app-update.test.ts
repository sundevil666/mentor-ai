import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { checkForAppUpdate, consumePendingAppUpdate, rememberPendingAppUpdate } from '../src/services/app-update.js';

describe('PWA app update checks', () => {
  const localStorageData = new Map<string, string>();
  let serviceWorkerUpdates = 0;

  beforeEach(() => {
    localStorageData.clear();
    serviceWorkerUpdates = 0;

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem(key: string) {
            return localStorageData.get(key) ?? null;
          },
          setItem(key: string, value: string) {
            localStorageData.set(key, value);
          },
          removeItem(key: string) {
            localStorageData.delete(key);
          },
        },
      },
    });

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker: {
          async getRegistration() {
            return {
              async update() {
                serviceWorkerUpdates += 1;
              },
            };
          },
        },
      },
    });
  });

  it('ignores the currently running app version', async () => {
    globalThis.fetch = async () =>
      jsonResponse({
        version: '0.1.0',
      });

    const result = await checkForAppUpdate();

    assert.equal(result, null);
    assert.equal(serviceWorkerUpdates, 0);
  });

  it('creates one notification for a newer server manifest version', async () => {
    globalThis.fetch = async () =>
      jsonResponse({
        version: '0.2.0',
        releasedAt: '2026-06-29T09:00:00.000Z',
        notes: ['New lessons are available.'],
      });

    const firstResult = await checkForAppUpdate();
    const secondResult = await checkForAppUpdate();

    assert.equal(firstResult?.manifest.version, '0.2.0');
    assert.equal(firstResult?.notification?.id, 'update-0.2.0');
    assert.match(firstResult?.notification?.message ?? '', /New lessons are available/);
    assert.equal(secondResult?.notification, null);
    assert.equal(serviceWorkerUpdates, 1);
  });

  it('remembers lesson progress across the update reload exactly once', () => {
    rememberPendingAppUpdate({
      targetVersion: '0.2.0',
      requestedAt: '2026-08-14T10:00:00.000Z',
      lessonTitle: 'Small Talk',
      exerciseNumber: 3,
      exerciseCount: 8,
    });

    assert.equal(consumePendingAppUpdate()?.exerciseNumber, 3);
    assert.equal(consumePendingAppUpdate(), null);
  });
});

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
