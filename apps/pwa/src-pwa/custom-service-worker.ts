import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
