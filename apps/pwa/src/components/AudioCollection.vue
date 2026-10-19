<template>
  <details
    v-if="collectionId"
    class="audio-collection"
    :open="expanded"
    @toggle="saveExpanded"
  >
    <summary class="audio-collection__heading">
      <q-icon
        name="library_books"
        class="audio-collection__icon"
      />
      <span class="audio-collection__title">
        <strong>{{ title }}</strong>
        <small>{{ trackCount }} audio tracks · {{ expanded ? 'Hide tracks' : 'Show tracks' }}</small>
      </span>
      <q-icon
        name="expand_more"
        class="audio-collection__arrow"
      />
    </summary>
    <div class="audio-collection__tracks">
      <slot />
    </div>
  </details>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ collectionId?: string; title: string; trackCount: number }>();
const preferenceKey = `mentor-ai:audio-collection-expanded:v1:${props.collectionId ?? ''}`;
function readExpanded() {
  try { return localStorage.getItem(preferenceKey) === 'true'; } catch { return false; }
}
const expanded = ref(readExpanded());
function saveExpanded(event: Event) {
  expanded.value = (event.target as HTMLDetailsElement).open;
  try { localStorage.setItem(preferenceKey, String(expanded.value)); } catch { /* Keep the control usable when storage is unavailable. */ }
}
</script>

<style scoped>
.audio-collection {
  min-width: 0;
  grid-column: 1 / -1;
  border: 2px solid color-mix(in srgb, var(--q-primary) 38%, transparent);
  border-radius: 20px;
  background: color-mix(in srgb, var(--q-primary) 7%, var(--app-surface, #fff));
  overflow: hidden;
}
.audio-collection__heading {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  cursor: pointer;
  list-style: none;
}
.audio-collection__heading::-webkit-details-marker { display: none; }
.audio-collection__heading:focus-visible { outline: 3px solid var(--q-primary); outline-offset: -4px; }
.audio-collection__icon { font-size: 32px; color: var(--q-primary); }
.audio-collection__title { display: grid; gap: 5px; min-width: 0; flex: 1; }
.audio-collection__title strong { font-size: 20px; overflow-wrap: anywhere; }
.audio-collection__title small { opacity: .75; }
.audio-collection__arrow { font-size: 28px; color: var(--q-primary); transition: transform .2s; }
.audio-collection[open] .audio-collection__arrow { transform: rotate(180deg); }
.audio-collection__tracks { display: grid; gap: 12px; padding: 0 12px 12px; }
</style>
