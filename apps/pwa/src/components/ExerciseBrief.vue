<template>
  <section class="exercise-brief" :class="{ 'exercise-brief--compact': compact }" aria-label="Задание урока">
    <header class="exercise-brief__header">
      <div>
        <p class="exercise-brief__eyebrow">{{ lessonTitle }}</p>
        <div class="exercise-brief__meta">Задание {{ step }} из {{ total }} · {{ mode.label }}</div>
        <h1 class="exercise-brief__heading">{{ mode.title }}</h1>
      </div>
      <div class="exercise-brief__visual" aria-hidden="true">
        <span class="exercise-brief__orbit" />
        <q-icon :name="mode.icon" size="38px" />
        <q-icon class="exercise-brief__spark" name="auto_awesome" size="17px" />
      </div>
    </header>
    <section class="exercise-brief__task">
      <h2><q-icon name="near_me" size="18px" />{{ mode.taskLabel }}</h2>
      <p class="exercise-brief__prompt">{{ exercise.prompt }}</p>
      <div v-if="exercise.nativePrompt" class="exercise-brief__native">
        <span v-if="exercise.phraseFocus">{{ exercise.phraseFocus }}</span>
        <strong>{{ exercise.nativePrompt }}</strong>
      </div>
    </section>
    <section v-if="exercise.microLesson" class="exercise-brief__explanation">
      <h2><q-icon name="menu_book" size="18px" />Коротко о задаче</h2>
      <p>{{ exercise.microLesson }}</p>
    </section>
    <section v-if="exercise.successTip && showTip !== false" class="exercise-brief__tip">
      <h2><q-icon name="lightbulb_outline" size="18px" />На что обратить внимание</h2>
      <p>{{ exercise.successTip }}</p>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Exercise } from '@mentor-ai/shared';
const props = defineProps<{ exercise: Exercise; lessonTitle: string; step: number; total: number; compact?: boolean; showTip?: boolean }>();
const mode = computed(() => {
  if (['listening-text', 'listening-comprehension'].includes(props.exercise.type)) {
    return { label: 'Listening', title: 'Слушаем и понимаем', taskLabel: 'Что сделать', icon: 'headphones' };
  }
  if (['dialogue-translation', 'repeat-speaking'].includes(props.exercise.type)) {
    return { label: 'Speaking', title: 'Говорим вслух', taskLabel: 'Что сказать', icon: 'record_voice_over' };
  }
  return { label: 'Practice', title: 'Собираем точную мысль', taskLabel: 'Что сделать', icon: 'edit_note' };
});
</script>

<style scoped>
.exercise-brief {
  display: grid;
  gap: 20px;
  min-width: 0;
  padding: clamp(20px, 2.4vw, 32px);
  border: 1px solid var(--category-border);
  border-radius: 24px;
  background: color-mix(in srgb, var(--app-surface) 95%, var(--category-accent));
}
.exercise-brief__header { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.exercise-brief__header > div:first-child { min-width: 0; }
.exercise-brief__eyebrow { margin: 0 0 10px; color: var(--app-muted); font-size: .88rem; line-height: 1.5; }
.exercise-brief__meta { color: var(--category-accent); font-size: .8rem; font-weight: 700; letter-spacing: .03em; }
.exercise-brief .exercise-brief__heading { margin: 8px 0 0; color: var(--app-text-strong); font-size: clamp(1.25rem, 1.8vw, 1.65rem); line-height: 1.3; font-weight: 750; }
.exercise-brief h2 { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; color: var(--app-muted-strong); font-size: .82rem; font-weight: 750; line-height: 1.4; }
.exercise-brief p { margin: 0; font-size: 1rem; line-height: 1.65; overflow-wrap: anywhere; }
.exercise-brief .exercise-brief__prompt { color: var(--app-text-strong); font-size: clamp(1.1rem, 1.4vw, 1.3rem); line-height: 1.6; font-weight: 550; white-space: pre-line; }
.exercise-brief__task { padding-top: 20px; border-top: 1px solid var(--app-border); }
.exercise-brief__task h2 { color: var(--category-accent); }
.exercise-brief__native { display: grid; gap: 8px; margin-top: 16px; padding: 16px; border: 1px solid var(--category-border); border-radius: 14px; background: var(--app-surface); }
.exercise-brief__native span { color: var(--app-muted); font-size: .82rem; }
.exercise-brief__native strong { color: var(--app-text-strong); font-size: 1.15rem; line-height: 1.6; }
.exercise-brief__explanation { color: var(--app-text); }
.exercise-brief__tip { padding: 16px 18px; border-radius: 14px; border-left: 3px solid var(--category-accent); background: color-mix(in srgb, var(--category-accent) 8%, var(--app-surface)); color: var(--app-muted-strong); }
.exercise-brief__tip h2 { margin-bottom: 6px; }
.exercise-brief__tip p { font-size: .94rem; }
.exercise-brief__visual { position: relative; display: grid; place-items: center; flex: 0 0 88px; height: 88px; color: var(--category-accent); background: radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--category-accent) 24%, transparent), transparent 75%); border-radius: 24px; border: 1px solid var(--category-border); }
.exercise-brief__orbit { position: absolute; inset: 10px; border: 1px dashed var(--category-border); border-radius: 50%; transform: rotate(-20deg); }
.exercise-brief__spark { position: absolute; right: 4px; top: 4px; }
.exercise-brief--compact { gap: 14px; padding: 20px 24px; }
.exercise-brief--compact .exercise-brief__visual { flex-basis: 64px; height: 64px; }
.exercise-brief--compact .exercise-brief__tip { padding: 12px 16px; }
@media (max-width: 700px) {
  .exercise-brief { gap: 16px; padding: 18px; border-radius: 18px; }
  .exercise-brief__header { gap: 12px; }
  .exercise-brief__visual { flex-basis: 60px; height: 60px; border-radius: 18px; }
  .exercise-brief__tip { padding: 12px; }
}
</style>
