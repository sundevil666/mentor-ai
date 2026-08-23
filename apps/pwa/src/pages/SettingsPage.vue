<template>
  <q-page class="settings-page">
    <section class="settings-shell">
      <div class="settings-header">
        <q-btn
          color="primary"
          flat
          icon="arrow_back"
          round
          @click="returnToDashboard"
        >
          <q-tooltip>Back to learning</q-tooltip>
        </q-btn>
        <div>
          <p>Settings</p>
          <h1>Preferences</h1>
        </div>
      </div>

      <section class="settings-section">
        <div class="settings-section__heading">
          <q-icon name="info" />
          <span>Versions</span>
        </div>
        <div class="version-grid">
          <div>
            <span>Application</span>
            <strong>{{ appVersion }}</strong>
          </div>
          <div>
            <span>Lessons</span>
            <strong>{{ lessonVersion }}</strong>
          </div>
          <div>
            <span>Available lessons</span>
            <strong>{{ lessonCount }}</strong>
          </div>
        </div>
        <p class="version-note">
          Updates are checked and installed automatically.
        </p>
      </section>

      <section class="settings-section">
        <div class="settings-section__heading">
          <q-icon name="schedule" />
          <span>Learning context</span>
        </div>
        <div class="voice-actions">
          <q-btn
            color="primary"
            :icon="myShiftConnected ? 'sync' : 'link'"
            :label="myShiftConnected ? 'Sync My Shift' : 'Connect My Shift'"
            no-caps
            unelevated
            :disable="!myShiftConfigured || myShiftBusy"
            :loading="myShiftBusy"
            @click="handleMyShiftAction"
          />
          <span>{{ myShiftStatus }}</span>
        </div>
        <q-select
          :model-value="displayedShift"
          :options="shiftOptions"
          emit-value
          map-options
          :label="myShiftConnected ? 'Shift synchronized from My Shift' : 'Current shift (manual)'"
          outlined
          :disable="myShiftConnected"
          :hint="myShiftConnected ? 'Managed by My Shift while synchronization is connected.' : 'Used only when My Shift synchronization is off.'"
          persistent-hint
          @update:model-value="saveShift"
        />
      </section>

      <section class="settings-section">
        <div class="settings-section__heading">
          <q-icon name="query_stats" />
          <span>Shift analytics</span>
        </div>
        <div class="activity-signal">
          <span>{{ activityMeta }}</span>
          <strong>{{ paceLabel }}</strong>
        </div>
        <div
          v-if="shiftTimingRows.length > 0"
          class="shift-timing-grid shift-timing-grid--settings"
        >
          <div
            v-for="item in shiftTimingRows"
            :key="item.label"
            class="shift-timing-item"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <div class="settings-section__heading">
          <q-icon name="record_voice_over" />
          <span>Voice</span>
        </div>
        <div class="activity-signal">
          <span>Ava Multilingual Neural · American English</span>
          <strong>Same voice on every device</strong>
        </div>

        <div class="voice-actions">
          <q-btn
            color="primary"
            icon="play_arrow"
            label="Test"
            no-caps
            unelevated
            :disable="!speechAvailable || voiceBusy"
            :loading="voiceBusy"
            @click="testVoice"
          />
          <span>{{ voiceStatus }}</span>
        </div>
      </section>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import type { WorkShift } from '@mentor-ai/shared';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  getSpeechModelStatus,
  isSpeechSynthesisAvailable,
  preloadSpeech,
  speakWithPreferredVoice,
  subscribeToSpeechModelStatus,
} from 'src/services/speech-synthesis';
import {
  createCurrentActivitySuggestion,
  createShiftTimingRows,
  formatActivityMeta,
  formatPaceLabel,
  getSynchronizedWorkShift,
} from 'src/services/learning-context';
import { clearLastRoutePreference } from 'src/services/user-preferences';
import { useAppStore } from 'src/stores/app-store';
import { fetchAppConfiguration } from 'src/services/api-client';
import { formatDisplayDate } from 'src/services/date-format';
import {
  beginMyShiftConnection,
  completeMyShiftConnection,
  isMyShiftConfigured,
  isMyShiftConnected,
} from 'src/services/my-shift';

