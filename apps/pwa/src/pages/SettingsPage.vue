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
          v-model="selectedShift"
          :options="shiftOptions"
          emit-value
          map-options
          label="Current shift"
          outlined
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
        <q-select
          v-model="selectedVoiceURI"
          :options="voiceOptions"
          emit-value
          map-options
          option-label="label"
          option-value="value"
          label="Listening voice"
          outlined
          :disable="voiceOptions.length === 0"
          @update:model-value="saveVoice"
        >
          <template #option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section avatar>
                <q-icon name="record_voice_over" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ scope.opt.label }}</q-item-label>
                <q-item-label caption>
                  {{ scope.opt.description }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <div class="voice-actions">
          <q-btn
            color="primary"
            icon="play_arrow"
            label="Test"
            no-caps
            unelevated
            :disable="!selectedVoiceURI"
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
  getAvailableSpeechVoices,
  getFemaleSpeechVoiceOptions,
  speakWithPreferredVoice,
  waitForSpeechVoices,
  type SpeechVoiceOption,
} from 'src/services/speech-synthesis';
import {
  createCurrentActivitySuggestion,
  createShiftTimingRows,
  formatActivityMeta,
  formatPaceLabel,
} from 'src/services/learning-context';
import { clearLastRoutePreference, readSpeechVoicePreference, saveSpeechVoicePreference } from 'src/services/user-preferences';
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
const selectedVoiceURI = ref<string | null>(readSpeechVoicePreference());
const myShiftConfigured = isMyShiftConfigured();
const myShiftConnected = ref(isMyShiftConnected());
const myShiftBusy = ref(false);
const myShiftMessage = ref('');
const voiceOptions = ref<SpeechVoiceOption[]>([]);
const shiftOptions: Array<{ label: string; value: WorkShift }> = [
  { label: 'Unknown', value: 'unknown' },
  { label: 'First shift', value: 'first' },
  { label: 'Second shift', value: 'second' },
  { label: 'Third shift', value: 'third' },
  { label: 'Day off', value: 'off' },
];
const voiceStatus = computed(() => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return 'Speech synthesis is not available in this browser.';
  }

  if (voiceOptions.value.length === 0) {
    return 'No browser voices loaded yet.';
  }

  return `${voiceOptions.value.length} voice${voiceOptions.value.length === 1 ? '' : 's'} available.`;
});
const currentSuggestion = computed(() =>
  createCurrentActivitySuggestion(appStore.preferredWorkShift, appStore.activitySnapshots, new Date(), appStore.myShiftActivity),
);
const myShiftStatus = computed(() => {
  if (myShiftMessage.value) return myShiftMessage.value;
  if (!myShiftConfigured) return 'Client ID must be configured before connecting.';
  if (appStore.myShiftSyncError) return appStore.myShiftSyncError;
  return myShiftConnected.value ? 'Connected. Your schedule guides lesson timing.' : 'Use your My Shift account to share activity.';
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
  await waitForSpeechVoices();
  refreshVoices();

  if ('speechSynthesis' in window) {
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
  }
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
    myShiftMessage.value = appStore.myShiftSyncError ?? 'Schedule synchronized.';
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
  if ('speechSynthesis' in window) {
    window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices);
  }
});

function refreshVoices() {
  voiceOptions.value = getFemaleSpeechVoiceOptions();

  if (!selectedVoiceURI.value || !getAvailableSpeechVoices().some((voice) => voice.voiceURI === selectedVoiceURI.value)) {
    selectedVoiceURI.value = voiceOptions.value[0]?.value ?? null;
  }

  if (selectedVoiceURI.value) {
    saveSpeechVoicePreference(selectedVoiceURI.value);
  }
}

function saveVoice(value: string) {
  saveSpeechVoicePreference(value);
}

function saveShift(value: WorkShift) {
  appStore.setPreferredWorkShift(value);
}

function testVoice() {
  speakWithPreferredVoice('This is the voice for listening practice.');
}

function returnToDashboard() {
  clearLastRoutePreference();
  void router.replace({ name: 'dashboard' });
}
</script>
