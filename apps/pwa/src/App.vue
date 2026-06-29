<template>
  <router-view />
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { onMounted, onUnmounted } from 'vue';
import { startAppUpdatePolling, showSystemUpdateNotification, type AppUpdateCheckResult } from 'src/services/app-update';
import { useAppStore } from 'src/stores/app-store';

const appStore = useAppStore();
let stopUpdatePolling: (() => void) | undefined;

onMounted(() => {
  window.addEventListener('mentor-ai:update-available', handleUpdateAvailable);
  stopUpdatePolling = startAppUpdatePolling(handleServerUpdateAvailable);
});

onUnmounted(() => {
  window.removeEventListener('mentor-ai:update-available', handleUpdateAvailable);
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
  if (!appStore.isHydrated) {
    await appStore.hydrate();
  }

  const notification = await appStore.recordUpdateNotification(result.manifest.version, result.notification?.message);

  await showSystemUpdateNotification(notification);

  Notify.create({
    type: 'info',
    icon: 'system_update_alt',
    message: 'Update available',
    caption: notification.message,
    timeout: 12000,
    actions: [
      {
        label: 'Refresh',
        color: 'white',
        handler: () => {
          window.location.reload();
        },
      },
      {
        label: 'Later',
        color: 'white',
      },
    ],
  });
}
</script>
