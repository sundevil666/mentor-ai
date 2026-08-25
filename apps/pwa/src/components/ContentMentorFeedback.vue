<template>
  <div class="content-mentor-feedback" @click.stop>
    <span class="content-mentor-feedback__statistics">
      <q-icon name="insights" /> {{ statisticsLabel }}
    </span>
    <q-select
      class="content-mentor-feedback__select"
      dense
      emit-value
      label="Tell my mentor"
      map-options
      outlined
      :model-value="summary.feedback ?? null"
      :options="feedbackOptions"
      @update:model-value="saveFeedback"
    />
  </div>
</template>

<script setup lang="ts">
import type { ContentFeedbackValue, ContentProgressCategory } from '@mentor-ai/shared';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  loadContentEngagementSummaries,
  recordContentEngagement,
  type ContentEngagementSummary,
} from 'src/services/content-engagement';
import { useAppStore } from 'src/stores/app-store';

const props = defineProps<{ category: ContentProgressCategory; contentId: string }>();
const appStore = useAppStore();
const summary = ref<ContentEngagementSummary>({ starts: 0, finishes: 0, fullPlays: 0 });
const feedbackOptions = computed<Array<{ label: string; value: ContentFeedbackValue }>>(() => [
  { label: 'Everything is clear', value: 'clear' },
  { label: 'Mostly clear — repeat later', value: 'mostly-clear' },
  { label: 'I need an explanation', value: 'needs-explanation' },
  { label: 'This is too difficult', value: 'too-difficult' },
  props.category === 'audio'
    ? { label: 'I simply enjoy listening to this', value: 'enjoy-listening' }
    : { label: 'I like this kind of practice', value: 'enjoy-format' },
  { label: 'This format does not suit me', value: 'not-my-format' },
]);
const statisticsLabel = computed(() => {
  const lastLabel = props.category === 'lesson' ? 'full completions' : 'full plays';
  return `${summary.value.starts} starts · ${summary.value.finishes} finishes · ${summary.value.fullPlays} ${lastLabel}`;
});

onMounted(() => {
  void refresh();
  window.addEventListener('mentor-content-engagement', handleEngagementUpdate);
});
onUnmounted(() => window.removeEventListener('mentor-content-engagement', handleEngagementUpdate));

function handleEngagementUpdate(event: Event) {
  if (event instanceof CustomEvent && event.detail === props.contentId) void refresh();
}

async function refresh() {
  const summaries = await loadContentEngagementSummaries(props.category);
  summary.value = summaries.get(props.contentId) ?? { starts: 0, finishes: 0, fullPlays: 0 };
}

async function saveFeedback(feedback: ContentFeedbackValue | null) {
  if (!feedback) return;
  await recordContentEngagement({
    studentId: appStore.studentId,
    category: props.category,
    contentId: props.contentId,
    type: 'feedback-selected',
    feedback,
  });
}
</script>
