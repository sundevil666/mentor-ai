<template>
  <section
    class="home-balance"
    aria-label="Today's learning balance"
    :aria-busy="loading"
  >
    <router-link
      class="home-balance__goal"
      :to="daily.current?.route ?? { name: 'learning-balance' }"
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
        <strong>{{ loading ? 'Loading your goal…' : daily.completed ? 'Today’s goals complete' : daily.current!.label }}</strong>
        <span>{{ loading ? 'Checking your practice' : daily.completed ? 'Well done · come back tomorrow' : `${Math.ceil(daily.current!.remainingSeconds / 60)} min of practice · do this next` }}</span>
      </span>
      <span class="home-balance__queue">
        <span
          v-if="!loading && daily.pending.length > 1"
          :aria-label="`${daily.pending.length - 1} more goals in queue`"
        >
          <q-icon
            name="playlist_play"
            size="22px"
          /><small>+{{ daily.pending.length - 1 }}</small>
          <q-tooltip>{{ daily.pending.slice(1).map(goal => goal.label).join(' · ') }}</q-tooltip>
        </span>
        <q-icon
          v-else-if="!loading && daily.completed"
          name="check_circle"
          color="positive"
          size="24px"
        />
      </span>
    </router-link>
    <router-link
      class="home-balance__meter"
      :to="{ name: 'learning-balance' }"
      aria-label="Open your learning balance"
    >
      <LearningBalanceGauge :score="balance.balanceScore" />
    </router-link>
  </section>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { LearningActivityEvent, MovieLearningReport } from '@mentor-ai/shared';
import LearningBalanceGauge from './LearningBalanceGauge.vue';
import { loadLearningActivityHistory } from 'src/services/learning-activity';
import { calculateDailyBalanceGoals, calculateLearningBalance, summarizeRecentLearningActivity } from 'src/services/learning-balance';
import { loadMovieLearningReports, refreshMovieLearningReportsFromCloud } from 'src/services/movie-learning-reports';
import { summarizeMovieViewing } from 'src/services/movie-viewing-summary';
const events = ref<LearningActivityEvent[]>([]);
const movies = ref<MovieLearningReport[]>([]);
const now = ref(new Date());
const loading = ref(true);
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
.home-balance__skill { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--q-primary) 12%, transparent); color: var(--q-primary); }
.home-balance__skill--active { background: var(--q-primary); color: white; animation: balance-goal-pulse 1.35s ease-in-out infinite; }
.home-balance__copy { display: grid; gap: 5px; overflow-wrap: anywhere; }
.home-balance__copy strong { font-size: 1.1rem; }
.home-balance__copy small, .home-balance__copy > span { color: var(--app-muted-strong); font-size: .95rem; line-height: 1.45; }
.home-balance__queue { width: 40px; height: 40px; display: grid; place-items: center; }
.home-balance__queue > span { display: grid; justify-items: center; }
.home-balance__meter { display: grid; justify-items: center; }
.home-balance__meter :deep(.learning-balance-gauge) { width: 170px; }
.home-balance__meter :deep(.learning-balance-score span) { font-size: .65rem; }
@keyframes balance-goal-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--q-primary) 48%, transparent), 0 4px 12px color-mix(in srgb, var(--q-primary) 30%, transparent); transform: scale(1); }
  50% { box-shadow: 0 0 0 10px color-mix(in srgb, var(--q-primary) 8%, transparent), 0 7px 20px color-mix(in srgb, var(--q-primary) 48%, transparent); transform: scale(1.1); }
}
@media (prefers-reduced-motion: reduce) { .home-balance__skill--active { animation: none; } }
@media (max-width: 600px) {
  .home-balance { grid-template-columns: minmax(0, 1fr) 108px; padding: 12px; gap: 8px; }
  .home-balance__goal { grid-template-columns: 32px minmax(0, 1fr) 26px; gap: 6px; }
  .home-balance__skill { width: 32px; height: 40px; }
  .home-balance__queue { width: 26px; }
  .home-balance__copy strong { font-size: 1.05rem; }
  .home-balance__copy small, .home-balance__copy > span { font-size: .9rem; }
  .home-balance__meter :deep(.learning-balance-gauge) { width: 105px; }
  .home-balance__meter :deep(.learning-balance-score span) { max-width: 108px; text-align: center; }
}
</style>
