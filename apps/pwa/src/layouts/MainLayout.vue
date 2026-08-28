<template>
  <q-layout view="hHh lpR fFf">
    <q-header bordered class="app-header">
      <q-toolbar>
        <q-btn
          class="network-status-button"
          :aria-label="appStore.isOnline ? 'Online' : 'Offline'"
          :color="appStore.isOnline ? 'primary' : 'negative'"
          flat
          :icon="appStore.isOnline ? 'wifi' : 'wifi_off'"
          round
        >
          <q-tooltip>{{ appStore.isOnline ? 'Online' : 'Offline' }}</q-tooltip>
        </q-btn>
        <span class="level-trend header-level-trend">
          {{ levelTrend.level }} · {{ levelTrend.daysLabel }}
          <q-tooltip>{{ levelTrend.tooltip }}</q-tooltip>
        </span>
        <q-btn
          class="app-update-button"
          :aria-label="appUpdateTooltip"
          :color="appStore.availableAppUpdate ? 'amber-7' : undefined"
          :disable="appStore.isAppUpdateInstalling"
          flat
          :icon="appStore.isAppUpdateInstalling ? 'sync' : 'system_update_alt'"
          round
          @click="installAvailableUpdate"
        >
          <q-badge
            v-if="appStore.availableAppUpdate && !appStore.isAppUpdateInstalling"
            color="red-7"
            floating
            rounded
          />
          <q-tooltip>{{ appUpdateTooltip }}</q-tooltip>
        </q-btn>
        <q-btn
          class="lesson-update-button"
          :aria-label="lessonUpdateTooltip"
          :color="offlineLessonState.status === 'error' ? 'negative' : offlineLessonState.status === 'ready' ? 'positive' : undefined"
          :disable="!appStore.isOnline || offlineLessonState.status === 'checking' || offlineLessonState.status === 'downloading'"
          flat
          :icon="lessonUpdateIcon"
          :loading="offlineLessonState.status === 'checking' || offlineLessonState.status === 'downloading'"
          round
          @click="checkOfflineLessons(true)"
        >
          <q-tooltip>{{ lessonUpdateTooltip }}</q-tooltip>
        </q-btn>
        <q-btn
          class="sync-status-button"
          :aria-label="syncStatusTooltip"
          flat
          :icon="syncStatusIcon"
          round
        >
          <q-badge v-if="appStore.pendingSyncCount > 0" color="deep-orange-7" floating>
            {{ appStore.pendingSyncCount }}
          </q-badge>
          <q-tooltip>{{ syncStatusTooltip }}</q-tooltip>
        </q-btn>
        <q-btn class="update-log-button" flat icon="notifications" round>
          <q-badge v-if="appStore.unreadUpdateNotificationCount > 0" color="red-7" floating>
            {{ appStore.unreadUpdateNotificationCount }}
          </q-badge>
          <q-tooltip>Update notifications</q-tooltip>
          <q-menu anchor="bottom right" self="top right" class="update-log-menu">
            <div class="update-log">
              <div class="update-log__header">
                <div>
                  <strong>Update log</strong>
                  <span>{{ appStore.unreadUpdateNotificationCount }} unread</span>
                </div>
                <q-btn
                  v-close-popup
                  dense
                  flat
                  icon="done_all"
                  round
                  :disable="appStore.unreadUpdateNotificationCount === 0"
                  @click="markAllRead"
                >
                  <q-tooltip>Mark all as read</q-tooltip>
                </q-btn>
              </div>

              <q-list v-if="appStore.updateNotifications.length > 0" separator>
                <q-item
                  v-for="notification in appStore.updateNotifications"
                  :key="notification.id"
                  class="update-log__item"
                  :class="{ 'update-log__item--unread': notification.readAt === null }"
                >
                  <q-item-section avatar>
                    <q-icon
                      :color="notification.readAt === null ? 'primary' : 'grey-6'"
                      :name="notification.readAt === null ? 'fiber_manual_record' : 'check_circle'"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ notification.title }}</q-item-label>
                    <q-item-label caption>
                      {{ notification.kind === 'lessons' ? 'Offline lessons' : `Version ${notification.version}` }} · {{ formatDate(notification.createdAt) }}
                    </q-item-label>
                    <q-item-label caption>
                      {{ notification.message }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      v-if="notification.readAt === null"
                      dense
                      flat
                      icon="done"
                      round
                      @click="markRead(notification.id)"
                    >
                      <q-tooltip>Mark as read</q-tooltip>
                    </q-btn>
                  </q-item-section>
                </q-item>
              </q-list>

              <div v-else class="update-log__empty">No updates yet.</div>
            </div>
          </q-menu>
        </q-btn>
        <q-btn class="more-nav-button" flat icon="more_vert" round>
          <q-tooltip>More</q-tooltip>
          <q-menu anchor="bottom right" self="top right">
            <q-list class="more-nav-menu" dense>
              <q-item clickable :to="{ name: 'stories' }">
                <q-item-section avatar><q-icon name="auto_stories" /></q-item-section>
                <q-item-section>Stories</q-item-section>
              </q-item>
              <q-item clickable :to="{ name: 'storage' }">
                <q-item-section avatar><q-icon name="storage" /></q-item-section>
                <q-item-section>Storage</q-item-section>
              </q-item>
              <q-item clickable :to="{ name: 'statistics' }">
                <q-item-section avatar>
                  <q-icon name="query_stats" />
                </q-item-section>
                <q-item-section>Statistics</q-item-section>
              </q-item>
              <q-item clickable :to="{ name: 'settings' }">
                <q-item-section avatar>
                  <q-icon name="settings" />
                </q-item-section>
                <q-item-section>Settings</q-item-section>
              </q-item>
              <q-item v-if="showInstallButton" clickable @click="installPwa">
                <q-item-section avatar>
                  <q-icon :name="installButtonIcon" />
                </q-item-section>
                <q-item-section>Install</q-item-section>
              </q-item>
              <q-item v-if="!appStore.authSession" clickable @click="signInWithGoogle">
                <q-item-section avatar>
                  <q-icon name="login" />
                </q-item-section>
                <q-item-section>Sign in with Google</q-item-section>
              </q-item>
              <q-item v-else>
                <q-item-section avatar>
                  <q-icon name="account_circle" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ appStore.studentDisplayName }}</q-item-label>
                  <q-item-label caption>
                    {{ appStore.authSession.user.email }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item v-if="appStore.authSession" clickable @click="signOut">
                <q-item-section avatar>
                  <q-icon name="logout" />
                </q-item-section>
                <q-item-section>Sign out</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable @click="toggleTheme">
                <q-item-section avatar>
                  <q-icon :name="isDarkTheme ? 'light_mode' : 'dark_mode'" />
                </q-item-section>
                <q-item-section>{{ isDarkTheme ? 'Day theme' : 'Night theme' }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-dialog v-model="showInstallHelp">
      <q-card class="ios-install-menu">
        <div class="ios-install">
          <div class="ios-install__icon">
            <img src="/icons/apple-icon-180x180.png" alt="" />
          </div>
          <div class="ios-install__copy">
            <strong>Install Mentor AI</strong>
            <span>{{ installHelpDescription }}</span>
          </div>
          <q-list dense>
            <q-item v-for="step in installHelpSteps" :key="step.text">
              <q-item-section avatar>
                <q-icon :name="step.icon" />
              </q-item-section>
              <q-item-section>{{ step.text }}</q-item-section>
            </q-item>
          </q-list>
          <div v-if="installHelp === 'ios-safari'" class="ios-install__next-action">
            <q-icon name="ios_share" size="28px" />
            <span>
              Closing this guide does not install the app. Next, tap the Safari Share button.
            </span>
          </div>
          <q-btn
            v-close-popup
            color="primary"
            :icon="installHelp === 'ios-safari' ? 'ios_share' : undefined"
            :label="installHelpActionLabel"
            no-caps
          />
        </div>
      </q-card>
    </q-dialog>

    <q-page-container class="app-page-container">
      <router-view v-slot="{ Component, route }">
        <transition :name="routeTransitionName">
          <component :is="Component" :key="route.name ?? route.fullPath" />
        </transition>
      </router-view>
    </q-page-container>

    <nav class="mobile-start-dock" aria-label="Primary navigation">
      <router-link
        v-for="item in primaryNavigationItems"
        :key="item.label"
        class="mobile-start-dock__button"
        :class="{ 'mobile-start-dock__button--active': item.isActive() }"
        :to="item.to"
      >
        <q-icon :name="item.icon" size="24px" />
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <q-dialog v-model="showGoogleSignIn">
      <q-card class="google-sign-in-dialog">
        <q-card-section>
          <div class="text-h6">Sign in to Mentor AI</div>
          <div class="text-body2 text-grey-7 q-mt-sm">
            Continue with your Google account to synchronize your learning progress.
          </div>
        </q-card-section>
        <q-card-section class="google-sign-in-dialog__button">
          <div ref="googleSignInButton" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import type { ConceptLevel, StudentModel } from '@mentor-ai/shared';
import { Dark, Notify } from 'quasar';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  onBeforeRouteUpdate,
  useRoute,
  type RouteLocationNormalizedLoaded,
  type RouteLocationRaw,
} from 'vue-router';
import { useAppStore } from 'src/stores/app-store';
import { fetchAuthConfiguration, signInWithGoogleCredential } from 'src/services/auth';
import { readThemePreference, saveThemePreference } from 'src/services/user-preferences';
import { formatDisplayDate } from 'src/services/date-format';
import { cleanupExpiredOfflineLessons } from 'src/services/offline-library';
import {
  getOfflineLessonUpdateState,
  subscribeOfflineLessonUpdates,
  updateOfflineLessons,
  type OfflineLessonUpdateState,
} from 'src/services/offline-lesson-updates';
import {
  getInstallHelp,
  isStandalonePwa,
  type BeforeInstallPromptEvent,
} from 'src/services/pwa-install';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize(options: {
            client_id: string;
            callback(response: { credential?: string }): void;
          }): void;
          renderButton(
            parent: HTMLElement,
            options: { theme: string; size: string; width: number },
          ): void;
        };
      };
    };
  }
}

