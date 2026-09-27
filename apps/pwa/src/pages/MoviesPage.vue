<template>
  <q-page class="movies-learning-page">
    <section class="movies-learning-shell">
      <header class="movies-learning-header">
        <p>Learning from films</p>
        <h1>Movies</h1>
      </header>

      <section class="movies-learning-workspace">
        <q-tabs v-model="activeTab" vertical class="movies-learning-tabs" active-color="primary" indicator-color="primary" no-caps>
          <q-tab name="discuss" icon="chat" label="Discuss" />
          <q-tab name="report" icon="assignment_turned_in" label="Send report">
            <q-badge v-if="pendingCount" color="deep-orange-7" floating>{{ pendingCount }}</q-badge>
          </q-tab>
        </q-tabs>

        <q-tab-panels v-model="activeTab" animated class="movies-learning-panels">
        <q-tab-panel name="discuss">
          <section class="movie-chat-layout">
            <q-card flat bordered class="movies-learning-card movie-chat-card">
              <q-card-section class="movie-chat-heading">
                <div><div class="text-h6">Film chat</div><span>Messages stay locally. Only recent context is sent for each answer.</span></div>
                <q-icon :name="appStore.isOnline ? 'wifi' : 'wifi_off'" :color="appStore.isOnline ? 'positive' : 'negative'" size="22px" />
              </q-card-section>
              <div ref="chatScroll" class="movie-chat-messages" aria-live="polite">
                <article v-for="message in chatMessages" :key="message.id" class="movie-chat-message" :class="`movie-chat-message--${message.role}`">
                  <strong>{{ message.role === 'user' ? 'You' : 'Movie coach' }}</strong>
                  <p>{{ message.content }}</p>
                </article>
                <div v-if="!chatMessages.length" class="movies-learning-empty movie-chat-empty">
                  <q-icon name="forum" size="42px" />
                  <strong>Start with a film, mood or learning goal</strong>
                  <span>The coach can recommend films, discuss difficult scenes and prepare the final report.</span>
                </div>
                <div v-if="chatSending" class="movie-chat-thinking"><q-spinner-dots color="primary" size="32px" /> Movie coach is thinking…</div>
              </div>
              <q-card-section class="movie-chat-composer">
                <q-input v-model="chatDraft" outlined autogrow label="Message" maxlength="4000" :disable="chatSending" @keydown.enter.exact.prevent="submitChatMessage" />
                <q-btn color="primary" round icon="send" aria-label="Send message" :disable="!canSendChat" :loading="chatSending" @click="submitChatMessage" />
              </q-card-section>
            </q-card>
          </section>
        </q-tab-panel>

        <q-tab-panel name="report">
          <section class="movies-learning-grid">
            <q-card flat bordered class="movies-learning-card">
              <q-card-section>
                <div class="text-h6">Send the final report</div>
                <p class="text-body2 text-grey-7">Paste the report from the chat. It is saved on this device first, even when the database is unavailable.</p>
              </q-card-section>
              <q-form class="movies-learning-form" @submit.prevent="saveReport">
                <q-input v-model="movieTitle" outlined label="Film or episode" maxlength="160" counter />
                <q-input v-model="watchedAt" outlined label="Date watched" type="date" />
                <q-input v-model="reportText" outlined autogrow label="ChatGPT learning report" hint="Include difficult listening, useful phrases, weak vocabulary and suggested practice." maxlength="20000" counter />
                <q-btn color="primary" icon="save" label="Save report" no-caps type="submit" :disable="!canSave" :loading="saving" />
              </q-form>
            </q-card>

            <section class="movies-learning-history">
              <div class="movies-learning-history__heading">
                <div><span>Report status</span><small>{{ reports.length }} reports · {{ pendingCount }} waiting</small></div>
                <q-btn flat round icon="sync" :disable="!pendingCount || !appStore.isOnline" :loading="syncing" @click="retrySync()"><q-tooltip>Upload waiting reports</q-tooltip></q-btn>
              </div>
              <q-card v-for="report in reports" :key="report.id" flat bordered class="movie-report-card">
                <q-card-section>
                  <div class="movie-report-card__heading">
                    <div><strong>{{ report.movieTitle }}</strong><span>{{ report.watchedAt }}</span></div>
                    <q-chip dense :color="report.synchronizedAt ? 'positive' : 'deep-orange-7'" text-color="white" :icon="report.synchronizedAt ? 'cloud_done' : 'cloud_off'">{{ report.synchronizedAt ? 'Sent to database' : 'Waiting to send' }}</q-chip>
                  </div>
                  <p>{{ report.report }}</p>
                </q-card-section>
              </q-card>
              <div v-if="!reports.length" class="movies-learning-empty"><q-icon name="movie" size="42px" /><strong>No film reports yet</strong><span>Your first saved report will appear here.</span></div>
            </section>
          </section>
        </q-tab-panel>
        </q-tab-panels>
      </section>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import type { MovieLearningReport } from '@mentor-ai/shared';
