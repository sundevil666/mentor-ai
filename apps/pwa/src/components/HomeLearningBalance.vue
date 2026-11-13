<template>
  <section
    class="home-balance"
    aria-label="Today's learning balance"
    :aria-busy="loading"
  >
    <button
      type="button"
      class="home-balance__goal"
      :aria-expanded="detailsOpen"
      aria-controls="daily-balance-goals"
      @click="detailsOpen = !detailsOpen"
    >
      <span
        class="home-balance__skill"
        :class="{ 'home-balance__skill--active': !loading && !daily.completed }"
      >
        <q-icon
          :name="loading ? 'hourglass_empty' : daily.completed ? 'task_alt' : icons[daily.current!.kind]"
          size="28px"
        />
      </span>
      <span
        class="home-balance__copy"
        aria-live="polite"
      >
        <small>Today's balance</small>
        <strong>{{ loading ? 'Loading your goal…' : daily.completed ? 'Daily minimum complete' : daily.current!.label }}</strong>
        <span>{{ loading ? 'Checking your practice' : daily.completed ? `Optional next: ${nextRecommendation.label}` : 'Your most important practice today' }}</span>
      </span>
      <span class="home-balance__status">
        <q-icon
          v-if="!loading"
          :name="daily.completed ? 'check_circle' : detailsOpen ? 'expand_less' : 'expand_more'"
          :color="daily.completed ? 'positive' : undefined"
          size="24px"
        />
      </span>
    </button>
    <router-link
      class="home-balance__meter"
      :to="{ name: 'learning-balance' }"
      aria-label="Open your learning balance"
    >
      <LearningBalanceGauge :score="balance.balanceScore" />
    </router-link>
    <div
      v-if="detailsOpen && !loading"
      id="daily-balance-goals"
      class="home-balance__details"
    >
      <div class="home-balance__details-heading">
        <div>
          <strong>Your balance priorities</strong>
          <span>One required minimum · the rest are optional next steps</span>
        </div>
        <router-link :to="{ name: 'learning-balance' }">
          View balance
        </router-link>
      </div>
      <ul class="home-balance__goal-list">
        <li
          class="home-balance__required-goal"
          :class="{ 'is-complete': daily.completed }"
        >
          <q-icon
            :name="daily.completed ? 'check_circle' : 'radio_button_unchecked'"
            :color="daily.completed ? 'positive' : 'primary'"
            size="22px"
          />
          <span><small>Required today · critical priority</small><strong>{{ daily.goals[0]!.label }}</strong></span>
          <router-link
            v-if="!daily.completed"
            :to="daily.goals[0]!.route"
          >
            Start
          </router-link>
          <small v-else>Completed</small>
        </li>
        <li
          v-for="(entry, index) in priorityQueue"
          :key="entry.kind"
          class="home-balance__optional-goal"
        >
          <span class="home-balance__priority-number">{{ index + 1 }}</span>
          <span>
            <small>{{ index === 0 ? 'Best optional next step' : 'Optional priority' }}</small>
            <strong>{{ entry.label }}</strong>
            <small>{{ formatPriorityEvidence(entry) }}</small>
          </span>
          <router-link :to="entry.route">
            Practice
          </router-link>
        </li>
      </ul>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { LearningActivityEvent, MovieLearningReport } from '@mentor-ai/shared';
import LearningBalanceGauge from './LearningBalanceGauge.vue';
import { loadLearningActivityHistory } from 'src/services/learning-activity';
import { calculateDailyBalanceGoals, calculateLearningBalance, summarizeRecentLearningActivity, type LearningBalanceRow } from 'src/services/learning-balance';
import { loadMovieLearningReports, refreshMovieLearningReportsFromCloud } from 'src/services/movie-learning-reports';
import { summarizeMovieViewing } from 'src/services/movie-viewing-summary';
const events = ref<LearningActivityEvent[]>([]);
const movies = ref<MovieLearningReport[]>([]);
const now = ref(new Date());
const loading = ref(true);
const detailsOpen = ref(false);
const icons: Record<string, string> = { speaking: 'mic', listening: 'hearing', vocabulary: 'translate', reading: 'menu_book', grammar: 'school', phrases: 'forum', audio: 'headphones' };
function movieSeconds(before: Date) {
  const since = before.getTime() - 30 * 86400000;
  return summarizeMovieViewing(movies.value.filter(report => {
    const time = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(report.watchedAt) ? `${report.watchedAt}T12:00:00` : report.watchedAt);
    return time >= since && time <= before.getTime();
  })).estimatedViewingSeconds;
}
const balance = computed(() => calculateLearningBalance({ activity: summarizeRecentLearningActivity(events.value, now.value), estimatedMovieSeconds: movieSeconds(now.value) }));
const daily = computed(() => {
  const start = new Date(now.value); start.setHours(0, 0, 0, 0);
  return calculateDailyBalanceGoals(events.value, movieSeconds(new Date(start.getTime() - 1)), now.value);
});
const priorityQueue = computed(() => balance.value.rows
  .filter(row => row.kind !== 'movies' && row.gapPercent > 0 && (daily.value.completed || row.kind !== daily.value.goals[0]!.kind))
  .slice(0, 4));