const appStore = useAppStore();
const route = useRoute();
const isDarkTheme = ref(false);
const googleClientId = ref<string | null>(null);
const googleSignInButton = ref<HTMLElement | null>(null);
const showGoogleSignIn = ref(false);
const routeTransitionName = ref('route-slide-forward');
const levelTrend = computed(() => createLevelTrend(appStore.studentModel));
const deferredInstallPrompt = ref<BeforeInstallPromptEvent | null>(null);
const isPwaInstalled = ref(false);
const showInstallHelp = ref(false);
const offlineLessonState = ref<OfflineLessonUpdateState>(getOfflineLessonUpdateState());
let unsubscribeOfflineLessonUpdates: (() => void) | undefined;
let offlineLessonUpdateTimer: number | undefined;
const showInstallButton = computed(() => !isPwaInstalled.value);
const installButtonIcon = computed(() =>
  deferredInstallPrompt.value ? 'install_mobile' : 'add_to_home_screen',
);
const installHelp = computed(() => getInstallHelp());
const installHelpDescription = computed(() => {
  if (installHelp.value === 'ios-safari') {
    return 'Three manual Safari actions are required. The website cannot press them for you.';
  }
  if (installHelp.value === 'ios-browser') {
    return 'On iPhone and iPad, open this page in Safari to install it as an app.';
  }
  return 'Use your browser menu to install Mentor AI as an app.';
});
const installHelpActionLabel = computed(() => {
  if (installHelp.value === 'ios-safari') {
    return 'Close, then tap Share';
  }

  return 'Close guide';
});
const installHelpSteps = computed(() => {
  if (installHelp.value === 'ios-safari') {
    return [
      { icon: 'ios_share', text: 'Tap Share in the Safari toolbar.' },
      { icon: 'add_box', text: 'Choose Add to Home Screen.' },
      { icon: 'check_circle', text: 'Tap Add, then open Mentor AI from its new icon.' },
    ];
  }
  if (installHelp.value === 'ios-browser') {
    return [
      { icon: 'more_horiz', text: 'Open this page in Safari.' },
      { icon: 'ios_share', text: 'Tap Share in Safari.' },
      { icon: 'add_box', text: 'Choose Add to Home Screen, then tap Add.' },
    ];
  }
  return [
    { icon: 'more_vert', text: 'Open your browser menu.' },
    { icon: 'install_mobile', text: 'Choose Install app or Add to Home screen.' },
    { icon: 'check_circle', text: 'Confirm the installation.' },
  ];
});
const appUpdateTooltip = computed(() => {
  if (appStore.isAppUpdateInstalling) {
    return 'Saving progress and installing the update.';
  }

  if (appStore.availableAppUpdate) {
    return `Update ${appStore.availableAppUpdate.version} is ready. Click to install.`;
  }

  return 'Mentor AI is up to date.';
});
const lessonUpdateIcon = computed(() => offlineLessonState.value.status === 'error'
  ? 'cloud_off'
  : offlineLessonState.value.status === 'ready' ? 'offline_pin' : 'download_for_offline');
