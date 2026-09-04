<template>
  <q-page class="statistics-page">
    <section class="statistics-shell">
      <header class="statistics-header">
        <div>
          <p>Learning data</p>
          <h1>Statistics</h1>
        </div>
      </header>

      <section class="learning-overview">
        <div class="metric-tile">
          <span>Total practice</span>
          <strong>{{ formatDuration(activityTotals.totalSeconds) }}</strong>
        </div>
        <div class="metric-tile">
          <span>Listening</span>
          <strong>{{ formatDuration(activityTotals.listeningSeconds) }}</strong>
        </div>
        <div class="metric-tile">
          <span>Reading</span>
          <strong>{{ formatDuration(activityTotals.readingSeconds) }}</strong>
        </div>
        <div class="metric-tile">
          <span>Speaking</span>
          <strong>{{ formatDuration(activityTotals.speakingSeconds) }}</strong>
        </div>
        <div class="metric-tile">
          <span>Lessons</span>
          <strong>{{ serverSummary.lessons }}</strong>
        </div>
        <div class="metric-tile">
          <span>Words spoken</span>
          <strong>{{ serverSummary.spokenWords.toLocaleString() }}</strong>
        </div>
        <div class="metric-tile">
          <span>Average accuracy</span>
          <strong>{{ averageAccuracy }}</strong>
        </div>
        <div class="metric-tile">
          <span>Practice days</span>
          <strong>{{ serverSummary.practiceDays }}</strong>
        </div>
      </section>

      <section class="learning-panels">
        <div class="learning-panel">
          <div class="panel-heading">
            <span>Student model</span>
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
              :disable="!appStore.isOnline"
              @click="sync"
            >
              <q-tooltip>Sync learning evidence</q-tooltip>
            </q-btn>
          </div>
          <p>{{ syncDetail }}</p>
          <p v-if="appStore.latestStatistics">
            Last lesson: {{ latestAccuracy }} accuracy, {{ appStore.latestStatistics.completedExercises }} exercises,
            {{ formatDisplayDate(appStore.latestStatistics.createdAt) }}.
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useAppStore } from 'src/stores/app-store';
import { formatDisplayDate } from 'src/services/date-format';
import { loadLearningActivityTotals, syncLearningActivity } from 'src/services/learning-activity';
import type { LearningActivityTotals } from '@mentor-ai/shared';

const appStore = useAppStore();
const activityTotals = ref<LearningActivityTotals>({ listeningSeconds: 0, readingSeconds: 0, speakingSeconds: 0, totalSeconds: 0, updatedAt: null });

const serverSummary = computed(() => {
  const snapshots = appStore.statisticsSnapshots;
  return {
    lessons: snapshots.length,
    spokenWords: snapshots.reduce((sum, snapshot) => sum + Math.max(0, snapshot.spokenWords ?? 0), 0),
    practiceDays: new Set(snapshots.map((snapshot) => snapshot.createdAt.slice(0, 10))).size,
    averageAccuracy: snapshots.length
      ? snapshots.reduce((sum, snapshot) => sum + snapshot.accuracy, 0) / snapshots.length
      : null,
  };
});

const latestAccuracy = computed(() => {
  const accuracy = appStore.latestStatistics?.accuracy;
  return accuracy === undefined ? '0%' : `${Math.round(accuracy * 100)}%`;
});
const averageAccuracy = computed(() => serverSummary.value.averageAccuracy === null
  ? '—'
  : `${Math.round(serverSummary.value.averageAccuracy * 100)}%`);
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

  return appStore.lastSyncAt ? `Last sync ${formatDisplayDate(appStore.lastSyncAt)}.` : 'No pending evidence.';
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
  await refreshActivityTotals();
  appStore.markStatisticsSeen();
  if (appStore.isOnline) void refreshFromServer();
  window.addEventListener('online', refreshFromServer);
  window.addEventListener('mentor-learning-activity-updated', refreshActivityTotals);
});

onBeforeUnmount(() => {
  window.removeEventListener('online', refreshFromServer);
  window.removeEventListener('mentor-learning-activity-updated', refreshActivityTotals);
});

async function sync() {
  await refreshFromServer();
}

async function refreshFromServer() {
  if (!navigator.onLine) return;
  await appStore.refreshRemoteLearningState();
  activityTotals.value = await syncLearningActivity().catch(() => loadLearningActivityTotals());
  appStore.markStatisticsSeen();
}

async function refreshActivityTotals() { activityTotals.value = await loadLearningActivityTotals(); }

function formatDuration(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

</script>
