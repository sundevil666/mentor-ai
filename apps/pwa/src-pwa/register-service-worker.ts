import { register } from 'register-service-worker';

let refreshing = false;

navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (refreshing) {
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

    void navigator.serviceWorker.getRegistration().then((registration) => {
      registration?.waiting?.postMessage({ type: 'mentor-ai:skip-waiting' });
    });

    return undefined;
  },
  offline() {
    return undefined;
  },
  error(error) {
    console.error('Service worker registration failed:', error);
  },
});
