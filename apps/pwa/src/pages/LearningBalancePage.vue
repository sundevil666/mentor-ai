<template>
  <q-page class="learning-balance-page">
    <section class="learning-balance-shell">
      <header class="learning-balance-hero">
        <div><p>Last 30 days</p><h1>Your learning balance</h1><span>See what is moving your English forward and what deserves attention next.</span></div>
        <LearningBalanceGauge :score="balance.balanceScore" />
      </header>

      <q-card flat bordered class="learning-balance-change" aria-live="polite">
        <q-card-section v-if="latestChange">
          <div class="learning-balance-change__delta" :class="latestChange.delta > 0 ? 'is-positive' : latestChange.delta < 0 ? 'is-negative' : 'is-neutral'">{{ formatDelta(latestChange.delta) }}</div>
          <div>
            <span>Latest balance change · {{ formatChangeTime(latestChange.occurredAt) }}</span>
            <h2>{{ latestChange.action }}</h2>
            <p>{{ formatDuration(latestChange.activeSeconds) }} recorded. {{ changeExplanation(latestChange.delta) }}</p>
          </div>
        </q-card-section>
        <q-card-section v-else>
          <div class="learning-balance-change__delta is-neutral">—</div>
          <div><span>Latest balance change</span><h2>No recorded activity yet</h2><p>Your first measured practice will appear here.</p></div>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="learning-focus-card">
        <q-card-section>
          <div class="learning-focus-card__icon"><q-icon name="track_changes" /></div>
          <div><span>Best next move</span><h2>Give more attention to {{ balance.primaryFocus.label.toLowerCase() }}</h2><p>It currently provides {{ balance.primaryFocus.impactPercent }}% of your measured learning impact, while a balanced target is about {{ balance.primaryFocus.targetPercent }}%. Your strongest area is {{ balance.strongestArea.label.toLowerCase() }}.</p></div>
          <q-btn color="primary" no-caps rounded unelevated :label="balance.primaryFocus.actionLabel" :to="balance.primaryFocus.route" />
        </q-card-section>
      </q-card>

      <section class="learning-balance-grid" aria-label="Learning activity balance">
        <router-link
          v-for="row in balance.rows"
          :key="row.kind"
          :to="row.route"
          class="learning-balance-card"
          :class="[`learning-balance-card--${row.status}`, row.priorityRank ? `learning-balance-card--priority-${row.priorityRank}` : 'learning-balance-card--unranked']"
        >
          <div v-if="row.priorityRank && row.priorityRank <= 3" class="learning-balance-card__priority">
            <q-icon :name="row.priorityRank === 1 ? 'priority_high' : 'arrow_upward'" />
            {{ row.priorityRank === 1 ? 'Do this first' : `Priority ${row.priorityRank}` }}
          </div>
          <div class="learning-balance-card__heading">
            <div><strong>{{ row.label }}</strong><span>{{ row.description }}</span></div>
            <div class="learning-balance-card__impact"><strong>{{ row.impactPercent }}%</strong><span>{{ row.estimated ? 'listening credit' : 'of impact' }}</span></div>
          </div>
          <q-linear-progress rounded size="10px" :value="row.estimated ? 0 : Math.min(1, row.impactPercent / Math.max(1, row.targetPercent))" :color="row.status === 'focus' ? 'deep-orange-6' : row.status === 'strong' ? 'secondary' : 'primary'" track-color="grey-3" />
          <div class="learning-balance-card__meta"><span>{{ row.estimated ? `${recentMovieReports.length} report${recentMovieReports.length === 1 ? '' : 's'} · ${formatDuration(row.seconds)} estimated` : `${formatDuration(row.seconds)} recorded` }}</span><span>{{ row.estimated ? 'Included in listening' : `Target mix ${row.targetPercent}%` }}</span></div>
          <div class="learning-balance-card__footer">
            <span class="learning-balance-card__status">{{ row.estimated ? '1 h 45 min per completed report' : row.status === 'focus' ? 'Needs more attention' : row.status === 'strong' ? 'Already a strong area' : 'Close to balance' }}</span>
            <span class="learning-balance-card__action">{{ row.actionLabel }}<q-icon name="arrow_forward" /></span>
          </div>
        </router-link>
      </section>
      <p class="learning-balance-note">Percentages show the share of estimated learning impact, not an exam score. Active speech and checked recall receive more weight than passive input. Each completed movie report adds an estimated 1 h 45 min of English listening with a cautious weight because viewing time is not directly timed.</p>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import LearningBalanceGauge from 'src/components/LearningBalanceGauge.vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { LearningActivityEvent, MovieLearningReport } from '@mentor-ai/shared';
