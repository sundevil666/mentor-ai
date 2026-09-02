<template>
  <section
    class="app-audio-dock"
    aria-label="Audio controls"
  >
    <div class="app-audio-dock__buttons">
      <q-btn
        aria-label="Rewind 10 seconds"
        color="primary"
        flat
        icon="replay_10"
        round
        :disable="disabled"
        @click="$emit('seek', Math.max(0, currentTime - 10))"
      />
      <q-btn
        :aria-label="playing ? 'Pause audio' : 'Play audio'"
        class="app-audio-dock__play"
        color="primary"
        :icon="playing ? 'pause' : 'play_arrow'"
        round
        unelevated
        :disable="disabled"
        @click="$emit('toggle-playback')"
      />
      <q-btn
        aria-label="Forward 10 seconds"
        color="primary"
        flat
        icon="forward_10"
        round
        :disable="disabled"
        @click="$emit('seek', Math.min(effectiveDuration, currentTime + 10))"
      />
      <q-btn
        v-if="showRepeat"
        :aria-label="repeat ? 'Repeat is on' : 'Repeat is off'"
        :color="repeat ? 'secondary' : 'primary'"
        :flat="!repeat"
        icon="repeat"
        round
        :unelevated="repeat"
        @click="$emit('update:repeat', !repeat)"
      />
    </div>
    <div
      v-if="playbackRates.length"
      class="app-audio-dock__rates"
      aria-label="Playback speed"
    >
      <q-btn
        v-for="rate in playbackRates"
        :key="rate"
        :aria-label="`${rate} times speed`"
        :color="playbackRate === rate ? 'primary' : undefined"
        dense
        :label="`${rate}×`"
        no-caps
        :outline="playbackRate !== rate"
        @click="$emit('update:playback-rate', rate)"
      />
    </div>
    <div class="app-audio-dock__progress">
      <span>{{ formatTime(currentTime) }}</span>
      <q-slider
        :aria-label="progressLabel"
        color="primary"
        :disable="disabled || effectiveDuration <= 0"
        :max="effectiveDuration"
        :min="0"
        :model-value="Math.min(currentTime, effectiveDuration)"
        :step="1"
        @update:model-value="$emit('seek', $event)"
      />
      <span>{{ formatTime(effectiveDuration) }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  currentTime: number;
  disabled?: boolean;
  duration: number;
  fallbackDuration?: number;
  playbackRate?: number;
  playbackRates?: number[];
  playing: boolean;
  progressLabel?: string;
  repeat?: boolean;
  showRepeat?: boolean;
}>(), {
  disabled: false,
  fallbackDuration: 0,
  playbackRate: 1,
  playbackRates: () => [],
  progressLabel: 'Audio progress',
  repeat: false,
  showRepeat: false,
});

defineEmits<{
  seek: [value: number | null];
  'toggle-playback': [];
  'update:playback-rate': [value: number];
  'update:repeat': [value: boolean];
}>();

const effectiveDuration = computed(() => props.duration > 0 ? props.duration : props.fallbackDuration);

function formatTime(value: number) {
  const safeValue = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
</script>
