<template>
  <q-page class="settings-page">
    <section class="settings-shell">
      <div class="settings-header">
        <q-btn
          color="primary"
          flat
          icon="arrow_back"
          round
          :to="{ name: 'dashboard' }"
        >
          <q-tooltip>Back to learning</q-tooltip>
        </q-btn>
        <div>
          <p>Settings</p>
          <h1>Voice</h1>
        </div>
      </div>

      <section class="settings-section">
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
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  getAvailableSpeechVoices,
  getFemaleSpeechVoiceOptions,
  speakWithPreferredVoice,
  type SpeechVoiceOption,
} from 'src/services/speech-synthesis';
import { readSpeechVoicePreference, saveSpeechVoicePreference } from 'src/services/user-preferences';

const selectedVoiceURI = ref<string | null>(readSpeechVoicePreference());
const voiceOptions = ref<SpeechVoiceOption[]>([]);
const voiceStatus = computed(() => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return 'Speech synthesis is not available in this browser.';
  }

  if (voiceOptions.value.length === 0) {
    return 'No browser voices loaded yet.';
  }

  return `${voiceOptions.value.length} voice${voiceOptions.value.length === 1 ? '' : 's'} available.`;
});

onMounted(() => {
  refreshVoices();

  if ('speechSynthesis' in window) {
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
  }
});

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

function testVoice() {
  speakWithPreferredVoice('This is the voice for listening practice.');
}
</script>
