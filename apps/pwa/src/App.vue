<template>
  <router-view />
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { onMounted, onUnmounted } from 'vue';
import {
  activatePendingServiceWorkerUpdate,
  startAppUpdatePolling,
  showSystemUpdateNotification,
  type AppUpdateCheckResult,
} from 'src/services/app-update';
import { useAppStore } from 'src/stores/app-store';

const appStore = useAppStore();
let stopUpdatePolling: (() => void) | undefined;
let isReloadingForUpdate = false;
let remoteSyncPollingTimer: number | undefined;

onMounted(() => {
  window.addEventListener('mentor-ai:update-available', handleUpdateAvailable);
  document.addEventListener('visibilitychange', handleVisibilitySync);
  stopUpdatePolling = startAppUpdatePolling(handleServerUpdateAvailable);
  startRemoteSyncPolling();
});

onUnmounted(() => {
  window.removeEventListener('mentor-ai:update-available', handleUpdateAvailable);
  document.removeEventListener('visibilitychange', handleVisibilitySync);
  stopRemoteSyncPolling();
  stopUpdatePolling?.();
});

async function handleUpdateAvailable(event: Event) {
  if (!appStore.isHydrated) {
    await appStore.hydrate();
  }

  const version = event instanceof CustomEvent && typeof event.detail?.version === 'string' ? event.detail.version : 'unknown';
  const notification = await appStore.recordUpdateNotification(version);

  await showSystemUpdateNotification(notification);
  Notify.create({
    type: 'positive',
    icon: 'system_update_alt',
    message: 'Update installed successfully',
    caption: notification.message,
    timeout: 10000,
    actions: [
      {
        label: 'Viewed',
        color: 'white',
        handler: () => {
          void appStore.markUpdateNotificationRead(notification.id);
        },
      },
    ],
  });
}

async function handleServerUpdateAvailable(result: AppUpdateCheckResult) {
  if (isReloadingForUpdate) {
    return;
  }

  if (!appStore.isHydrated) {
    await appStore.hydrate();
  }

  const notification = await appStore.recordUpdateNotification(result.manifest.version, result.notification?.message);
  isReloadingForUpdate = true;

  await showSystemUpdateNotification(notification);

  Notify.create({
    type: 'info',
    icon: 'system_update_alt',
    message: 'Updating Mentor AI',
    caption: notification.message,
    timeout: 5000,
  });

  await activatePendingServiceWorkerUpdate();
  window.setTimeout(() => {
    window.location.reload();
  }, 1200);
}

function startRemoteSyncPolling() {
  void refreshRemoteProgress(false);
  remoteSyncPollingTimer = window.setInterval(() => {
    void refreshRemoteProgress(true);
  }, 30000);
}

function stopRemoteSyncPolling() {
  if (remoteSyncPollingTimer !== undefined) {
    window.clearInterval(remoteSyncPollingTimer);
    remoteSyncPollingTimer = undefined;
  }
}

function handleVisibilitySync() {
  if (document.visibilityState === 'visible') {
    void refreshRemoteProgress(true);
  }
}

async function refreshRemoteProgress(showNotification: boolean) {
  if (!navigator.onLine) {
    return;
  }

  if (!appStore.isHydrated) {
    await appStore.hydrate();
    return;
  }

  const hasRemoteProgress = await appStore.refreshRemoteLearningState();

  if (!showNotification || !hasRemoteProgress) {
    return;
  }

  Notify.create({
    type: 'info',
    icon: 'sync',
    message: 'Learning progress synchronized',
    caption: 'Mentor AI refreshed the latest progress from your other devices.',
    timeout: 5000,
  });
}
</script>
