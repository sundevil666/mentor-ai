<template>
  <router-view />
  <transition name="update-overlay">
    <div
      v-if="appStore.isAppUpdateInstalling"
      class="app-update-overlay"
      role="status"
      aria-live="assertive"
      aria-busy="true"
    >
      <q-btn
        v-if="isRouteUpdateInstalling"
        class="app-update-overlay__back"
        aria-label="Go back while this page updates"
        flat
        icon="arrow_back"
        round
        @click="leaveUpdatingPage"
      />
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
          <span>{{ isRouteUpdateInstalling ? 'You can go back and use another page while this finishes.' : 'No action is needed. Please keep the app open.' }}</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter, type RouteLocationNormalized } from 'vue-router';
import {
  activatePendingServiceWorkerUpdate,
  consumePendingAppUpdate,
  createAppUpdateReloadUrl,
  checkForAppUpdate,
  isAppUpdateRouteAffected,
  rememberPendingAppUpdate,
  startAppUpdatePolling,
  showSystemUpdateNotification,
  type AppUpdateCheckResult,
} from 'src/services/app-update';
import { useAppStore } from 'src/stores/app-store';
import { syncAllContentProgress } from 'src/services/content-progress';
import { syncLearningActivity } from 'src/services/learning-activity';

const appStore = useAppStore();
const router = useRouter();
const route = useRoute();
let stopUpdatePolling: (() => void) | undefined;
let removeRouteGuard: (() => void) | undefined;
let isReloadingForUpdate = false;
let remoteSyncPollingTimer: number | undefined;
let pendingManifest: AppUpdateCheckResult['manifest'] | null = null;
let activatedBackgroundManifest: AppUpdateCheckResult['manifest'] | null = null;
let routeUpdateCancelled = false;
let dismissActiveUpdatePrompt: (() => void) | undefined;
const isRouteUpdateInstalling = ref(false);

onMounted(async () => {
  window.addEventListener('mentor-ai:update-available', handleUpdateAvailable);
  window.addEventListener('mentor-ai:install-update', handleInstallUpdateRequest);
  window.addEventListener('mentor-ai:check-update', handleManualUpdateCheck);
  document.addEventListener('visibilitychange', handleVisibilitySync);
  removeRouteGuard = router.afterEach(handleRouteChanged);
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
  removeRouteGuard?.();
  navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
  stopRemoteSyncPolling();
  stopUpdatePolling?.();
  window.removeEventListener('online', handleContentProgressSync);
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
});

function handleContentProgressSync() {
  void syncAllContentProgress().catch(() => undefined);
  void syncLearningActivity().catch(() => undefined);
}

function handleOnline() { appStore.setNetworkStatus(true); }
function handleOffline() { appStore.setNetworkStatus(false); }

function handleUpdateAvailable() {
  void checkForAppUpdate().then((result) => {
    if (result) handleServerUpdateAvailable(result);
  });
}

function handleServerUpdateAvailable(result: AppUpdateCheckResult) {
  if (isReloadingForUpdate) {
    return;
  }

  if (pendingManifest?.version === result.manifest.version || activatedBackgroundManifest?.version === result.manifest.version) return;
  pendingManifest = result.manifest;

  if (isAppUpdateRouteAffected(result.manifest, route.path)) {
    appStore.setAvailableAppUpdate(result.manifest.version, result.notification?.message);
    showActivePageUpdatePrompt(result.manifest.version);
  } else {
    void installUpdateInBackground(result.manifest);
  }
}

function showActivePageUpdatePrompt(version: string) {
  dismissActiveUpdatePrompt?.();
  dismissActiveUpdatePrompt = Notify.create({
    type: 'info',
    icon: 'system_update_alt',
    message: 'This page has an update ready',
    caption: 'Update now, or open another page and Mentor AI will finish it in the background.',
    timeout: 0,
    actions: [{ label: 'OK', color: 'white', handler: () => void installUpdate(version) }],
  });
}

