<template>
  <q-list
    v-if="optionsOnly"
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
      @click="selectRate(rate)"
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
  <q-btn
    v-else
    :aria-label="`Playback speed: ${modelValue} times`"
    class="audio-playback-speed-menu"
    color="primary"
    flat
    icon="speed"
    :label="`${modelValue}×`"
    no-caps
    rounded
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
          @click="selectRate(rate)"
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
import { watch } from 'vue';
import { audioPlaybackRates, type AudioPlaybackRate, readAudioPlaybackRate, saveAudioPlaybackRate } from 'src/services/audio-playback-speed';

const props = withDefaults(defineProps<{
  disabled?: boolean;
  modelValue: number;
  optionsOnly?: boolean;
  persistenceKey?: string | null;
}>(), {
  disabled: false,
  optionsOnly: false,
  persistenceKey: null,
});

const emit = defineEmits<{
  'update:model-value': [value: AudioPlaybackRate];
}>();

watch(() => props.persistenceKey, (persistenceKey) => {
  if (persistenceKey) emit('update:model-value', readAudioPlaybackRate(persistenceKey));
}, { immediate: true });

function selectRate(rate: AudioPlaybackRate) {
  if (props.persistenceKey) saveAudioPlaybackRate(props.persistenceKey, rate);
  emit('update:model-value', rate);
}
</script>
