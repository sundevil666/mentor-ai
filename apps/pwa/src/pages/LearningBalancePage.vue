<template>
  <q-page class="learning-balance-page">
    <section class="learning-balance-shell">
      <header class="learning-balance-hero">
        <div><p>Learning direction</p><h1>Your learning balance</h1><span>See what is moving your English forward and what deserves attention next.</span></div>
        <div class="learning-balance-score" :aria-label="`Learning balance ${balance.balanceScore}%`">
          <q-circular-progress show-value :value="balance.balanceScore" size="92px" :thickness="0.16" color="primary" track-color="grey-3"><strong>{{ balance.balanceScore }}%</strong></q-circular-progress>
          <span>balance</span>
        </div>
      </header>

      <q-card flat bordered class="learning-focus-card">
        <q-card-section>
          <div class="learning-focus-card__icon"><q-icon name="track_changes" /></div>
          <div><span>Best next move</span><h2>Give more attention to {{ balance.primaryFocus.label.toLowerCase() }}</h2><p>It currently provides {{ balance.primaryFocus.impactPercent }}% of your measured learning impact, while a balanced target is about {{ balance.primaryFocus.targetPercent }}%. Your strongest area is {{ balance.strongestArea.label.toLowerCase() }}.</p></div>
          <q-btn color="primary" no-caps rounded unelevated :label="balance.primaryFocus.actionLabel" :to="balance.primaryFocus.route" />
        </q-card-section>
      </q-card>

      <section class="learning-balance-grid" aria-label="Learning activity balance">
        <article v-for="row in balance.rows" :key="row.kind" class="learning-balance-card" :class="`learning-balance-card--${row.status}`">
          <div class="learning-balance-card__heading">
            <div><strong>{{ row.label }}</strong><span>{{ row.description }}</span></div>
            <div class="learning-balance-card__impact"><strong>{{ row.impactPercent }}%</strong><span>of impact</span></div>
          </div>
          <q-linear-progress rounded size="10px" :value="row.estimated ? 0 : Math.min(1, row.impactPercent / Math.max(1, row.targetPercent))" :color="row.status === 'focus' ? 'deep-orange-6' : row.status === 'strong' ? 'secondary' : 'primary'" track-color="grey-3" />
          <div class="learning-balance-card__meta"><span>{{ row.estimated ? `${movieReports.length} saved report${movieReports.length === 1 ? '' : 's'}` : `${formatDuration(row.seconds)} recorded` }}</span><span>{{ row.estimated ? 'Not included in balance' : `Target mix ${row.targetPercent}%` }}</span></div>
          <div class="learning-balance-card__footer">
            <span class="learning-balance-card__status">{{ row.estimated ? 'Actual viewing time is unknown' : row.status === 'focus' ? 'Needs more attention' : row.status === 'strong' ? 'Already a strong area' : 'Close to balance' }}</span>
            <q-btn dense flat color="primary" no-caps :label="row.actionLabel" :to="row.route" />
          </div>
        </article>
      </section>
      <p class="learning-balance-note">Percentages show the share of estimated learning impact, not an exam score. Active speech and checked recall receive more weight than passive input. Movie reports remain visible, but do not affect the balance until actual viewing activity can be measured.</p>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { LearningActivityTotals, MovieLearningReport } from '@mentor-ai/shared';
import { useAppStore } from 'src/stores/app-store';
import { loadLearningActivityTotals } from 'src/services/learning-activity';
import { calculateLearningBalance } from 'src/services/learning-balance';
import { loadMovieLearningReports, refreshMovieLearningReportsFromCloud } from 'src/services/movie-learning-reports';
import { summarizeMovieViewing } from 'src/services/movie-viewing-summary';

const appStore = useAppStore();
const activity = ref<LearningActivityTotals>({ grammarSeconds: 0, listeningSeconds: 0, speakingSeconds: 0, phrasesSeconds: 0, audioSeconds: 0, readingSeconds: 0, vocabularySeconds: 0, totalSeconds: 0, updatedAt: null });
const movieReports = ref<MovieLearningReport[]>([]);
const balance = computed(() => calculateLearningBalance({ activity: activity.value, estimatedMovieSeconds: summarizeMovieViewing(movieReports.value).estimatedViewingSeconds }));

onMounted(async () => {
  if (!appStore.isHydrated) await appStore.hydrate();
  await Promise.all([refreshActivity(), refreshMovies()]);
  window.addEventListener('mentor-learning-activity-updated', refreshActivity);
  window.addEventListener('mentor-movie-reports-updated', refreshMovies);
});
onBeforeUnmount(() => {
  window.removeEventListener('mentor-learning-activity-updated', refreshActivity);
  window.removeEventListener('mentor-movie-reports-updated', refreshMovies);
});
async function refreshActivity() { activity.value = await loadLearningActivityTotals(); }
async function refreshMovies() { if (navigator.onLine) await refreshMovieLearningReportsFromCloud().catch(() => 0); movieReports.value = await loadMovieLearningReports(); }
function formatDuration(seconds: number) { const minutes = Math.round(Math.max(0, seconds) / 60); if (minutes < 60) return `${minutes} min`; const hours = Math.floor(minutes / 60); const remainder = minutes % 60; return remainder ? `${hours} h ${remainder} min` : `${hours} h`; }
</script>