function handleInstallUpdateRequest() {
  const update = appStore.availableAppUpdate;

  if (update) {
    void installUpdate(update.version);
  }
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
  dismissActiveUpdatePrompt?.();
  appStore.setAppUpdateInstalling(true);

  try {
    if (!appStore.isHydrated) await appStore.hydrate();
    window.dispatchEvent(new Event('mentor-ai:prepare-app-update'));
    const lessonProgress = await appStore.prepareForAppUpdate();

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

async function installUpdateInBackground(manifest: AppUpdateCheckResult['manifest']) {
  if (isReloadingForUpdate || appStore.isAppUpdateRunningInBackground) return;
  appStore.setAppUpdateRunningInBackground(true);
  dismissActiveUpdatePrompt?.();

  try {
    const progress = await prepareUpdateProgress();
    await activatePendingServiceWorkerUpdate();
    rememberPendingAppUpdate({
      targetVersion: manifest.version,
      requestedAt: new Date().toISOString(),
      backgroundNotificationShown: true,
      reloadImmediately: false,
      ...progress,
    });
    activatedBackgroundManifest = manifest;
    pendingManifest = null;
    appStore.availableAppUpdate = null;

    const notification = await appStore.recordUpdateNotification(
      manifest.version,
      'Mentor AI was updated automatically in the background.',
    );
    if (document.visibilityState !== 'visible') await showSystemUpdateNotification(notification);
    Notify.create({
      type: 'positive',
      icon: 'published_with_changes',
      message: 'Mentor AI was updated in the background',
      actions: [{ label: 'OK', color: 'white' }],
      timeout: 0,
    });
    if (document.visibilityState !== 'visible') reloadWithBackgroundUpdate(route.fullPath);
  } catch {
    Notify.create({ type: 'negative', icon: 'cloud_off', message: 'Could not update Mentor AI in the background' });
  } finally {
    appStore.setAppUpdateRunningInBackground(false);
  }
}

async function prepareUpdateProgress() {
  if (!appStore.isHydrated) await appStore.hydrate();
  window.dispatchEvent(new Event('mentor-ai:prepare-app-update'));
  return appStore.prepareForAppUpdate();
}

function handleRouteChanged(to: RouteLocationNormalized, from: RouteLocationNormalized) {
  if (activatedBackgroundManifest) {
    void showRouteUpdateAndReload(to.fullPath, isAppUpdateRouteAffected(activatedBackgroundManifest, to.path));
    return;
  }
  if (!pendingManifest || to.fullPath === from.fullPath) return;
  if (isAppUpdateRouteAffected(pendingManifest, to.path)) {
    routeUpdateCancelled = false;
    isRouteUpdateInstalling.value = true;
    appStore.setAppUpdateInstalling(true);
    void installUpdateToRoute(pendingManifest.version, to.fullPath);
  } else {
    void installUpdateInBackground(pendingManifest);
  }
}

async function installUpdateToRoute(version: string, target: string) {
  try {
    const progress = await prepareUpdateProgress();
    rememberPendingAppUpdate({
      targetVersion: version,
      requestedAt: new Date().toISOString(),
      reloadImmediately: false,
      ...progress,
    });
    await activatePendingServiceWorkerUpdate();
    if (routeUpdateCancelled) {
      activatedBackgroundManifest = pendingManifest;
      pendingManifest = null;
      return;
    }
    reloadWithBackgroundUpdate(target);
  } catch {
    isRouteUpdateInstalling.value = false;
    appStore.setAppUpdateInstalling(false);
  }
}

async function showRouteUpdateAndReload(target: string, showLoader: boolean) {
  if (showLoader) {
    isRouteUpdateInstalling.value = true;
    appStore.setAppUpdateInstalling(true);
    await nextTick();
    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }
  reloadWithBackgroundUpdate(target);
}

function reloadWithBackgroundUpdate(target: string) {
  if (!activatedBackgroundManifest && !pendingManifest) return;
  isReloadingForUpdate = true;
  const version = activatedBackgroundManifest?.version ?? pendingManifest?.version ?? 'new-version';
  const targetUrl = new URL(target, window.location.origin);
  window.location.replace(createAppUpdateReloadUrl(targetUrl as unknown as Location, version));
}

function leaveUpdatingPage() {
  routeUpdateCancelled = true;
  isRouteUpdateInstalling.value = false;
  appStore.setAppUpdateInstalling(false);
  router.back();
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

  const restoredActiveLesson = Boolean(
    pendingUpdate.lessonSessionId
    && (
      appStore.session?.id === pendingUpdate.lessonSessionId
      || await appStore.resumePausedLesson(pendingUpdate.lessonSessionId)
    ),
  );

  if (pendingUpdate.backgroundNotificationShown) return;

  const installedVersion = process.env.APP_VERSION ?? pendingUpdate.targetVersion;
  const progressCaption = pendingUpdate.lessonTitle
    ? `${pendingUpdate.lessonTitle} · exercise ${pendingUpdate.exerciseNumber}/${pendingUpdate.exerciseCount} ${restoredActiveLesson ? 'restored' : 'saved'}.`
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
  void syncLearningActivity().catch(() => undefined);
  remoteSyncPollingTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      void refreshRemoteProgress(true);
      void syncLearningActivity().catch(() => undefined);
    }
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
    void syncLearningActivity().catch(() => undefined);
  } else if (activatedBackgroundManifest) {
    reloadWithBackgroundUpdate(route.fullPath);
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

.app-update-overlay__back {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 12px);
  left: max(12px, env(safe-area-inset-left));
  z-index: 1;
  color: #0f766e;
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

@keyframes update-glow {
  0%, 100% { opacity: 0.7; transform: scale(0.94); }
  50% { opacity: 1; transform: scale(1.06); }
}

@media (prefers-reduced-motion: reduce) {
  .app-update-overlay__glow { animation: none; }
}
</style>