import { useAppStore } from 'src/stores/app-store';
import { loadLearningActivityHistory } from 'src/services/learning-activity';
import { calculateLatestBalanceChange, calculateLearningBalance, summarizeRecentLearningActivity } from 'src/services/learning-balance';
import { loadMovieLearningReports, refreshMovieLearningReportsFromCloud } from 'src/services/movie-learning-reports';
import { estimatedMovieViewingSeconds, summarizeMovieViewing } from 'src/services/movie-viewing-summary';
import { listPersonalBooks } from 'src/services/personal-book-library';

const appStore = useAppStore();
const movieReports = ref<MovieLearningReport[]>([]);
const activityHistory = ref<LearningActivityEvent[]>([]);
const readingTitles = ref<Record<string, string>>({});
const balanceNow = ref(new Date());
const balanceSince = computed(() => new Date(balanceNow.value.getTime() - 30 * 24 * 60 * 60 * 1_000));
const recentActivityHistory = computed(() => activityHistory.value.filter((event) => {
  const endedAt = Date.parse(event.endedAt);
  return Number.isFinite(endedAt) && endedAt >= balanceSince.value.getTime() && endedAt <= balanceNow.value.getTime() && event.contentId !== 'historic-device-baseline';
}));
const recentActivity = computed(() => summarizeRecentLearningActivity(recentActivityHistory.value, balanceNow.value));
const recentMovieReports = computed(() => movieReports.value.filter((report) => {
  const watchedAt = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(report.watchedAt) ? `${report.watchedAt}T12:00:00` : report.watchedAt);
  return Number.isFinite(watchedAt) && watchedAt >= balanceSince.value.getTime() && watchedAt <= balanceNow.value.getTime();
}));
const recentMovieViewing = computed(() => summarizeMovieViewing(recentMovieReports.value));
const balance = computed(() => calculateLearningBalance({ activity: recentActivity.value, estimatedMovieSeconds: recentMovieViewing.value.estimatedViewingSeconds }));
const latestChange = computed(() => calculateLatestBalanceChange({ activity: recentActivity.value, events: recentActivityHistory.value, movieReports: recentMovieReports.value, estimatedMovieSecondsPerReport: estimatedMovieViewingSeconds, contentTitles: readingTitles.value }));

onMounted(async () => {
  if (!appStore.isHydrated) await appStore.hydrate();
  await Promise.all([refreshActivity(true), refreshMovies(), refreshReadingTitles()]);
  window.addEventListener('mentor-learning-activity-updated', handleActivityUpdated);
  window.addEventListener('mentor-movie-reports-updated', refreshMovies);
});
onBeforeUnmount(() => {
  window.removeEventListener('mentor-learning-activity-updated', handleActivityUpdated);
  window.removeEventListener('mentor-movie-reports-updated', refreshMovies);
});
async function refreshActivity(refreshHistory = false) {
  activityHistory.value = await loadLearningActivityHistory(refreshHistory).catch(() => loadLearningActivityHistory());
}
function handleActivityUpdated() { void refreshActivity(); }
async function refreshMovies() { if (navigator.onLine) await refreshMovieLearningReportsFromCloud().catch(() => 0); movieReports.value = await loadMovieLearningReports(); }
async function refreshReadingTitles() {
  const books = await listPersonalBooks().catch(() => []);
  readingTitles.value = Object.fromEntries(books.map((book) => [book.id, book.title]));
}
function formatDuration(seconds: number) { const minutes = Math.round(Math.max(0, seconds) / 60); if (minutes < 60) return `${minutes} min`; const hours = Math.floor(minutes / 60); const remainder = minutes % 60; return remainder ? `${hours} h ${remainder} min` : `${hours} h`; }
function formatDelta(delta: number) { return delta > 0 ? `+${delta}` : `${delta}`; }
function formatChangeTime(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function changeExplanation(delta: number) { if (delta > 0) return `This moved your balance ${delta} point${delta === 1 ? '' : 's'} closer to the target.`; if (delta < 0) return `This moved the mix ${Math.abs(delta)} point${delta === -1 ? '' : 's'} away from the target.`; return 'This activity was recorded, but the rounded balance score did not change.'; }
</script>
