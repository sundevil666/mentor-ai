<template>
  <q-page class="learning-page">
    <section class="learning-shell">
      <div class="learning-status">
        <q-badge
          class="network-status-badge"
          :color="syncColor"
          :outline="appStore.isOnline && appStore.pendingSyncCount === 0"
        >
          {{ syncLabel }}
        </q-badge>
        <q-badge
          class="network-status-badge"
          :color="appStore.isOnline ? 'teal-8' : 'negative'"
        >
          {{ appStore.isOnline ? 'Online' : 'Offline' }}
        </q-badge>
        <span>Model v{{ appStore.studentModel.version }}</span>
      </div>

      <section class="learning-overview">
        <div class="metric-tile">
          <span>Lessons</span>
          <strong>{{ appStore.completedLessonsCount }}</strong>
        </div>
        <div class="metric-tile">
          <span>Accuracy</span>
          <strong>{{ latestAccuracy }}</strong>
        </div>
        <div class="metric-tile">
          <span>Progress</span>
          <strong>{{ appStore.lessonProgress }}%</strong>
        </div>
      </section>

      <section
        v-if="!appStore.session"
        class="learning-start"
      >
        <div class="training-mode-strip">
          <q-btn
            v-for="mode in primaryTrainingModes"
            :key="mode.key"
            class="training-mode-button"
            color="primary"
            outline
            no-caps
            :icon="mode.icon"
            :label="mode.label"
            @click="startTraining(mode.key)"
          >
            <q-tooltip>{{ mode.reason }}</q-tooltip>
          </q-btn>
        </div>

        <div
          v-if="remoteContinueOptions.length > 0"
          class="handoff-actions"
        >
          <q-btn
            v-for="handoff in remoteContinueOptions"
            :key="handoff.id"
            color="primary"
            outline
            no-caps
            icon="devices"
            :label="handoff.label"
            @click="continueFromDevice(handoff.id)"
          >
            <q-tooltip>{{ handoff.detail }}</q-tooltip>
          </q-btn>
        </div>

        <p class="learning-start__eyebrow">
          Activity check
        </p>
        <h1>{{ activityHeadline }}</h1>
        <p>{{ currentSuggestion.reason }}</p>

        <div class="activity-controls">
          <q-select
            v-model="selectedShift"
            :options="shiftOptions"
            emit-value
            map-options
            label="Shift today"
            outlined
            dense
            @update:model-value="updateShift"
          />
          <div class="activity-signal">
            <span>{{ activityMeta }}</span>
            <strong>{{ paceLabel }}</strong>
          </div>
        </div>

        <div
          v-if="shiftTimingRows.length > 0"
          class="shift-timing-grid"
        >
          <div
            v-for="item in shiftTimingRows"
            :key="item.label"
            class="shift-timing-item"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>

        <div class="recommended-action">
          <q-btn
            class="recommended-action__button"
            color="primary"
            unelevated
            no-caps
            :icon="recommendedTraining.icon"
            :label="recommendedTraining.label"
            @click="startTraining(recommendedTraining.key)"
          >
            <q-tooltip>{{ recommendedTraining.reason }}</q-tooltip>
          </q-btn>
          <span>{{ recommendedTraining.reason }}</span>
        </div>

        <div class="concept-choice">
          <q-btn
            v-for="concept in conceptChoices"
            :key="concept.value"
            color="primary"
            outline
            no-caps
            :icon="concept.icon"
            :label="concept.label"
            @click="startConcept(concept.value)"
          >
            <q-tooltip>{{ concept.reason }}</q-tooltip>
          </q-btn>
        </div>
      </section>

      <section
        v-else-if="!appStore.isLessonComplete && currentExercise"
        class="lesson-stage"
      >
        <div class="lesson-nav">
          <q-btn
            color="primary"
            flat
            icon="home"
            no-caps
            label="Choose another"
            @click="returnToLessonChoice"
          />
          <span>{{ appStore.lessonProgress }}% complete</span>
        </div>

        <div>
          <p class="lesson-stage__eyebrow">
            {{ appStore.session.lesson.title }}
          </p>
          <h1>{{ currentExercise.prompt }}</h1>
          <p>{{ currentExercise.microLesson }}</p>
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
          <span>{{ currentExercise.successTip }}</span>
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
          label="Improve now"
          unelevated
          @click="startWithMode(currentSuggestion.mode)"
        />
        <q-btn
          color="primary"
          flat
          icon="home"
          label="Choose another"
          no-caps
          @click="returnToLessonChoice"
        />
      </section>

      <section class="learning-panels">
        <div class="learning-panel">
          <div class="panel-heading">
            <span>Student Model</span>
            <q-btn
              dense
              flat
              icon="restart_alt"
              round
              @click="reset"
            >
              <q-tooltip>Reset local learning</q-tooltip>
            </q-btn>
          </div>
          <div class="skill-list">
            <div
              v-for="skill in skillRows"
              :key="skill.label"
              class="skill-row"
            >
              <span>{{ skill.label }}</span>
              <q-linear-progress
                :value="skill.value"
                color="primary"
                rounded
                size="8px"
              />
              <strong>{{ Math.round(skill.value * 100) }}%</strong>
            </div>
          </div>
        </div>

        <div class="learning-panel">
          <div class="panel-heading">
            <span>Sync</span>
            <q-btn
              dense
              flat
              icon="sync"
              round
              :disable="appStore.pendingSyncCount === 0 || !appStore.isOnline"
              @click="sync"
            >
              <q-tooltip>Sync learning evidence</q-tooltip>
            </q-btn>
          </div>
          <p>{{ syncDetail }}</p>
          <p v-if="appStore.latestStatistics">
            Last lesson: {{ latestAccuracy }} accuracy, {{ appStore.latestStatistics.completedExercises }} exercises.
          </p>
          <p v-if="pronunciationSummary">
            {{ pronunciationSummary }}
          </p>
        </div>
      </section>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import type { LearningConcept, LearningMode, WorkShift } from '@mentor-ai/shared';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { inferActivitySuggestion } from 'src/services/activity-suggestion';