const lessonUpdateTooltip = computed(() => {
  const current = offlineLessonState.value;
  if (current.status === 'checking') return 'Checking the server for current lessons…';
  if (current.status === 'downloading') return `Saving current lessons offline: ${current.completed}/${current.total}.`;
  if (current.status === 'error') return 'Lesson update failed. Tap to try again.';
  if (!appStore.isOnline) return 'Offline. Saved lessons remain available.';
  return 'Current lessons are available offline. Tap to check the server now.';
});
const syncStatusIcon = computed(() => {
  if (appStore.pendingSyncCount > 0) {
    return appStore.isOnline ? 'cloud_upload' : 'cloud_off';
  }

  return appStore.isSyncRefreshing ? 'sync' : 'cloud_done';
});
const syncStatusTooltip = computed(() => {
  if (appStore.pendingSyncCount > 0 && !appStore.isOnline) {
    return `${appStore.pendingSyncCount} learning updates are saved on this device and need internet.`;
  }

  if (appStore.pendingSyncCount > 0) {
    return `${appStore.pendingSyncCount} learning updates are waiting to upload.`;
  }

  if (appStore.isSyncRefreshing) {
    return 'Checking progress from your other devices.';
  }

  return 'Learning progress is synchronized.';
});
const primaryNavigationItems: Array<{
  label: string;
  icon: string;
  to: RouteLocationRaw;
  isActive: () => boolean;
}> = [
  {
    label: 'Home',
    icon: 'home',
    to: { name: 'dashboard' },
    isActive: () => route.name === 'dashboard' && route.query.training === undefined,
  },
  {
    label: 'Listen',
    icon: 'headphones',
    to: { name: 'dashboard', query: { training: 'listening' } },
    isActive: () => route.name === 'dashboard' && route.query.training === 'listening',
  },
  {
    label: 'Speak',
    icon: 'record_voice_over',
    to: { name: 'dashboard', query: { training: 'speaking' } },
    isActive: () => route.name === 'dashboard' && route.query.training === 'speaking',
  },
  {
    label: 'Patterns',
    icon: 'view_agenda',
    to: { name: 'patterns' },
    isActive: () => route.name === 'patterns',
  },
  {
    label: 'Audio',
    icon: 'podcasts',
    to: { name: 'audio' },
    isActive: () => route.name === 'audio',
  },
  {
    label: 'Stories',
    icon: 'auto_stories',
    to: { name: 'stories' },
    isActive: () => route.name === 'stories',
  },
];

