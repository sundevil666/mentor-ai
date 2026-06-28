import { register } from 'register-service-worker';

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