import { useAppStore } from 'src/stores/app-store';

type TrainingKey = 'listening' | 'speaking' | 'vocabulary';

const appStore = useAppStore();
const answer = ref('');
const selectedShift = ref<WorkShift>('unknown');

const currentExercise = computed(() => appStore.currentExercise);
const optionList = computed(
  () => currentExercise.value?.options?.map((option) => ({ label: option, value: option })) ?? [],
);
const inputLabel = computed(() => (currentExercise.value?.type === 'repeat-speaking' ? 'What did you say?' : 'Your answer'));
const syncLabel = computed(() => (appStore.pendingSyncCount > 0 ? `${appStore.pendingSyncCount} pending` : 'Offline ready'));
const syncColor = computed(() => {
  if (appStore.pendingSyncCount > 0) {
    return appStore.isOnline ? 'amber-8' : 'deep-orange-7';
  }

  return appStore.isOnline ? 'teal-8' : 'grey-7';
});
const latestAccuracy = computed(() => {
  const accuracy = appStore.latestStatistics?.accuracy;
  return accuracy === undefined ? '0%' : `${Math.round(accuracy * 100)}%`;
});
const currentSuggestion = computed(() =>
  inferActivitySuggestion(new Date(), selectedShift.value, appStore.activitySnapshots),
);
const activityHeadline = computed(() => {
  return `Best now: ${recommendedTraining.value.shortLabel}`;
});
const paceLabel = computed(() => {
  switch (currentSuggestion.value.activityPace) {
    case 'passive':
      return 'Light review';
    case 'steady':
      return 'Steady lesson';
    case 'active':
      return 'Active practice';
    case 'deep':
      return 'Deep listening';
    default:
      return 'Steady lesson';
  }
});
const activityMeta = computed(() => {
  const day = currentSuggestion.value.dayType === 'weekend' ? 'Weekend' : 'Weekday';
  const minutes = `${currentSuggestion.value.availableMinutes} min`;
  return `${day} · ${shiftLabel(currentSuggestion.value.workShift)} · ${minutes}`;
});
const remoteContinueOptions = computed(() =>
  appStore.remoteSessionHandoffs.map((handoff) => ({
    id: handoff.id,
    label: `Continue from ${handoff.sourceDevice}`,
    detail: `${handoff.lesson.title} · ${Math.min(handoff.currentExerciseIndex + 1, handoff.lesson.exercises.length)}/${handoff.lesson.exercises.length}`,
  })),
);
const shiftTimingRows = computed(() => {
  const timing = currentSuggestion.value.shiftTiming;

  if (!timing) {
    return [];
  }

  return [
    { label: 'Shift', value: `${timing.startsAt}-${timing.endsAt}` },
    { label: 'Leave home', value: timing.leaveHomeAt },
    { label: 'Bus', value: `${timing.busLeavesAt}-${timing.busArrivesAt}` },
    { label: 'Headphones off', value: timing.headphonesOffAt },
  ];
});
const skillRows = computed(() => [
  { label: 'Vocabulary', value: appStore.studentModel.vocabulary.score.value },
  { label: 'Grammar', value: appStore.studentModel.grammar.score.value },
  { label: 'Listening', value: appStore.studentModel.listening.score.value },
  { label: 'Speaking', value: appStore.studentModel.speaking.score.value },
]);
const conceptChoices: Array<{ value: LearningConcept; label: string; icon: string; reason: string }> = [
  {
    value: 'learning',
    label: 'Learning',
    icon: 'school',
    reason: 'Grammar, listening, speaking, correction, and review together.',
  },
  {
    value: 'reading',
    label: 'Reading',
    icon: 'menu_book',
    reason: 'A short text with comprehension and unknown-word evidence.',
  },
  {
    value: 'vocabulary',
    label: 'Vocabulary Growth',
    icon: 'psychology',
    reason: 'Recall, recognition, and words in context.',
  },
];
const primaryTrainingModes: Array<{ key: TrainingKey; label: string; shortLabel: string; icon: string; reason: string }> = [
  {
    key: 'listening',
    label: 'Listening',
    shortLabel: 'Listening',
    icon: 'headphones',
    reason: 'Listen first when the window is passive, weekend-sized, or good for audio practice.',
  },
  {
    key: 'speaking',
    label: 'Speaking',
    shortLabel: 'Speaking',
    icon: 'record_voice_over',
    reason: 'Use active speaking when you have enough energy and can answer aloud.',
  },
  {
    key: 'vocabulary',
    label: 'Vocabulary',
    shortLabel: 'Vocabulary',
    icon: 'psychology',
    reason: 'Build recall when the session should be short, focused, or review-heavy.',
  },
];
const shiftOptions: Array<{ label: string; value: WorkShift }> = [
  { label: 'Unknown', value: 'unknown' },
  { label: 'First shift', value: 'first' },
  { label: 'Second shift', value: 'second' },
  { label: 'Third shift', value: 'third' },
  { label: 'Day off', value: 'off' },
];
const recommendedTraining = computed(() => {
  const key = chooseRecommendedTraining();
  const training = primaryTrainingModes.find((item) => item.key === key) ?? primaryTrainingModes[0];

  return {
    ...training,
    label: `Start ${training.shortLabel}`,
    reason: `${training.reason} ${currentSuggestion.value.reason}`,
  };
});
const syncDetail = computed(() => {
  if (!appStore.isOnline) {
    return 'Learning evidence is stored locally and will sync when the network returns.';
  }

  if (appStore.pendingSyncCount > 0) {
    return 'Evidence is queued locally and ready to send to the Mentor AI API.';
  }

  return appStore.lastSyncAt ? `Last sync ${new Date(appStore.lastSyncAt).toLocaleString()}.` : 'No pending evidence.';
});
const pronunciationSummary = computed(() => {
  const latest = appStore.latestStatistics;

  if (!latest || latest.speechAttempts === 0) {
    return '';
  }

  if (latest.pronunciationIssueCount === 0) {
    return 'Pronunciation: no repeated issue detected in the last speaking step.';
  }

  return `Pronunciation focus: ${latest.pronunciationFocus.join(', ')}.`;
});

