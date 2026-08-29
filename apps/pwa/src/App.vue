<template>
  <router-view />
  <transition name="update-available-overlay">
    <div
      v-if="appStore.availableAppUpdate && !appStore.isAppUpdateInstalling"
      class="app-update-available-overlay"
      aria-hidden="true"
    />
  </transition>
  <transition name="update-button">
    <q-btn
      v-if="!appStore.isAppUpdateInstalling"
      class="app-update-floating-button"
      :aria-label="appUpdateButtonTooltip"
      :color="appStore.availableAppUpdate ? 'amber-8' : 'primary'"
      :icon="appStore.availableAppUpdate ? 'system_update_alt' : 'system_update'"
      :label="appStore.availableAppUpdate ? 'Update' : undefined"
      :round="!appStore.availableAppUpdate"
      :unelevated="!appStore.availableAppUpdate"
      no-caps
      @click="handleUpdateButtonClick"
    >
      <q-badge
        v-if="appStore.availableAppUpdate"
        color="red-7"
        floating
        rounded
      />
      <q-tooltip>{{ appUpdateButtonTooltip }}</q-tooltip>
    </q-btn>
  </transition>
  <transition name="update-overlay">
    <div
      v-if="appStore.isAppUpdateInstalling"
      class="app-update-overlay"
      role="status"
      aria-live="assertive"
      aria-busy="true"
    >
      <div
        class="app-update-overlay__glow"
        aria-hidden="true"
      />
      <div class="app-update-overlay__card">
        <div
          class="app-update-overlay__spinner"
          aria-hidden="true"
        >
          <q-spinner-orbit
            color="primary"
            size="72px"
          />
          <q-icon
            class="app-update-overlay__icon"
            name="auto_awesome"
            color="primary"
            size="26px"
          />
        </div>
        <div class="app-update-overlay__eyebrow">
          Mentor AI
        </div>
        <h1>Updating the application</h1>
        <p>We are saving your progress and preparing the latest version.</p>
        <div class="app-update-overlay__notice">
          <q-icon
            name="touch_app"
            size="20px"
          />
          <span>No action is needed. Please keep the app open.</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  activatePendingServiceWorkerUpdate,
  consumePendingAppUpdate,
  createAppUpdateReloadUrl,
  checkForAppUpdate,
  rememberPendingAppUpdate,
  startAppUpdatePolling,
  showSystemUpdateNotification,
  type AppUpdateCheckResult,
} from 'src/services/app-update';
import { useAppStore } from 'src/stores/app-store';
import { syncAllContentProgress } from 'src/services/content-progress';

const appStore = useAppStore();
const router = useRouter();
let stopUpdatePolling: (() => void) | undefined;
let isReloadingForUpdate = false;
let remoteSyncPollingTimer: number | undefined;

const appUpdateButtonTooltip = computed(() => appStore.availableAppUpdate
  ? `Update ${appStore.availableAppUpdate.version} is ready. Click to install.`
  : 'Check for a Mentor AI update.');

onMounted(async () => {
  window.addEventListener('mentor-ai:update-available', handleUpdateAvailable);
  window.addEventListener('mentor-ai:install-update', handleInstallUpdateRequest);
  window.addEventListener('mentor-ai:check-update', handleManualUpdateCheck);
  document.addEventListener('visibilitychange', handleVisibilitySync);
  window.addEventListener('online', handleContentProgressSync);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
  stopUpdatePolling = startAppUpdatePolling(handleServerUpdateAvailable);
  startRemoteSyncPolling();
  await showCompletedUpdateNotification();
});

onUnmounted(() => {
  window.removeEventListener('mentor-ai:update-available', handleUpdateAvailable);
  window.removeEventListener('mentor-ai:install-update', handleInstallUpdateRequest);
  window.removeEventListener('mentor-ai:check-update', handleManualUpdateCheck);
  document.removeEventListener('visibilitychange', handleVisibilitySync);
  navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
  stopRemoteSyncPolling();
  stopUpdatePolling?.();
  window.removeEventListener('online', handleContentProgressSync);
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
});

function handleContentProgressSync() {
  void syncAllContentProgress().catch(() => undefined);
}

function handleOnline() { appStore.setNetworkStatus(true); }
function handleOffline() { appStore.setNetworkStatus(false); }

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

function handleUpdateButtonClick() {
  if (!navigator.onLine) {
    Notify.create({ type: 'warning', icon: 'wifi_off', message: 'Internet is required to update Mentor AI' });
    return;
  }

  if (appStore.availableAppUpdate) {
    handleInstallUpdateRequest();
    return;
  }

  void handleManualUpdateCheck();
}

