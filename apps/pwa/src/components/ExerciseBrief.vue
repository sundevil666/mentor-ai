<template>
  <section class="exercise-brief" :class="{ 'exercise-brief--compact': compact }" aria-label="Задание урока">
    <header class="exercise-brief__header">
      <div>
        <p class="exercise-brief__eyebrow">{{ lessonTitle }}</p>
        <div class="exercise-brief__meta">Задание {{ step }} из {{ total }} · {{ mode.label }}</div>
        <h1 class="exercise-brief__heading">{{ mode.title }}</h1>
      </div>
    </header>
    <section class="exercise-brief__task">
      <div v-if="parts.context" class="exercise-brief__context">
        <h2><q-icon name="visibility" size="18px" />{{ spoken ? 'Прочитай · ситуация и задание' : mode.taskLabel }}</h2>
        <p class="exercise-brief__prompt">{{ parts.context }}</p>
      </div>
      <div v-if="parts.phrase" class="exercise-brief__situation" :class="{ 'exercise-brief__situation--illustrated': scene }">
        <div class="exercise-brief__native">
          <h2><q-icon :name="spoken ? 'mic' : 'edit_note'" size="18px" />{{ spoken ? 'Произнеси по-английски' : 'Фраза задания' }}</h2>
          <strong>{{ parts.phrase }}</strong>
        </div>
        <ExerciseSituationScene v-if="scene" :key="exercise.id" :scene="scene" />
      </div>
      <div v-if="parts.support" class="exercise-brief__support">
        <h2><q-icon name="key" size="18px" />Опора для ответа</h2>
        <p>{{ parts.support }}</p>
      </div>
    </section>
    <section v-if="exercise.microLesson" class="exercise-brief__explanation">
      <h2><q-icon name="menu_book" size="18px" />Как это работает</h2>
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
import ExerciseSituationScene from './ExerciseSituationScene.vue';
import { splitExercisePrompt } from 'src/services/exercise-prompt-parts';
import { resolveExerciseScene } from 'src/services/exercise-scene';
const props = defineProps<{ exercise: Exercise; lessonTitle: string; step: number; total: number; compact?: boolean; showTip?: boolean }>();
const spoken = computed(() => ['dialogue-translation', 'repeat-speaking'].includes(props.exercise.type));
const parts = computed(() => spoken.value
  ? splitExercisePrompt(props.exercise.prompt, props.exercise.nativePrompt)
  : { context: props.exercise.prompt, phrase: props.exercise.nativePrompt ?? '', support: '' });
const scene = computed(() => resolveExerciseScene(`${props.exercise.nativePrompt ?? ''} ${props.exercise.prompt}`));
const mode = computed(() => {
  if (['listening-text', 'listening-comprehension'].includes(props.exercise.type)) {
    return { label: 'Listening', title: 'Слушаем и понимаем', taskLabel: 'Что сделать', icon: 'headphones' };
  }
  if (['dialogue-translation', 'repeat-speaking'].includes(props.exercise.type)) {
    return { label: 'Speaking', title: 'Скажи по-английски', taskLabel: 'Задание', icon: 'record_voice_over' };
  }
  return { label: 'Practice', title: 'Собираем точную мысль', taskLabel: 'Что сделать', icon: 'edit_note' };
});
</script>

<style scoped>
.exercise-brief { display: grid; gap: 24px; min-width: 0; padding: 28px; border: 1px solid var(--app-border); border-radius: 20px; background: var(--app-surface); }
.exercise-brief__header { padding-bottom: 20px; border-bottom: 1px solid var(--app-border); }
.exercise-brief .exercise-brief__eyebrow { margin: 0 0 8px; color: var(--app-muted-strong); font-size: .85rem; line-height: 1.5; }
.exercise-brief__meta { color: var(--category-accent); font-size: .78rem; font-weight: 650; }
.exercise-brief .exercise-brief__heading { margin: 10px 0 0; color: var(--app-text-strong); font-size: clamp(1.2rem, 1.7vw, 1.5rem); line-height: 1.35; font-weight: 700; }
.exercise-brief h2 { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; color: var(--app-muted-strong); font-size: .8rem; font-weight: 650; line-height: 1.4; }
.exercise-brief p { margin: 0; color: var(--app-muted-strong); font-size: 1rem; line-height: 1.65; overflow-wrap: anywhere; }
.exercise-brief .exercise-brief__prompt { color: var(--app-text); font-size: 1rem; line-height: 1.6; white-space: pre-line; }
.exercise-brief__task { display: grid; gap: 14px; }
.exercise-brief__context, .exercise-brief__support { padding: 14px 16px; border-radius: 12px; background: var(--app-surface-soft); }
.exercise-brief__support { border: 1px dashed var(--app-border); background: transparent; }
.exercise-brief__context h2, .exercise-brief__support h2 { margin-bottom: 6px; }
.exercise-brief__support p { font-size: .94rem; }
.exercise-brief__native h2 { color: var(--category-accent); margin: 0; }
.exercise-brief__situation { display: grid; align-items: center; gap: 20px; margin-top: 0; padding: 20px; border: 1px solid var(--category-border); border-left: 3px solid var(--category-accent); border-radius: 16px; background: color-mix(in srgb, var(--category-accent) 6%, var(--app-surface)); }
.exercise-brief__situation--illustrated { grid-template-columns: minmax(0, 1fr) 150px; }
.exercise-brief__native { display: grid; gap: 10px; min-width: 0; }
.exercise-brief__native strong { color: var(--app-text-strong); font-size: clamp(1.15rem, 1.6vw, 1.4rem); font-weight: 650; line-height: 1.5; }
.exercise-brief__explanation { padding-left: 14px; border-left: 2px solid var(--category-border); }
.exercise-brief__tip { padding: 16px; border-radius: 12px; background: var(--app-surface-soft); }
.exercise-brief__tip p { font-size: .94rem; }
.exercise-brief--compact { gap: 16px; padding: 20px 24px; }
@media (max-width: 700px) {
  .exercise-brief { gap: 20px; padding: 18px; border-radius: 18px; }
  .exercise-brief__situation { padding: 14px; gap: 12px; }
  .exercise-brief__situation--illustrated { grid-template-columns: minmax(0, 1fr) 96px; }
}
</style>