onMounted(async () => {
  if (!appStore.isHydrated) {
    await appStore.hydrate();
  }

  selectedShift.value = appStore.preferredWorkShift;

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
});

watch(
  () => currentExercise.value?.id,
  () => {
    answer.value = '';
  },
);

async function startWithMode(mode: LearningMode) {
  answer.value = '';
  const suggestion = currentSuggestion.value;
  await appStore.startLesson({
    mode,
    isOffline: !navigator.onLine,
    speechAvailable: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    availableMinutes: suggestion.availableMinutes,
    workShift: suggestion.workShift,
    dayType: suggestion.dayType,
    activityPace: suggestion.activityPace,
    startedHour: suggestion.localHour,
    activityReason: suggestion.reason,
    shiftTiming: suggestion.shiftTiming,
  });
}

async function startConcept(concept: LearningConcept) {
  answer.value = '';
  const suggestion = currentSuggestion.value;
  await appStore.startLesson({
    mode: suggestion.mode,
    selectedConcept: concept,
    manualConceptChoice: true,
    isOffline: !navigator.onLine,
    speechAvailable: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    availableMinutes: suggestion.availableMinutes,
    workShift: suggestion.workShift,
    dayType: suggestion.dayType,
    activityPace: suggestion.activityPace,
    startedHour: suggestion.localHour,
    activityReason: suggestion.reason,
    shiftTiming: suggestion.shiftTiming,
  });
}

