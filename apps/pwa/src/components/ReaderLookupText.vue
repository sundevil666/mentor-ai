<template>
  <p
    ref="element"
    class="reader-lookup-text"
    tabindex="0"
    :aria-label="label"
  >
    {{ text }}
  </p>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{ text: string; maxFontSize: number; label: string }>();
const element = ref<HTMLElement | null>(null);
let observer: ResizeObserver | undefined;
let frame = 0;

function fitText() {
  const node = element.value;
  if (!node || !node.clientWidth) return;
  const maximum = Math.max(14, Math.round(props.maxFontSize));
  // Restore the preferred size first so shorter selections can grow again.
  node.style.fontSize = `${maximum}px`;
  for (let size = maximum; size > 14 && (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth);) {
    size -= 1;
    node.style.fontSize = `${size}px`;
  }
}

function scheduleFit() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(fitText);
}

watch(() => [props.text, props.maxFontSize], async () => {
  await nextTick();
  if (element.value) element.value.scrollTop = 0;
  scheduleFit();
});
onMounted(() => {
  observer = new ResizeObserver(scheduleFit);
  if (element.value) observer.observe(element.value);
  scheduleFit();
});
onBeforeUnmount(() => {
  observer?.disconnect();
  cancelAnimationFrame(frame);
});
</script>

<style scoped>
.reader-lookup-text {
  max-height: min(20dvh, 180px);
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  white-space: pre-wrap;
}
</style>
