<template>
  <q-page class="statistics-page">
    <section class="statistics-shell">
      <header class="statistics-header">
        <div>
          <p>Learning data</p>
          <h1>Statistics</h1>
        </div>
      </header>

      <section
        class="stats-highlights"
        aria-label="Learning results"
      >
        <article
          v-for="metric in highlights"
          :key="metric.label"
          class="stats-card"
          :style="{ '--metric-color': metric.color }"
        >
          <div class="stats-icon">
            <q-icon
              :name="metric.icon"
              size="25px"
            />
          </div>
          <span class="stats-label">{{ metric.label }}</span>
          <strong class="stats-value">{{ metric.value }}</strong>
          <span class="stats-caption">{{ metric.caption }}</span>
        </article>
      </section>

      <section
        class="stats-practice"
        aria-labelledby="practice-title"
      >
        <div class="stats-section-heading">
          <div>
            <h2 id="practice-title">
              Your practice mix
            </h2><p>Measured time across your learning activities</p>
          </div>
          <div class="stats-total">
            <q-icon name="schedule" /> {{ formatDuration(activityTotals.totalSeconds) }} <span>total practice</span>
          </div>
        </div>
        <div class="stats-activities">
          <article
            v-for="activity in activities"
            :key="activity.label"
            class="stats-activity"
            :style="{ '--metric-color': activity.color }"
          >
            <div class="stats-activity-top">
              <div class="stats-icon">
                <q-icon
                  :name="activity.icon"
                  size="23px"
                />
              </div><span>{{ activity.label }}</span>
            </div>
            <strong>{{ formatDuration(activity.seconds) }}</strong>
            <div
              class="stats-track"
              aria-hidden="true"
            >
              <div :style="{ width: `${activity.share * 100}%` }" />
            </div>
            <span class="stats-caption">{{ Math.round(activity.share * 100) }}% of practice time</span>
          </article>
        </div>
        <p
          v-if="!activityTotals.totalSeconds"
          class="stats-empty"
        >
          Your practice mix will appear as you spend time learning.
        </p>
      </section>

      <section
        class="stats-movies"
        aria-label="Movie learning"
      >
        <div class="stats-icon">
          <q-icon
            name="local_movies"
            size="28px"
          />
        </div>
        <div class="stats-movies-intro">
          <h2>Learning through movies</h2><p>Viewing estimate: 2 hours per saved movie report.</p>
        </div>
        <div class="stats-movie-number">
          <strong>{{ movieSummary.movieCount }}</strong><span>Movies watched</span>
        </div>
        <div class="stats-movie-number">
          <strong>≈ {{ formatDuration(movieSummary.estimatedViewingSeconds) }}</strong><span>Estimated viewing</span>
        </div>
      </section>

      <section class="learning-panels">
        <div class="learning-panel">
          <div class="panel-heading">
            <span><q-icon
              name="insights"
              class="q-mr-sm"
            />Skill profile</span>
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
            <span><q-icon
              name="cloud_sync"
              class="q-mr-sm"
            />Learning sync</span>
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
import { loadMovieLearningReports, refreshMovieLearningReportsFromCloud } from 'src/services/movie-learning-reports';
import { summarizeMovieViewing } from 'src/services/movie-viewing-summary';
import type { LearningActivityTotals } from '@mentor-ai/shared';
import type { MovieLearningReport } from '@mentor-ai/shared';

const appStore = useAppStore();
const activityTotals = ref<LearningActivityTotals>({ grammarSeconds: 0, listeningSeconds: 0, speakingSeconds: 0, phrasesSeconds: 0, audioSeconds: 0, readingSeconds: 0, vocabularySeconds: 0, totalSeconds: 0, updatedAt: null });
const movieReports = ref<MovieLearningReport[]>([]);
const movieSummary = computed(() => summarizeMovieViewing(movieReports.value));

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
const highlights = computed(() => [
  { label: 'Lessons', value: serverSummary.value.lessons, icon: 'school', color: '#4361c2', caption: 'Recorded lesson results' },
  { label: 'Words spoken', value: serverSummary.value.spokenWords.toLocaleString(), icon: 'mic', color: '#9b4580', caption: 'Speaking practice' },
  { label: 'Average accuracy', value: averageAccuracy.value, icon: 'track_changes', color: '#187b69', caption: 'Across recorded lessons' },
  { label: 'Practice days', value: serverSummary.value.practiceDays, icon: 'event_available', color: '#a56824', caption: 'Days with lesson results' },
]);
const activities = computed(() => [
  { label: 'Grammar', seconds: activityTotals.value.grammarSeconds, icon: 'spellcheck', color: '#4361c2' },
  { label: 'Lesson listening', seconds: activityTotals.value.listeningSeconds, icon: 'hearing', color: '#247f92' },
  { label: 'Speaking', seconds: activityTotals.value.speakingSeconds, icon: 'mic', color: '#9b4580' },
  { label: 'Phrases', seconds: activityTotals.value.phrasesSeconds, icon: 'forum', color: '#a56824' },
  { label: 'Audio', seconds: activityTotals.value.audioSeconds, icon: 'headphones', color: '#7355b4' },
  { label: 'Reading', seconds: activityTotals.value.readingSeconds, icon: 'auto_stories', color: '#187b69' },
  { label: 'Vocabulary', seconds: activityTotals.value.vocabularySeconds, icon: 'style', color: '#a55345' },
].map((activity) => ({ ...activity, share: activityTotals.value.totalSeconds > 0 ? Math.min(1, Math.max(0, activity.seconds / activityTotals.value.totalSeconds)) : 0 })));
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
  await refreshMovieReports();
  appStore.markStatisticsSeen();
  if (appStore.isOnline) void refreshFromServer();
  window.addEventListener('online', refreshFromServer);
  window.addEventListener('mentor-learning-activity-updated', refreshActivityTotals);
  window.addEventListener('mentor-movie-reports-updated', refreshMovieReports);
});