async function startTraining(training: TrainingKey) {
  if (training === 'vocabulary') {
    await startConcept('vocabulary');
    return;
  }

  await startWithMode(training);
}

async function continueFromDevice(handoffId: string) {
  const handoff = appStore.remoteSessionHandoffs.find((item) => item.id === handoffId);

  if (!handoff) {
    return;
  }

  answer.value = '';
  await appStore.continueSessionHandoff(handoff);
}

function updateShift(value: WorkShift) {
  appStore.setPreferredWorkShift(value);
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

async function sync() {
  await appStore.syncPendingEvents();
}

async function returnToLessonChoice() {
  answer.value = '';
  await appStore.returnToLessonChoice();
}

async function reset() {
  await appStore.resetLocalLearning();
}

function handleOnline() {
  appStore.setNetworkStatus(true);
}

function handleOffline() {
  appStore.setNetworkStatus(false);
}

function shiftLabel(shift: WorkShift): string {
  switch (shift) {
    case 'first':
      return '1st shift';
    case 'second':
      return '2nd shift';
    case 'third':
      return '3rd shift';
    case 'off':
      return 'day off';
    case 'unknown':
      return 'shift unknown';
  }
}

function chooseRecommendedTraining(): TrainingKey {
  const suggestion = currentSuggestion.value;

  if (suggestion.mode === 'listening' || suggestion.dayType === 'weekend') {
    return 'listening';
  }

  if (suggestion.activityPace === 'passive' || suggestion.mode === 'review') {
    return 'vocabulary';
  }

  if (suggestion.activityPace === 'active' || suggestion.workShift === 'second' || suggestion.workShift === 'third') {
    return 'speaking';
  }

  const weakest = [
    { key: 'vocabulary' as const, value: appStore.studentModel.vocabulary.score.value },
    { key: 'listening' as const, value: appStore.studentModel.listening.score.value },
    { key: 'speaking' as const, value: appStore.studentModel.speaking.score.value },
  ].sort((left, right) => left.value - right.value)[0];

  return weakest.key;
}
</script>