onMounted(async () => {
  await cleanupExpiredOfflineLessons();
  unsubscribeOfflineLessonUpdates = subscribeOfflineLessonUpdates((nextState) => { offlineLessonState.value = nextState; });
  isPwaInstalled.value = isStandalonePwa();
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);
  window.addEventListener('online', handleOfflineLessonReconnect);
  document.addEventListener('visibilitychange', handleOfflineLessonVisibility);
  offlineLessonUpdateTimer = window.setInterval(() => { if (navigator.onLine) void checkOfflineLessons(false); }, 60 * 60 * 1000);
  isDarkTheme.value = readSavedTheme();
  Dark.set(isDarkTheme.value);
  await loadAuthConfiguration();

  if (!appStore.isHydrated) {
    await appStore.hydrate();
  }
  if (appStore.isOnline) void checkOfflineLessons(false);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.removeEventListener('appinstalled', handleAppInstalled);
  window.removeEventListener('online', handleOfflineLessonReconnect);
  document.removeEventListener('visibilitychange', handleOfflineLessonVisibility);
  if (offlineLessonUpdateTimer) window.clearInterval(offlineLessonUpdateTimer);
  unsubscribeOfflineLessonUpdates?.();
});

async function checkOfflineLessons(showResult: boolean) {
  try {
    const result = await updateOfflineLessons(appStore.loadLesson.bind(appStore));
    if (result.downloaded > 0) {
      await appStore.recordLessonUpdateNotification(
        result.downloadedLessons,
        result.downloadedStories,
        result.downloadedAudio,
        result.eventId,
      );
    }
    if (!showResult) return;
    Notify.create({
      type: 'positive',
      icon: 'offline_pin',
      message: result.current
        ? 'Everything is downloaded and available offline'
        : `${result.downloaded} offline item${result.downloaded === 1 ? '' : 's'} downloaded`,
    });
  } catch {
    if (!showResult) return;
    Notify.create({ type: 'negative', icon: 'cloud_off', message: 'Could not update offline lessons', caption: 'Check the connection and try again.' });
  }
}

onBeforeRouteUpdate((to, from) => {
  routeTransitionName.value =
    getRouteOrder(to) < getRouteOrder(from) ? 'route-slide-back' : 'route-slide-forward';
});

function formatDate(value: string) {
  return formatDisplayDate(value);
}

function getRouteOrder(route: RouteLocationNormalizedLoaded) {
  const order = route.meta.routeOrder;

  return typeof order === 'number' ? order : 0;
}

function markRead(id: string) {
  void appStore.markUpdateNotificationRead(id);
}