import { Notify } from 'quasar';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useAppStore } from 'src/stores/app-store';
import { appendMovieChatMessage, loadMovieChatMessages, sendMovieChatMessage, type LocalMovieChatMessage } from 'src/services/movie-chat';
import { loadMovieLearningReports, pendingMovieLearningReportCount, saveMovieLearningReport, syncMovieLearningReports } from 'src/services/movie-learning-reports';

const appStore = useAppStore();
const activeTab = ref<'discuss' | 'report'>('discuss');
const chatDraft = ref('');
const chatMessages = ref<LocalMovieChatMessage[]>([]);
const chatSending = ref(false);
const chatScroll = ref<HTMLElement | null>(null);
const movieTitle = ref('');
const watchedAt = ref(new Date().toISOString().slice(0, 10));
const reportText = ref('');
const reports = ref<MovieLearningReport[]>([]);
const pendingCount = ref(0);
const saving = ref(false);
const syncing = ref(false);
const canSave = computed(() => Boolean(movieTitle.value.trim() && watchedAt.value && reportText.value.trim()));
const canSendChat = computed(() => Boolean(chatDraft.value.trim() && appStore.isOnline && !chatSending.value));

onMounted(async () => {
  chatMessages.value = await loadMovieChatMessages();
  await refreshReports();
  await scrollChatToEnd();
});

async function submitChatMessage() {
  if (!canSendChat.value) return;
  const content = chatDraft.value.trim();
  chatDraft.value = '';
  chatSending.value = true;
  try {
    await appendMovieChatMessage('user', content);
    chatMessages.value = await loadMovieChatMessages();
    await scrollChatToEnd();
    const response = await sendMovieChatMessage(chatMessages.value);
    await appendMovieChatMessage('assistant', response.reply);
    chatMessages.value = await loadMovieChatMessages();
    await scrollChatToEnd();
  } catch (error) {
    Notify.create({ type: 'warning', icon: 'cloud_off', message: error instanceof Error ? error.message : 'Movie chat is unavailable. Your message remains saved locally.' });
  } finally { chatSending.value = false; }
}
async function scrollChatToEnd() {
  await nextTick();
  chatScroll.value?.scrollTo({ top: chatScroll.value.scrollHeight, behavior: 'smooth' });
}
async function refreshReports() {
  [reports.value, pendingCount.value] = await Promise.all([loadMovieLearningReports(), pendingMovieLearningReportCount()]);
}
async function saveReport() {
  if (!canSave.value || saving.value) return;
  saving.value = true;
  try {
    await saveMovieLearningReport({ studentId: appStore.studentId, movieTitle: movieTitle.value, watchedAt: watchedAt.value, report: reportText.value });
    movieTitle.value = '';
    reportText.value = '';
    await refreshReports();
    if (appStore.isOnline) await retrySync(false);
    Notify.create({ type: pendingCount.value ? 'warning' : 'positive', icon: pendingCount.value ? 'cloud_off' : 'cloud_done', message: pendingCount.value ? 'Report saved locally and will be sent later.' : 'Film report sent to the database.' });
  } finally { saving.value = false; }
}
async function retrySync(showResult = true) {
  if (syncing.value || !appStore.isOnline) return;
  syncing.value = true;
  try {
    await syncMovieLearningReports();
    await refreshReports();
    if (showResult) Notify.create({ type: 'positive', icon: 'cloud_done', message: 'Film reports synchronized.' });
  } catch {
    await refreshReports();
    if (showResult) Notify.create({ type: 'warning', icon: 'cloud_off', message: 'Reports remain safely stored on this device.' });
  } finally { syncing.value = false; }
}
</script>

