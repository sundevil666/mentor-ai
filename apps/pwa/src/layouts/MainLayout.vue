<template>
  <q-layout view="hHh lpR fFf">
    <q-header
      bordered
      class="app-header"
    >
      <q-toolbar>
        <q-btn
          v-if="appStore.session"
          class="home-nav-button"
          flat
          icon="home"
          round
          @click="returnToLessonChoice"
        >
          <q-tooltip>Back to lesson choice</q-tooltip>
        </q-btn>
        <q-toolbar-title>Mentor AI</q-toolbar-title>
        <q-btn
          class="sync-status-button"
          dense
          flat
          :icon="syncStatusIcon"
          round
        >
          <q-badge
            v-if="appStore.pendingSyncCount > 0"
            color="deep-orange-7"
            floating
          >
            {{ appStore.pendingSyncCount }}
          </q-badge>
          <q-tooltip>{{ syncStatusTooltip }}</q-tooltip>
        </q-btn>
        <q-tabs
          class="main-nav-tabs"
          dense
          inline-label
          shrink
        >
          <q-route-tab
            icon="school"
            label="Lessons"
            no-caps
            :to="{ name: 'dashboard' }"
          />
          <q-route-tab
            icon="query_stats"
            label="Statistics"
            no-caps
            :to="{ name: 'statistics' }"
          />
        </q-tabs>
        <q-btn
          class="settings-nav-button"
          dense
          flat
          icon="settings"
          label="Settings"
          no-caps
          :to="{ name: 'settings' }"
        >
          <q-tooltip>Settings</q-tooltip>
        </q-btn>
        <q-btn
          class="theme-toggle-button"
          flat
          :icon="isDarkTheme ? 'light_mode' : 'dark_mode'"
          round
          @click="toggleTheme"
        >
          <q-tooltip>{{ isDarkTheme ? 'Day theme' : 'Night theme' }}</q-tooltip>
        </q-btn>
        <q-btn
          v-if="showInstallButton"
          class="ios-install-button"
          color="primary"
          dense
          flat
          icon="ios_share"
          label="Install"
          no-caps
        >
          <q-tooltip>Install on iPhone</q-tooltip>
          <q-menu
            anchor="bottom right"
            self="top right"
            class="ios-install-menu"
          >
            <div class="ios-install">
              <div class="ios-install__icon">
                <img
                  src="/icons/apple-icon-180x180.png"
                  alt=""
                >
              </div>
              <div class="ios-install__copy">
                <strong>Install Mentor AI</strong>
                <span>On iPhone, open Share and choose Add to Home Screen.</span>
              </div>
              <q-list dense>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="ios_share" />
                  </q-item-section>
                  <q-item-section>Tap Share in Safari.</q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="add_box" />
                  </q-item-section>
                  <q-item-section>Choose Add to Home Screen.</q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="check_circle" />
                  </q-item-section>
                  <q-item-section>Open Mentor AI from the new icon.</q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-menu>
        </q-btn>
        <q-btn
          class="update-log-button"
          flat
          icon="notifications"
          round
        >
          <q-badge
            v-if="appStore.unreadUpdateNotificationCount > 0"
            color="red-7"
            floating
          >
            {{ appStore.unreadUpdateNotificationCount }}
          </q-badge>
          <q-tooltip>Update notifications</q-tooltip>
          <q-menu
            anchor="bottom right"
            self="top right"
            class="update-log-menu"
          >
            <div class="update-log">
              <div class="update-log__header">
                <div>
                  <strong>Update log</strong>
                  <span>{{ appStore.unreadUpdateNotificationCount }} unread</span>
                </div>
                <q-btn
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

              <q-list
                v-if="appStore.updateNotifications.length > 0"
                separator
              >
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
                      Version {{ notification.version }} · {{ formatDate(notification.createdAt) }}
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

              <div
                v-else
                class="update-log__empty"
              >
                No updates yet.
              </div>
            </div>
          </q-menu>
        </q-btn>
        <q-badge
          class="header-offline-badge"
          color="teal-8"
          outline
        >
          Offline first
        </q-badge>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { Dark } from 'quasar';
import { computed, onMounted, ref } from 'vue';
import { useAppStore } from 'src/stores/app-store';
import { readThemePreference, saveThemePreference } from 'src/services/user-preferences';

const appStore = useAppStore();
const isDarkTheme = ref(false);
const showInstallButton = computed(() => isAppleTouchDevice() && !isStandalonePwa());
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

onMounted(async () => {
  isDarkTheme.value = readSavedTheme();
  Dark.set(isDarkTheme.value);

  if (!appStore.isHydrated) {
    await appStore.hydrate();
  }
});

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function markRead(id: string) {
  void appStore.markUpdateNotificationRead(id);
}

function markAllRead() {
  void appStore.markAllUpdateNotificationsRead();
}

function returnToLessonChoice() {
  void appStore.returnToLessonChoice();
}

function toggleTheme() {
  isDarkTheme.value = !isDarkTheme.value;
  Dark.set(isDarkTheme.value);
  saveThemePreference(isDarkTheme.value ? 'dark' : 'light');
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

function isAppleTouchDevice() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalonePwa() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}
</script>
