<template>
  <q-page class="learning-page">
    <section class="learning-shell">
      <div class="learning-status">
        <q-badge
          :color="syncColor"
          outline
        >
          {{ syncLabel }}
        </q-badge>
        <span>Model v{{ appStore.studentModel.version }}</span>
      </div>

      <section
        v-if="!appStore.session"
        class="learning-start"
      >
        <p class="learning-start__eyebrow">
          Mentor AI
        </p>
        <h1>{{ appStore.latestRecommendation?.summary ?? 'English practice' }}</h1>
        <p>{{ appStore.latestRecommendation?.reason ?? 'Start with a short lesson prepared from the current Student Model.' }}</p>
        <q-btn
          color="primary"
          label="Start"
          unelevated
          size="lg"
          @click="start"
        />
      </section>

      <section
        v-else-if="!appStore.isLessonComplete && currentExercise"
        class="lesson-stage"
      >
        <div>
          <p class="lesson-stage__eyebrow">
            {{ appStore.session.lesson.title }}
          </p>
          <h1>{{ currentExercise.prompt }}</h1>
          <p>{{ appStore.session.lesson.purpose }}</p>
        </div>

        <div
          v-if="currentExercise.audioText"
          class="audio-row"
        >
          <q-btn
            color="primary"
            flat
            icon="volume_up"
            round
            @click="playAudio"
          >
            <q-tooltip>Play audio</q-tooltip>
          </q-btn>
          <span>{{ currentExercise.audioText }}</span>
        </div>

        <q-option-group
          v-if="currentExercise.options"
          v-model="answer"
          :options="optionList"
          color="primary"
        />
        <q-input
          v-else
          v-model="answer"
          :label="inputLabel"
          outlined
          autofocus
          @keyup.enter="submit"
        />

        <div class="lesson-actions">
          <q-btn
            color="primary"
            label="Continue"
            unelevated
            :disable="answer.trim().length === 0"
            @click="submit"
          />
        </div>
      </section>

      <section
        v-else
        class="lesson-complete"
      >
        <p class="lesson-complete__eyebrow">
          Lesson complete
        </p>
        <h1>{{ appStore.latestRecommendation?.summary }}</h1>
        <p>{{ appStore.latestRecommendation?.reason }}</p>
        <p v-if="appStore.session?.observation">
          {{ appStore.session.observation.description }}
        </p>
        <q-btn
          color="primary"
          label="Next lesson"
          unelevated
          @click="start"
        />
      </section>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useAppStore } from 'src/stores/app-store';

const appStore = useAppStore();
const answer = ref('');

const currentExercise = computed(() => appStore.currentExercise);
const optionList = computed(
  () => currentExercise.value?.options?.map((option) => ({ label: option, value: option })) ?? [],
);
const inputLabel = computed(() => (currentExercise.value?.type === 'repeat-speaking' ? 'What did you say?' : 'Your answer'));
const syncLabel = computed(() => (appStore.pendingSyncCount > 0 ? `${appStore.pendingSyncCount} pending` : 'Offline ready'));
const syncColor = computed(() => (appStore.pendingSyncCount > 0 ? 'amber-8' : 'teal-8'));

onMounted(async () => {
  if (!appStore.isHydrated) {
    await appStore.hydrate();
  }
});

watch(
  () => currentExercise.value?.id,
  () => {
    answer.value = '';
  },
);

async function start() {
  answer.value = '';
  await appStore.startLesson();
}

async function submit() {
  if (answer.value.trim().length === 0) {
    return;
  }

  await appStore.submitCurrentExercise(answer.value);
}

async function playAudio() {
  const text = currentExercise.value?.audioText;

  if (text && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  await appStore.replayAudio();
}
</script>