const nextRecommendation = computed(() => priorityQueue.value[0] ?? balance.value.primaryFocus);
function formatPriorityEvidence(entry: LearningBalanceRow) {
  const duration = entry.seconds < 60 ? '<1 min' : entry.seconds < 3600 ? `${Math.round(entry.seconds / 60)} min` : `${(entry.seconds / 3600).toFixed(1)} h`;
  return `${duration} in 30 days · ${entry.impactPercent}% now / ${entry.targetPercent}% target`;
}
async function refresh() {
  now.value = new Date();
  events.value = await loadLearningActivityHistory().catch(() => events.value);
  movies.value = await loadMovieLearningReports().catch(() => movies.value);
  loading.value = false;
}
async function refreshCloud() {
  await Promise.all([loadLearningActivityHistory(true).catch(() => []), navigator.onLine ? refreshMovieLearningReportsFromCloud().catch(() => 0) : Promise.resolve()]);
  await refresh();
}
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  void refresh().then(refreshCloud);
  timer = setInterval(() => { now.value = new Date(); }, 30000);
  window.addEventListener('mentor-learning-activity-updated', refresh);
  window.addEventListener('mentor-movie-reports-updated', refresh);
  window.addEventListener('focus', refreshCloud);
});
onBeforeUnmount(() => {
  clearInterval(timer);
  window.removeEventListener('mentor-learning-activity-updated', refresh);
  window.removeEventListener('mentor-movie-reports-updated', refresh);
  window.removeEventListener('focus', refreshCloud);
});
</script>
<style scoped lang="scss">
.home-balance { display: grid; grid-template-columns: minmax(0, 1fr) 180px; align-items: center; gap: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid var(--app-border); border-radius: 20px; background: var(--app-surface); }
.home-balance a { color: inherit; text-decoration: none; }
.home-balance__goal { display: grid; grid-template-columns: 48px minmax(0, 1fr) 40px; gap: 12px; align-items: center; min-height: 100px; }
.home-balance__goal { width: 100%; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.home-balance__skill { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--q-primary) 12%, transparent); color: var(--q-primary); }
.home-balance__skill--active { background: var(--q-primary); color: white; animation: balance-goal-pulse 1.35s ease-in-out infinite; }
.home-balance__copy { display: grid; gap: 5px; overflow-wrap: anywhere; }
.home-balance__copy strong { font-size: 1.1rem; }
.home-balance__copy small, .home-balance__copy > span { color: var(--app-muted-strong); font-size: .95rem; line-height: 1.45; }
.home-balance__status { width: 40px; height: 40px; display: grid; place-items: center; }
.home-balance__meter { display: grid; justify-items: center; }
.home-balance__meter :deep(.learning-balance-gauge) { width: 170px; }
.home-balance__meter :deep(.learning-balance-score span) { font-size: .65rem; }
.home-balance__details { grid-column: 1 / -1; padding-top: 16px; border-top: 1px solid var(--app-border); }
.home-balance__details-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
.home-balance__details-heading > div { display: grid; gap: 3px; }
.home-balance__details-heading span { color: var(--app-muted-strong); font-size: .82rem; }
.home-balance__details-heading > a { color: var(--q-primary); font-weight: 600; }
.home-balance__goal-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.home-balance__goal-list li { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: color-mix(in srgb, var(--q-primary) 6%, transparent); }
.home-balance__goal-list li.is-complete { background: color-mix(in srgb, var(--q-positive) 7%, transparent); }
.home-balance__goal-list li > span { display: grid; gap: 2px; }
.home-balance__goal-list small { color: var(--app-muted-strong); }
.home-balance__goal-list a { color: var(--q-primary); font-weight: 700; }
.home-balance__required-goal { border: 1px solid color-mix(in srgb, var(--q-primary) 25%, transparent); }
.home-balance__priority-number { width: 22px; height: 22px; display: grid !important; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--q-primary) 13%, transparent); color: var(--q-primary); font-size: .75rem; font-weight: 800; }
@keyframes balance-goal-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--q-primary) 48%, transparent), 0 4px 12px color-mix(in srgb, var(--q-primary) 30%, transparent); transform: scale(1); }
  50% { box-shadow: 0 0 0 10px color-mix(in srgb, var(--q-primary) 8%, transparent), 0 7px 20px color-mix(in srgb, var(--q-primary) 48%, transparent); transform: scale(1.1); }
}
@media (prefers-reduced-motion: reduce) { .home-balance__skill--active { animation: none; } }
@media (max-width: 600px) {
  .home-balance { grid-template-columns: minmax(0, 1fr) 108px; padding: 12px; gap: 8px; }
  .home-balance__goal { grid-template-columns: 32px minmax(0, 1fr) 26px; gap: 6px; }
  .home-balance__skill { width: 32px; height: 40px; }
  .home-balance__status { width: 26px; }
  .home-balance__copy strong { font-size: 1.05rem; }
  .home-balance__copy small, .home-balance__copy > span { font-size: .9rem; }
  .home-balance__meter :deep(.learning-balance-gauge) { width: 105px; }
  .home-balance__meter :deep(.learning-balance-score span) { max-width: 108px; text-align: center; }
  .home-balance__details-heading { align-items: flex-start; }
  .home-balance__goal-list li { padding: 9px; }
}
</style>
