<template>
  <router-view />
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { onMounted, onUnmounted } from 'vue';
import { useAppStore } from 'src/stores/app-store';

const appStore = useAppStore();

onMounted(() => {
  window.addEventListener('mentor-ai:update-available', handleUpdateAvailable);
});

onUnmounted(() => {
  window.removeEventListener('mentor-ai:update-available', handleUpdateAvailable);
});

async function handleUpdateAvailable(event: Event) {
  if (!appStore.isHydrated) {
    await appStore.hydrate();
  }

  const version = event instanceof CustomEvent && typeof event.detail?.version === 'string' ? event.detail.version : 'unknown';
  const notification = await appStore.recordUpdateNotification(version);

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
</script>
