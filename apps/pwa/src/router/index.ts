import { route } from 'quasar/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { readLastRoutePreference, saveLastRoutePreference } from 'src/services/user-preferences';

const chunkReloadStorageKey = 'mentor-ai:chunk-reload-attempted';

export default route(() => {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  router.beforeEach((to, from) => {
    if (process.env.SERVER || from.name !== undefined || to.name !== 'dashboard' || to.fullPath !== '/') {
      return true;
    }

    const lastRoute = readLastRoutePreference();
    return lastRoute && lastRoute !== to.fullPath ? lastRoute : true;
  });

  router.afterEach((to) => {
    if (!process.env.SERVER && to.matched.length > 0 && to.name !== undefined) {
      window.sessionStorage.removeItem(chunkReloadStorageKey);
      saveLastRoutePreference(to.fullPath);
    }
  });

  router.onError((error) => {
    if (process.env.SERVER || !isDynamicImportError(error)) {
      return;
    }

    if (window.sessionStorage.getItem(chunkReloadStorageKey) === 'true') {
      return;
    }

    window.sessionStorage.setItem(chunkReloadStorageKey, 'true');
    void refreshServiceWorker().finally(() => {
      window.location.reload();
    });
  });

  return router;
});

function isDynamicImportError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('Expected a JavaScript-or-Wasm module script')
  );
}

async function refreshServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  await registration?.update();
}
