<template>
  <q-btn
    :aria-label="`Playback speed: ${modelValue} times`"
    class="audio-playback-speed-menu"
    color="primary"
    flat
    icon="speed"
    round
    :disable="disabled"
  >
    <q-tooltip>Playback speed · {{ modelValue }}×</q-tooltip>
    <q-menu
      anchor="top middle"
      self="bottom middle"
    >
      <q-list
        class="audio-playback-speed-menu__list"
        dense
      >
        <q-item
          v-for="rate in audioPlaybackRates"
          :key="rate"
          v-close-popup
          clickable
          :active="modelValue === rate"
          active-class="audio-playback-speed-menu__option--active"
          @click="$emit('update:model-value', rate)"
        >
          <q-item-section>{{ rate }}×</q-item-section>
          <q-item-section
            v-if="modelValue === rate"
            avatar
          >
            <q-icon
              color="primary"
              name="check"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
import { audioPlaybackRates, type AudioPlaybackRate } from 'src/services/audio-playback-speed';

withDefaults(defineProps<{
  disabled?: boolean;
  modelValue: number;
}>(), {
  disabled: false,
});

defineEmits<{
  'update:model-value': [value: AudioPlaybackRate];
}>();
</script>
