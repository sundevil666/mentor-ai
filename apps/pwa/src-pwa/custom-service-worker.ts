import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

type LearningSyncEvent = Event & {
  tag?: string;
  waitUntil(promise: Promise<void>): void;
};

type QueuedLearningEvent = {
  id: string;
  status: string;
  exerciseResults?: Array<{ id: string }>;
  speechResults?: Array<{ id: string }>;
  [key: string]: unknown;
};

const learningSyncTag = 'mentor-ai-learning-sync';

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'mentor-ai-api',
  }),
);

if (process.env.PROD) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL(process.env.PWA_FALLBACK_HTML), {
      denylist: [new RegExp(process.env.PWA_SERVICE_WORKER_REGEX), /workbox-(.)*\.js$/],
    }),
  );
}

self.addEventListener('sync', (event: Event) => {
  const syncEvent = event as LearningSyncEvent;

  if (syncEvent.tag === learningSyncTag) {
    syncEvent.waitUntil(syncPendingLearningEvents());
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'mentor-ai:sync-learning') {
    event.waitUntil(syncPendingLearningEvents());
  }
});

async function syncPendingLearningEvents() {
  const db = await openMentorDb();
  const events = (await getAllFromStore(db, 'sync-queue')) as QueuedLearningEvent[];
  const pendingEvents = events.filter((event) => event.status === 'pending');

  if (pendingEvents.length === 0) {
    db.close();
    return;
  }

  const response = await fetch('/api/synchronization', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      events: pendingEvents.map(toLearningEvent),
      exerciseResults: uniqueById(pendingEvents.flatMap((event) => event.exerciseResults ?? [])),
      speechResults: uniqueById(pendingEvents.flatMap((event) => event.speechResults ?? [])),
    }),
  });

  if (!response.ok) {
    db.close();
    throw new Error('Background learning synchronization failed.');
  }

  const body = (await response.json()) as {
    data?: {
      acknowledgements?: Array<{
        eventId: string;
        status: string;
      }>;
    };
  };

  for (const acknowledgement of body.data?.acknowledgements ?? []) {
    const queuedEvent = pendingEvents.find((event) => event.id === acknowledgement.eventId);

    if (queuedEvent) {
      await putInStore(db, 'sync-queue', { ...queuedEvent, status: acknowledgement.status });
    }
  }

  db.close();
  await notifyClientsLearningSyncFinished();
}

function openMentorDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mentor-ai');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getAllFromStore(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function putInStore(db: IDBDatabase, storeName: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const request = transaction.objectStore(storeName).put(value);

    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function toLearningEvent(event: QueuedLearningEvent) {
  const { status: _status, exerciseResults: _exerciseResults, speechResults: _speechResults, ...learningEvent } = event;
  void _status;
  void _exerciseResults;
  void _speechResults;
  return learningEvent;
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

async function notifyClientsLearningSyncFinished() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

  for (const client of clients) {
    client.postMessage({ type: 'mentor-ai:learning-sync-finished' });
  }
}