<style scoped>
.movies-learning-page { padding: 18px 24px 120px; }
.movies-learning-shell { margin: 0 auto; max-width: 1180px; }
.movies-learning-header { margin-bottom: 12px; }
.movies-learning-header p { color: var(--app-primary); font-weight: 800; margin: 0 0 4px; text-transform: uppercase; }
.movies-learning-header h1 { font-size: clamp(2rem, 4vw, 3rem); margin: 0; }
.movies-learning-workspace { display: grid; gap: 20px; grid-template-columns: 150px minmax(0, 1fr); }
.movies-learning-tabs { align-self: start; border-right: 1px solid var(--app-border); }
.movies-learning-tabs :deep(.q-tab) { justify-content: flex-start; min-height: 58px; }
.movies-learning-panels { background: transparent; }
.movies-learning-panels :deep(.q-tab-panel) { padding: 0; }
.movie-chat-layout { margin: 0 auto; max-width: 900px; }
.movies-learning-grid { display: grid; gap: 24px; grid-template-columns: minmax(360px, 0.85fr) minmax(420px, 1.15fr); }
.movies-learning-card, .movie-report-card { background: var(--app-surface); border-color: var(--app-border); border-radius: 18px; }
.movies-learning-form { display: grid; gap: 16px; }
.movie-chat-card { display: grid; grid-template-rows: auto minmax(320px, 1fr) auto; min-height: 620px; }
.movie-chat-heading { align-items: center; border-bottom: 1px solid var(--app-border); display: flex; justify-content: space-between; }
.movie-chat-heading span { color: var(--app-muted-strong); font-size: 0.86rem; }
.movie-chat-messages { display: flex; flex-direction: column; gap: 12px; max-height: 520px; overflow-y: auto; padding: 18px; }
.movie-chat-message { border-radius: 16px; max-width: 86%; padding: 12px 15px; }
.movie-chat-message--user { align-self: flex-end; background: var(--app-primary); color: white; }
.movie-chat-message--assistant { align-self: flex-start; background: var(--app-surface-active); border: 1px solid var(--app-border); }
.movie-chat-message p { line-height: 1.55; margin: 5px 0 0; white-space: pre-wrap; }
.movie-chat-thinking { align-items: center; color: var(--app-muted-strong); display: flex; gap: 8px; }
.movie-chat-composer { align-items: flex-end; border-top: 1px solid var(--app-border); display: grid; gap: 10px; grid-template-columns: 1fr auto; }
.movie-chat-empty { margin: auto; }
.movies-learning-form { padding: 0 16px 20px; }
.movies-learning-history { display: grid; gap: 12px; }
.movies-learning-history__heading, .movie-report-card__heading { align-items: center; display: flex; gap: 12px; justify-content: space-between; }
.movies-learning-history__heading > div, .movie-report-card__heading > div { display: grid; gap: 3px; }
.movies-learning-history__heading span, .movie-report-card strong { font-size: 1.05rem; font-weight: 800; }
.movies-learning-history__heading small, .movie-report-card span { color: var(--app-muted-strong); }
.movie-report-card p { line-height: 1.6; margin: 14px 0 0; white-space: pre-wrap; }
.movies-learning-empty { align-items: center; border: 1px dashed var(--app-border-strong); border-radius: 18px; color: var(--app-muted-strong); display: grid; gap: 8px; justify-items: center; padding: 48px 24px; text-align: center; }
</style>
