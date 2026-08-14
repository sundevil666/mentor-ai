import { register } from 'register-service-worker';

const updateReloadRequestKey = 'mentor-ai:update-reload-requested';
let refreshing = false;

navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (refreshing || window.localStorage.getItem(updateReloadRequestKey) === null) {
    return;
  }

  refreshing = true;
  window.location.reload();
});

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
