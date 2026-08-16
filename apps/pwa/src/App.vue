<template>
  <router-view />
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  activatePendingServiceWorkerUpdate,
  consumePendingAppUpdate,
  createAppUpdateReloadUrl,
  rememberPendingAppUpdate,
  startAppUpdatePolling,
  showSystemUpdateNotification,
  type AppUpdateCheckResult,
} from 'src/services/app-update';
import { useAppStore } from 'src/stores/app-store';

const appStore = useAppStore();
const router = useRouter();
let stopUpdatePolling: (() => void) | undefined;
let isReloadingForUpdate = false;
let remoteSyncPollingTimer: number | undefined;

onMounted(async () => {
  window.addEventListener('mentor-ai:update-available', handleUpdateAvailable);
  window.addEventListener('mentor-ai:install-update', handleInstallUpdateRequest);
  document.addEventListener('visibilitychange', handleVisibilitySync);
  navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
  stopUpdatePolling = startAppUpdatePolling(handleServerUpdateAvailable);
  startRemoteSyncPolling();
  await showCompletedUpdateNotification();
});

onUnmounted(() => {
  window.removeEventListener('mentor-ai:update-available', handleUpdateAvailable);
  window.removeEventListener('mentor-ai:install-update', handleInstallUpdateRequest);
  document.removeEventListener('visibilitychange', handleVisibilitySync);
  navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
  stopRemoteSyncPolling();
  stopUpdatePolling?.();
});

function handleUpdateAvailable() {
  appStore.setAvailableAppUpdate('new version');
}

function handleServerUpdateAvailable(result: AppUpdateCheckResult) {
  if (isReloadingForUpdate) {
    return;
  }

  appStore.setAvailableAppUpdate(result.manifest.version, result.notification?.message);

  if (document.visibilityState !== 'visible' && result.notification) {
    void showSystemUpdateNotification(result.notification);
  }
}

function handleInstallUpdateRequest() {
  const update = appStore.availableAppUpdate;

  if (update) {
    void installUpdate(update.version);
  }
}

async function installUpdate(version: string) {
  if (isReloadingForUpdate) {
    return;
  }

  isReloadingForUpdate = true;
  appStore.setAppUpdateInstalling(true);

  if (!appStore.isHydrated) {
    await appStore.hydrate();
  }

  const lessonProgress = await appStore.prepareForAppUpdate();

  if (appStore.session) {
    await router.replace({ name: 'dashboard' });
  }

  rememberPendingAppUpdate({
    targetVersion: version,
    requestedAt: new Date().toISOString(),
    ...lessonProgress,
  });

  Notify.create({
    type: 'info',
    position: 'bottom',
    icon: 'sync',
    message: 'Saving progress and updating…',
    timeout: 0,
  });

  await activatePendingServiceWorkerUpdate();
  window.location.replace(createAppUpdateReloadUrl(window.location, version));
}

async function showCompletedUpdateNotification() {
  const pendingUpdate = consumePendingAppUpdate();

  if (!pendingUpdate) {
    return;
  }

  removeUpdateReloadParameters();

  if (!appStore.isHydrated) {
    await appStore.hydrate();
  }

  const installedVersion = process.env.APP_VERSION ?? pendingUpdate.targetVersion;
  const progressCaption = pendingUpdate.lessonTitle
    ? `${pendingUpdate.lessonTitle} · exercise ${pendingUpdate.exerciseNumber}/${pendingUpdate.exerciseCount} restored.`
    : 'The latest application version is now active.';
  const notification = await appStore.recordUpdateNotification(
    installedVersion,
    `Mentor AI was updated. ${progressCaption}`,
  );

  if (document.visibilityState !== 'visible') {
    await showSystemUpdateNotification(notification);
  }
  Notify.create({
    type: 'positive',
    position: 'bottom',
    icon: 'check_circle',
    message: 'Mentor AI was updated',
    caption: progressCaption,
    timeout: 10000,
  });
}

function removeUpdateReloadParameters() {
  const url = new URL(window.location.href);
  url.searchParams.delete('app-update');
  url.searchParams.delete('cache-bust');
  window.history.replaceState(window.history.state, '', url);
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

function handleServiceWorkerMessage(event: MessageEvent) {
  if (event.data?.type === 'mentor-ai:learning-sync-finished') {
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