const appStore = useAppStore();
const appVersion = process.env.APP_VERSION ?? 'development';
const lessonVersion = ref('Checking…');
const lessonCount = ref('—');
const router = useRouter();
const selectedShift = ref<WorkShift>('unknown');
const myShiftConfigured = isMyShiftConfigured();
const myShiftConnected = ref(isMyShiftConnected());
const myShiftBusy = ref(false);
const myShiftMessage = ref('');
const speechAvailable = isSpeechSynthesisAvailable();
const voiceState = ref(getSpeechModelStatus());
const unsubscribeVoiceStatus = subscribeToSpeechModelStatus(() => {
  voiceState.value = getSpeechModelStatus();
});
const voiceTestText = 'This is the voice for listening practice.';
const shiftOptions: Array<{ label: string; value: WorkShift }> = [
  { label: 'Unknown', value: 'unknown' },
  { label: 'First shift', value: 'first' },
  { label: 'Second shift', value: 'second' },
  { label: 'Third shift', value: 'third' },
  { label: 'Day off', value: 'off' },
];
const voiceBusy = computed(() =>
  ['loading', 'generating'].includes(voiceState.value.status),
);
const voiceStatus = computed(() => {
  if (!speechAvailable) {
    return 'Neural speech is not available in this browser.';
  }

  if (voiceState.value.status === 'loading') {
    return 'Connecting to the voice service…';
  }

  if (voiceState.value.status === 'generating') {
    return 'Preparing audio…';
  }

  if (voiceState.value.status === 'playing') {
    return 'Playing now.';
  }

  if (voiceState.value.status === 'ready') {
    return 'Ready. The model is cached for future lessons.';
  }

  if (voiceState.value.status === 'error') {
    return 'The model could not load. Check the connection and try again.';
  }

  return 'Fast neural voice. Generated audio is cached on this device.';
});
const currentSuggestion = computed(() =>
  createCurrentActivitySuggestion(appStore.preferredWorkShift, appStore.activitySnapshots, new Date(), appStore.myShiftActivity),
);
const synchronizedShift = computed(() => getSynchronizedWorkShift(appStore.myShiftActivity));
const displayedShift = computed(() => myShiftConnected.value
  ? synchronizedShift.value ?? 'unknown'
  : selectedShift.value);
const myShiftStatus = computed(() => {
  if (myShiftMessage.value) return myShiftMessage.value;
  if (!myShiftConfigured) return 'Client ID must be configured before connecting.';
  if (appStore.myShiftSyncError) return appStore.myShiftSyncError;
  if (!myShiftConnected.value) return 'Use your My Shift account to share activity.';
  const synchronized = appStore.myShiftLastSyncAt
    ? ` Last synchronized ${formatDisplayDate(appStore.myShiftLastSyncAt)}.`
    : '';
  return `Connected. Synced shift: ${shiftLabel(synchronizedShift.value)}.${synchronized}`;
});
const activityMeta = computed(() => formatActivityMeta(currentSuggestion.value));
const paceLabel = computed(() => formatPaceLabel(currentSuggestion.value));
const shiftTimingRows = computed(() => createShiftTimingRows(currentSuggestion.value));

onMounted(async () => {
  await finishMyShiftCallback();
  if (!appStore.isHydrated) {
    await appStore.hydrate();
  }

  selectedShift.value = appStore.preferredWorkShift;
  await loadVersions();
  void preloadSpeech(voiceTestText);
});

async function finishMyShiftCallback() {
  const code = typeof router.currentRoute.value.query.code === 'string' ? router.currentRoute.value.query.code : null;
  const state = typeof router.currentRoute.value.query.state === 'string' ? router.currentRoute.value.query.state : null;
  if (!code || !state) return;

  myShiftBusy.value = true;
  try {
    await completeMyShiftConnection(code, state);
    myShiftConnected.value = true;
    myShiftMessage.value = 'Connected successfully.';
    await router.replace({ name: 'settings' });
    await appStore.refreshMyShiftActivity();
  } catch (error) {
    myShiftMessage.value = error instanceof Error ? error.message : 'Connection failed.';
  } finally {
    myShiftBusy.value = false;
  }
}

async function handleMyShiftAction() {
  myShiftBusy.value = true;
  try {
    if (!myShiftConnected.value) {
      await beginMyShiftConnection();
      return;
    }
    await appStore.refreshMyShiftActivity();
    myShiftMessage.value = appStore.myShiftSyncError
      ?? `Schedule synchronized. Current shift: ${shiftLabel(synchronizedShift.value)}.`;
  } catch (error) {
    myShiftMessage.value = error instanceof Error ? error.message : 'My Shift request failed.';
  } finally {
    myShiftBusy.value = false;
  }
}

async function loadVersions() {
  try {
    const configuration = await fetchAppConfiguration();
    lessonVersion.value = configuration.lessonLibrary.updatedAt
      ? formatDisplayDate(configuration.lessonLibrary.updatedAt)
      : configuration.lessonLibrary.version;
    lessonCount.value = String(configuration.lessonLibrary.lessonCount);
  } catch {
    lessonVersion.value = 'Unavailable offline';
  }
}

onUnmounted(() => {
  unsubscribeVoiceStatus();
});

function saveShift(value: WorkShift) {
  if (myShiftConnected.value) return;
  appStore.setPreferredWorkShift(value);
}

function shiftLabel(shift: WorkShift | null) {
  return shiftOptions.find((option) => option.value === shift)?.label ?? 'Unknown';
}

function testVoice() {
  void speakWithPreferredVoice(voiceTestText);
}

function returnToDashboard() {
  clearLastRoutePreference();
  void router.replace({ name: 'dashboard' });
}
</script>
