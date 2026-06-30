<template>
  <q-page class="statistics-page">
    <section class="statistics-shell">
      <header class="statistics-header">
        <div>
          <p>Learning data</p>
          <h1>Statistics</h1>
        </div>
        <q-btn
          color="primary"
          outline
          icon="restart_alt"
          label="Reset"
          no-caps
          @click="reset"
        >
          <q-tooltip>Reset local learning</q-tooltip>
        </q-btn>
      </header>

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
          <span>Current progress</span>
          <strong>{{ appStore.lessonProgress }}%</strong>
        </div>
      </section>

      <section class="learning-panels">
        <div class="learning-panel">
          <div class="panel-heading">
            <span>Student Model</span>
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
import { computed, onMounted } from 'vue';
import { useAppStore } from 'src/stores/app-store';

const appStore = useAppStore();

const latestAccuracy = computed(() => {
  const accuracy = appStore.latestStatistics?.accuracy;
  return accuracy === undefined ? '0%' : `${Math.round(accuracy * 100)}%`;
});
const skillRows = computed(() => [
  { label: 'Vocabulary', value: appStore.studentModel.vocabulary.score.value },
  { label: 'Grammar', value: appStore.studentModel.grammar.score.value },
  { label: 'Listening', value: appStore.studentModel.listening.score.value },
  { label: 'Speaking', value: appStore.studentModel.speaking.score.value },
]);
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
});

async function sync() {
  await appStore.syncPendingEvents();
}

async function reset() {
  await appStore.resetLocalLearning();
}
</script>