onBeforeUnmount(() => {
  window.removeEventListener('online', refreshFromServer);
  window.removeEventListener('mentor-learning-activity-updated', refreshActivityTotals);
  window.removeEventListener('mentor-movie-reports-updated', refreshMovieReports);
});

async function sync() {
  await refreshFromServer();
}

async function refreshFromServer() {
  if (!navigator.onLine) return;
  await appStore.refreshRemoteLearningState();
  activityTotals.value = await syncLearningActivity().catch(() => loadLearningActivityTotals());
  await refreshMovieReports();
  appStore.markStatisticsSeen();
}

async function refreshActivityTotals() { activityTotals.value = await loadLearningActivityTotals(); }

async function refreshMovieReports() {
  if (navigator.onLine) await refreshMovieLearningReportsFromCloud().catch(() => 0);
  movieReports.value = await loadMovieLearningReports();
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  if (seconds > 0 && minutes === 0) return '<1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

</script>

<style scoped lang="scss">
.stats-highlights { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.stats-card, .stats-practice, .stats-movies { border: 1px solid var(--app-border); border-radius: 22px; background: var(--app-surface); }
.stats-card { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 22px; background: linear-gradient(145deg, color-mix(in srgb, var(--metric-color) 7%, var(--app-surface)), var(--app-surface) 75%); }
.stats-icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 46px; height: 46px; border-radius: 15px; background: color-mix(in srgb, var(--metric-color) 11%, var(--app-surface)); color: color-mix(in srgb, var(--metric-color) 72%, var(--app-text-strong)); }
.stats-label { margin-top: 8px; color: var(--app-text); font-size: 14px; font-weight: 600; }
.stats-value { font-size: clamp(28px, 3vw, 38px); line-height: 1.2; color: var(--app-text-strong); letter-spacing: -1px; }
.stats-caption { color: var(--app-muted-strong); font-size: 12px; line-height: 1.5; }
.stats-practice { padding: 24px; }
.stats-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
h2 { margin: 0; font-size: 19px; line-height: 1.4; font-weight: 700; color: var(--app-text-strong); }
.stats-section-heading p, .stats-movies p { margin: 6px 0 0; color: var(--app-muted-strong); font-size: 13px; line-height: 1.5; }
.stats-total { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; font-size: 20px; font-weight: 700; color: var(--app-text-strong); }
.stats-total span { font-size: 12px; font-weight: 400; color: var(--app-muted-strong); }
.stats-activities { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.stats-activity { padding: 16px; border-radius: 17px; background: var(--app-surface-soft); display: flex; flex-direction: column; gap: 10px; }
.stats-activity-top { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; color: var(--app-text); }
.stats-activity .stats-icon { width: 38px; height: 38px; border-radius: 12px; }
.stats-activity > strong { font-size: 23px; line-height: 1.3; color: var(--app-text-strong); }
.stats-track { height: 6px; border-radius: 8px; background: var(--app-border); overflow: hidden; }
.stats-track > div { height: 100%; border-radius: inherit; background: var(--metric-color); }
.stats-empty { color: var(--app-muted-strong); margin: 18px 0 0; }
.stats-movies { --metric-color: #7355b4; display: flex; align-items: center; gap: 20px; padding: 24px; background: var(--app-surface); }
.stats-movies-intro { flex: 1; }
.stats-movie-number { display: flex; flex-direction: column; gap: 5px; min-width: 130px; }
.stats-movie-number strong { font-size: 25px; line-height: 1.3; color: var(--app-text-strong); }
.stats-movie-number span { font-size: 12px; color: var(--app-muted-strong); }
@media (max-width: 1000px) { .stats-activities { grid-template-columns: repeat(3, minmax(0, 1fr)); } .stats-movies { flex-wrap: wrap; } }
@media (max-width: 650px) {
  .stats-highlights, .stats-activities { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .stats-card { padding: 16px; border-radius: 18px; }
  .stats-practice, .stats-movies { padding: 16px; }
  .stats-section-heading { align-items: flex-start; flex-direction: column; gap: 12px; margin-bottom: 18px; }
  .stats-activity { padding: 12px; }
  .stats-activity-top { align-items: flex-start; flex-direction: column; gap: 8px; }
  .stats-movies-intro { flex-basis: calc(100% - 70px); }
  .stats-movie-number { flex: 1; min-width: 0; }
}
</style>
