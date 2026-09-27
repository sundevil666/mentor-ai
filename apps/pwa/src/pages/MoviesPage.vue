<template>
  <q-page class="movies-learning-page">
    <section class="movies-learning-shell">
      <header class="movies-learning-header">
        <div>
          <p>Learning from films</p>
          <h1>Movies</h1>
          <span>Paste the compact report from your ChatGPT conversation. It is saved on this device first.</span>
        </div>
        <q-chip :color="pendingCount ? 'deep-orange-7' : 'positive'" text-color="white" :icon="pendingCount ? 'cloud_off' : 'cloud_done'">
          {{ pendingCount ? `${pendingCount} waiting to upload` : 'Saved and synchronized' }}
        </q-chip>
      </header>

      <section class="movies-learning-grid">
        <q-card flat bordered class="movies-learning-card">
          <q-card-section>
            <div class="text-h6">Add a film report</div>
            <p class="text-body2 text-grey-7">If the database is unavailable, nothing is lost. Use the header Send button later to retry.</p>
          </q-card-section>
          <q-form class="movies-learning-form" @submit.prevent="saveReport">
            <q-input v-model="movieTitle" outlined label="Film or episode" maxlength="160" counter />
            <q-input v-model="watchedAt" outlined label="Date watched" type="date" />
            <q-input
              v-model="reportText"
              outlined
              autogrow
              label="ChatGPT learning report"
              hint="Include difficult listening, useful phrases, weak vocabulary and suggested practice."
              maxlength="20000"
              counter
            />
            <q-btn
              color="primary"
              icon="save"
              label="Save report"
              no-caps
              type="submit"
              :disable="!canSave"
              :loading="saving"
            />
          </q-form>
        </q-card>

        <section class="movies-learning-history">
          <div class="movies-learning-history__heading">
            <div>
              <span>Local learning history</span>
              <small>{{ reports.length }} reports</small>
            </div>
            <q-btn flat round icon="sync" :disable="!pendingCount || !appStore.isOnline" :loading="syncing" @click="retrySync()">
              <q-tooltip>Upload waiting reports</q-tooltip>
            </q-btn>
          </div>
          <q-card v-for="report in reports" :key="report.id" flat bordered class="movie-report-card">
            <q-card-section>
              <div class="movie-report-card__heading">
                <div><strong>{{ report.movieTitle }}</strong><span>{{ report.watchedAt }}</span></div>
                <q-icon :name="report.synchronizedAt ? 'cloud_done' : 'cloud_off'" :color="report.synchronizedAt ? 'positive' : 'deep-orange-7'" size="22px">
                  <q-tooltip>{{ report.synchronizedAt ? 'Stored in the learning database' : 'Saved on this device and waiting to upload' }}</q-tooltip>
                </q-icon>
              </div>
              <p>{{ report.report }}</p>
            </q-card-section>
          </q-card>
          <div v-if="!reports.length" class="movies-learning-empty">
            <q-icon name="movie" size="42px" />
            <strong>No film reports yet</strong>
            <span>Your first saved ChatGPT report will appear here.</span>
          </div>
        </section>
      </section>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import type { MovieLearningReport } from '@mentor-ai/shared';
import { Notify } from 'quasar';
import { computed, onMounted, ref } from 'vue';
import { useAppStore } from 'src/stores/app-store';
import {
  loadMovieLearningReports,
  pendingMovieLearningReportCount,
  saveMovieLearningReport,
  syncMovieLearningReports,
} from 'src/services/movie-learning-reports';

const appStore = useAppStore();
const movieTitle = ref('');
const watchedAt = ref(new Date().toISOString().slice(0, 10));
const reportText = ref('');
const reports = ref<MovieLearningReport[]>([]);
const pendingCount = ref(0);
const saving = ref(false);
const syncing = ref(false);
const canSave = computed(() => Boolean(movieTitle.value.trim() && watchedAt.value && reportText.value.trim()));

onMounted(refresh);

async function refresh() {
  [reports.value, pendingCount.value] = await Promise.all([
    loadMovieLearningReports(),
    pendingMovieLearningReportCount(),
  ]);
}

async function saveReport() {
  if (!canSave.value || saving.value) return;
  saving.value = true;
  try {
    await saveMovieLearningReport({
      studentId: appStore.studentId,
      movieTitle: movieTitle.value,
      watchedAt: watchedAt.value,
      report: reportText.value,
    });
    movieTitle.value = '';
    reportText.value = '';
    await refresh();
    if (appStore.isOnline) await retrySync(false);
    Notify.create({
      type: pendingCount.value ? 'warning' : 'positive',
      icon: pendingCount.value ? 'cloud_off' : 'cloud_done',
      message: pendingCount.value ? 'Report saved on this device. Database upload will retry later.' : 'Film report saved and synchronized.',
    });
  } finally {
    saving.value = false;
  }
}

async function retrySync(showResult = true) {
  if (syncing.value || !appStore.isOnline) return;
  syncing.value = true;
  try {
    await syncMovieLearningReports();
    await refresh();
    if (showResult) Notify.create({ type: 'positive', icon: 'cloud_done', message: 'Film reports synchronized.' });
  } catch {
    await refresh();
    if (showResult) Notify.create({ type: 'warning', icon: 'cloud_off', message: 'Reports remain safely stored on this device.' });
  } finally {
    syncing.value = false;
  }
}
</script>

<style scoped>
.movies-learning-page { padding: 28px 24px 120px; }
.movies-learning-shell { margin: 0 auto; max-width: 1180px; }
.movies-learning-header { align-items: flex-start; display: flex; gap: 24px; justify-content: space-between; margin-bottom: 24px; }
.movies-learning-header p { color: var(--app-primary); font-weight: 800; margin: 0 0 4px; text-transform: uppercase; }
.movies-learning-header h1 { font-size: clamp(2rem, 4vw, 3rem); margin: 0; }
.movies-learning-header span { color: var(--app-muted-strong); display: block; margin-top: 8px; }
.movies-learning-grid { display: grid; gap: 24px; grid-template-columns: minmax(360px, 0.85fr) minmax(420px, 1.15fr); }
.movies-learning-card, .movie-report-card { background: var(--app-surface); border-color: var(--app-border); border-radius: 18px; }
.movies-learning-form { display: grid; gap: 16px; padding: 0 16px 20px; }
.movies-learning-history { display: grid; gap: 12px; }
.movies-learning-history__heading, .movie-report-card__heading { align-items: center; display: flex; justify-content: space-between; }
.movies-learning-history__heading > div, .movie-report-card__heading > div { display: grid; gap: 3px; }
.movies-learning-history__heading span, .movie-report-card strong { font-size: 1.05rem; font-weight: 800; }
.movies-learning-history__heading small, .movie-report-card span { color: var(--app-muted-strong); }
.movie-report-card p { line-height: 1.6; margin: 14px 0 0; white-space: pre-wrap; }
.movies-learning-empty { align-items: center; border: 1px dashed var(--app-border-strong); border-radius: 18px; color: var(--app-muted-strong); display: grid; gap: 8px; justify-items: center; padding: 48px 24px; text-align: center; }
</style>
