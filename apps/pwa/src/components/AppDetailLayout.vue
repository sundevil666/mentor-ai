<template>
  <section
    class="app-detail-layout"
    :class="{
      'app-detail-layout--active': active,
      'app-detail-layout--with-controls': active && Boolean($slots.controls),
    }"
  >
    <div class="app-detail-layout__header">
      <slot name="header" />
    </div>

    <div class="app-detail-layout__content">
      <slot />
    </div>

    <div
      v-if="$slots.controls"
      class="app-detail-layout__controls"
    >
      <slot name="controls" />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  active?: boolean;
}>(), {
  active: true,
});
</script>

<style scoped>
.app-detail-layout--active {
  display: grid;
  gap: 12px;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.app-detail-layout:not(.app-detail-layout--active) > .app-detail-layout__header,
.app-detail-layout:not(.app-detail-layout--active) > .app-detail-layout__content,
.app-detail-layout:not(.app-detail-layout--active) > .app-detail-layout__controls {
  display: contents;
}

.app-detail-layout--active > .app-detail-layout__header {
  min-height: 0;
  position: relative;
  z-index: 5;
}

.app-detail-layout--active > .app-detail-layout__header :deep(> :first-child) {
  margin-bottom: 0;
}

.app-detail-layout--active > .app-detail-layout__content {
  align-content: start;
  align-items: start;
  display: grid;
  gap: inherit;
  grid-auto-rows: max-content;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-y: contain;
}

.app-detail-layout--active > .app-detail-layout__content :deep(> *) {
  width: 100%;
}

.app-detail-layout--with-controls > .app-detail-layout__content {
  padding-bottom: 152px;
}

.app-detail-layout__header :deep(.app-back-button) {
  flex: 0 0 auto;
  left: auto;
  position: relative;
  top: auto;
}
</style>
