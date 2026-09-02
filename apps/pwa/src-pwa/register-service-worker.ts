import { register } from 'register-service-worker';

const updateReloadRequestKey = 'mentor-ai:update-reload-requested';
const appUpdatesEnabled = !process.env.DEV;
let refreshing = false;

if (!appUpdatesEnabled) {
  clearDevelopmentUpdateState();
}

navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (!appUpdatesEnabled) {
    return;
  }

  if (refreshing || window.localStorage.getItem(updateReloadRequestKey) === null) {
    return;
  }

  refreshing = true;
  const pendingUpdate = readPendingUpdateVersion();
  const url = new URL(window.location.href);
  url.searchParams.set('app-update', pendingUpdate);
  url.searchParams.set('cache-bust', Date.now().toString());
  window.location.replace(url);
});

function readPendingUpdateVersion() {
  const rawValue = window.localStorage.getItem(updateReloadRequestKey);

  try {
    const value = rawValue ? JSON.parse(rawValue) as { targetVersion?: unknown } : null;
    return typeof value?.targetVersion === 'string' ? value.targetVersion : Date.now().toString();
  } catch {
    return Date.now().toString();
  }
}

register(process.env.SERVICE_WORKER_FILE, {
  ready() {
    return undefined;
  },
  registered() {
    return undefined;
  },
  cached() {
    return undefined;
  },
  updatefound() {
    return undefined;
  },
  updated() {
    if (!appUpdatesEnabled) {
      return undefined;
    }

    window.dispatchEvent(
      new CustomEvent('mentor-ai:update-available', {
        detail: {
          version: process.env.APP_VERSION,
        },
      }),
    );

    return undefined;
  },
  offline() {
    return undefined;
  },
  error(error) {
    console.error('Service worker registration failed:', error);
  },
});

function clearDevelopmentUpdateState() {
  window.localStorage.removeItem(updateReloadRequestKey);

  const url = new URL(window.location.href);
  if (!url.searchParams.has('app-update') && !url.searchParams.has('cache-bust')) {
    return;
  }

  url.searchParams.delete('app-update');
  url.searchParams.delete('cache-bust');
  window.history.replaceState(window.history.state, '', url);
}