function markAllRead() {
  void appStore.markAllUpdateNotificationsRead();
}

function installAvailableUpdate() {
  if (!navigator.onLine) {
    Notify.create({ type: 'warning', icon: 'wifi_off', message: 'Internet is required to check for an app update' });
    return;
  }
  window.dispatchEvent(new CustomEvent(appStore.availableAppUpdate ? 'mentor-ai:install-update' : 'mentor-ai:check-update'));
}

function handleOfflineLessonReconnect() { void checkOfflineLessons(false); }
function handleOfflineLessonVisibility() {
  if (document.visibilityState === 'visible' && navigator.onLine) void checkOfflineLessons(false);
}

function handleBeforeInstallPrompt(event: Event) {
  event.preventDefault();
  deferredInstallPrompt.value = event as BeforeInstallPromptEvent;
}

function handleAppInstalled() {
  deferredInstallPrompt.value = null;
  isPwaInstalled.value = true;
  showInstallHelp.value = false;
  Notify.create({ type: 'positive', icon: 'check_circle', message: 'Mentor AI installed' });
}

async function installPwa() {
  const prompt = deferredInstallPrompt.value;
  if (!prompt) {
    showInstallHelp.value = true;
    return;
  }

  await prompt.prompt();
  const choice = await prompt.userChoice;
  deferredInstallPrompt.value = null;
  if (choice.outcome === 'dismissed') {
    Notify.create({
      message: 'Installation cancelled',
      caption: 'You can install Mentor AI later.',
      timeout: 3500,
    });
  }
}

function toggleTheme() {
  isDarkTheme.value = !isDarkTheme.value;
  Dark.set(isDarkTheme.value);
  saveThemePreference(isDarkTheme.value ? 'dark' : 'light');
}

async function loadAuthConfiguration() {
  try {
    const configuration = await fetchAuthConfiguration();
    googleClientId.value = configuration.googleClientId;
  } catch {
    googleClientId.value = null;
  }
}

async function signInWithGoogle() {
  if (!googleClientId.value) {
    Notify.create({
      type: 'warning',
      icon: 'login',
      message: 'Google sign-in is not configured yet',
      caption: 'Set GOOGLE_CLIENT_ID and GOOGLE_ALLOWED_EMAILS on the backend.',
      timeout: 7000,
    });
    return;
  }

  showGoogleSignIn.value = true;

  try {
    await loadGoogleIdentityScript();
    await nextTick();

    const googleIdentity = window.google?.accounts?.id;
    const button = googleSignInButton.value;
    if (!googleIdentity || !button) {
      throw new Error('Google Sign-In is unavailable.');
    }

    googleIdentity.initialize({
      client_id: googleClientId.value,
      callback: (response) => {
        if (!response.credential) return;

        void completeGoogleSignIn(response.credential);
      },
    });
    button.replaceChildren();
    googleIdentity.renderButton(button, {
      theme: isDarkTheme.value ? 'filled_black' : 'outline',
      size: 'large',
      width: 280,
    });
  } catch {
    showGoogleSignIn.value = false;
    Notify.create({
      type: 'negative',
      icon: 'error',
      message: 'Could not open Google sign-in',
      caption: 'Check your internet connection and try again.',
    });
  }
}

async function completeGoogleSignIn(credential: string) {
  try {
    const session = await signInWithGoogleCredential(credential);
    await appStore.signIn(session);
    showGoogleSignIn.value = false;
  } catch {
    Notify.create({
      type: 'negative',
      icon: 'error',
      message: 'Google sign-in failed',
      caption: 'Make sure this Google account is allowed and try again.',
    });
  }
}

function signOut() {
  void appStore.signOut();
}

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Identity Services failed to load.'));
    document.head.appendChild(script);
  });
}

function readSavedTheme() {
  const savedTheme = readThemePreference();

  if (savedTheme === 'dark') {
    return true;
  }

  if (savedTheme === 'light') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function createLevelTrend(studentModel: StudentModel) {
  const learningState = studentModel.conceptLevels.learning;
  const practicedAt = learningState.lastPracticedAt ?? studentModel.teacherDecision.createdAt;
  const daysInProcess = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(practicedAt)) / 86_400_000),
  );

  return {
    level: conceptLevelToCefr(learningState.level),
    daysLabel: `${daysInProcess}d`,
    tooltip: `${studentModel.teacherDecision.reason} Days in this level process: ${daysInProcess}.`,
  };
}

function conceptLevelToCefr(level: ConceptLevel): string {
  switch (level) {
    case 'foundation':
      return 'A1';
    case 'developing':
      return 'A2';
    case 'confident':
      return 'B1';
  }
}
</script>