async function handleManualUpdateCheck() {
  if (!navigator.onLine) {
    Notify.create({ type: 'warning', icon: 'wifi_off', message: 'Internet is required to update Mentor AI' });
    return;
  }
  appStore.setAppUpdateInstalling(true);
  try {
    const result = await checkForAppUpdate();
    if (result?.manifest) {
      handleServerUpdateAvailable(result);
      await installUpdate(result.manifest.version);
      return;
    }
    appStore.setAppUpdateInstalling(false);
    Notify.create({ type: 'positive', icon: 'check_circle', message: 'Mentor AI is up to date' });
  } catch {
    appStore.setAppUpdateInstalling(false);
    Notify.create({ type: 'negative', icon: 'cloud_off', message: 'Could not update Mentor AI', caption: 'Check the connection and try again.' });
  }
}

async function installUpdate(version: string) {
  if (isReloadingForUpdate) {
    return;
  }

  isReloadingForUpdate = true;
  appStore.setAppUpdateInstalling(true);

  try {
    if (!appStore.isHydrated) await appStore.hydrate();
    const lessonProgress = await appStore.prepareForAppUpdate();
    if (appStore.session) await router.replace({ name: 'dashboard' });

    rememberPendingAppUpdate({
      targetVersion: version,
      requestedAt: new Date().toISOString(),
      ...lessonProgress,
    });

    await activatePendingServiceWorkerUpdate();
    window.location.replace(createAppUpdateReloadUrl(window.location, version));
  } catch {
    isReloadingForUpdate = false;
    appStore.setAppUpdateInstalling(false);
    Notify.create({ type: 'negative', icon: 'cloud_off', message: 'Could not install the update', caption: 'Your progress is safe. Check the connection and try again.' });
  }
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
    void appStore.refreshMyShiftActivity(false);
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

<style scoped>
.app-update-available-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(15, 23, 42, 0.64);
  backdrop-filter: blur(3px);
  touch-action: none;
}

.app-update-floating-button {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 72px);
  right: max(16px, env(safe-area-inset-right));
  z-index: 9001;
  min-width: 52px;
  min-height: 52px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.3);
}

.app-update-floating-button.q-btn--rectangle {
  min-width: 132px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 18px;
  color: #111827;
  font-size: 16px;
  font-weight: 800;
  box-shadow: 0 16px 42px rgba(0, 0, 0, 0.38);
}

.app-update-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 24px;
  background: linear-gradient(145deg, rgba(240, 253, 250, 0.98), rgba(239, 246, 255, 0.99));
  cursor: wait;
  touch-action: none;
  user-select: none;
}

.app-update-overlay__glow {
  position: absolute;
  width: min(82vw, 560px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(20, 184, 166, 0.2), transparent 68%);
  animation: update-glow 2.4s ease-in-out infinite;
}

.app-update-overlay__card {
  position: relative;
  width: min(100%, 420px);
  padding: 36px 28px 30px;
  border: 1px solid rgba(15, 118, 110, 0.13);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.16);
  text-align: center;
  backdrop-filter: blur(18px);
}

.app-update-overlay__spinner {
  position: relative;
  display: grid;
  width: 88px;
  height: 88px;
  margin: 0 auto 18px;
  place-items: center;
}

.app-update-overlay__icon { position: absolute; }

.app-update-overlay__eyebrow {
  margin-bottom: 6px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.app-update-overlay h1 {
  margin: 0;
  color: #0f172a;
  font-size: clamp(24px, 7vw, 32px);
  font-weight: 800;
  line-height: 1.15;
}

.app-update-overlay p {
  margin: 14px auto 22px;
  color: #475569;
  font-size: 16px;
  line-height: 1.55;
}

.app-update-overlay__notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 48px;
  padding: 10px 14px;
  border-radius: 16px;
  color: #115e59;
  background: #ccfbf1;
  font-size: 14px;
  font-weight: 700;
}

.update-overlay-enter-active,
.update-overlay-leave-active { transition: opacity 180ms ease; }
.update-overlay-enter-from,
.update-overlay-leave-to { opacity: 0; }

.update-available-overlay-enter-active,
.update-available-overlay-leave-active,
.update-button-enter-active,
.update-button-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.update-available-overlay-enter-from,
.update-available-overlay-leave-to { opacity: 0; }
.update-button-enter-from,
.update-button-leave-to { opacity: 0; transform: translateY(-8px); }

@keyframes update-glow {
  0%, 100% { opacity: 0.7; transform: scale(0.94); }
  50% { opacity: 1; transform: scale(1.06); }
}

@media (prefers-reduced-motion: reduce) {
  .app-update-overlay__glow { animation: none; }
}
</style>
