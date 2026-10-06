<template>
  <q-page class="movies-learning-page" :class="{ 'movies-learning-page--discuss': activeTab === 'discuss', 'movies-learning-page--report': activeTab === 'report' }">
    <section class="movies-learning-shell">
      <header class="movies-learning-header">
        <p>Learning from films</p>
        <h1>Movies</h1>
      </header>

      <section class="movies-learning-workspace">
        <q-tabs v-model="activeTab" vertical class="movies-learning-tabs" active-color="primary" indicator-color="primary" no-caps>
          <q-tab name="discuss" icon="chat" label="Discuss" />
          <q-tab name="memory" icon="psychology" label="Memory" />
          <q-tab name="report" icon="assignment_turned_in" label="Send report">
            <q-badge v-if="pendingCount" color="deep-orange-7" floating>{{ pendingCount }}</q-badge>
          </q-tab>
        </q-tabs>

        <q-tab-panels v-model="activeTab" animated class="movies-learning-panels">
        <q-tab-panel name="discuss">
          <section class="movie-chat-layout">
            <q-card flat bordered class="movies-learning-card movie-chat-card" :style="{ '--movie-chat-font-size': `${chatFontSize}px` }">
              <q-card-section class="movie-chat-heading">
                <div><div class="text-h6">Film chat</div><span>Messages stay locally. Only recent context is sent for each answer.</span></div>
                <div class="movie-chat-heading__actions">
                  <div class="movie-chat-font-controls" role="group" aria-label="Chat text size">
                    <q-btn flat round dense icon="text_decrease" aria-label="Decrease chat text size" :disable="chatFontSize <= minimumChatFontSize" @click="changeChatFontSize(-chatFontSizeStep)">
                      <q-tooltip>Smaller text</q-tooltip>
                    </q-btn>
                    <q-btn flat round dense icon="text_increase" aria-label="Increase chat text size" :disable="chatFontSize >= maximumChatFontSize" @click="changeChatFontSize(chatFontSizeStep)">
                      <q-tooltip>Larger text</q-tooltip>
                    </q-btn>
                  </div>
                  <q-icon :name="appStore.isOnline ? 'wifi' : 'wifi_off'" :color="appStore.isOnline ? 'positive' : 'negative'" size="22px" />
                </div>
              </q-card-section>
              <div ref="chatScroll" class="movie-chat-messages" aria-live="polite">
                <article v-for="message in chatMessages" :key="message.id" class="movie-chat-message" :class="`movie-chat-message--${message.role}`">
                  <strong>{{ message.role === 'user' ? 'You' : 'Movie coach' }}</strong>
                  <div class="movie-chat-message__content">
                    <template v-for="(segment, segmentIndex) in parseMovieChatContent(message.content)" :key="segmentIndex">
                      <p v-if="segment.type === 'text'">{{ segment.content }}</p>
                      <section v-else class="movie-chat-code-block">
                        <header>
                          <span>{{ segment.language || 'Text' }}</span>
                          <q-btn flat dense no-caps icon="content_copy" label="Copy" aria-label="Copy block contents" @click="copyChatBlock(segment.content)" />
                        </header>
                        <pre><code>{{ segment.content }}</code></pre>
                      </section>
                    </template>
                  </div>
                </article>
                <div v-if="!chatMessages.length" class="movies-learning-empty movie-chat-empty">
                  <q-icon name="forum" size="42px" />
                  <strong>Start with a film, mood or learning goal</strong>
                  <span>The coach can recommend films, discuss difficult scenes and prepare the final report.</span>
                </div>
                <div v-if="chatSending" class="movie-chat-thinking"><q-spinner-dots color="primary" size="32px" /> Movie coach is thinking…</div>
                <div v-else-if="hasUnansweredMessage" class="movie-chat-retry">
                  <span>The coach did not answer this message.</span>
                  <q-btn color="primary" flat no-caps icon="refresh" label="Retry unanswered message" :disable="!appStore.isOnline" @click="retryUnansweredMessage" />
                </div>
              </div>
              <q-card-section class="movie-chat-composer">
                <q-input v-model="chatDraft" outlined autogrow label="Message" maxlength="4000" :disable="chatSending" @keydown.enter.exact.prevent="submitChatMessage" />
                <q-btn color="primary" round icon="send" aria-label="Send message" :disable="!canSendChat" :loading="chatSending" @click="submitChatMessage" />
              </q-card-section>
            </q-card>
          </section>
        </q-tab-panel>

        <q-tab-panel name="memory">
          <section class="movie-memory-layout">
            <q-card flat bordered class="movies-learning-card">
              <q-card-section>
                <div class="text-h6">Coach context</div>
                <p class="text-body2 text-grey-7">The stable instruction used for every film conversation.</p>
              </q-card-section>
              <q-card-section class="movie-memory-fields">
                <q-input v-model="coachPrompt" class="movie-coach-prompt-input" outlined type="textarea" label="Coach prompt" hint="This is the main instruction the movie chat always follows." :maxlength="maximumMovieCoachPromptCharacters" counter />
                <div class="movie-memory-actions">
                  <span>Saved on this device and used as the primary instruction for every film-chat request.</span>
                  <q-btn color="primary" no-caps icon="save" label="Save coach prompt" @click="persistCoachPrompt" />
                </div>
                <q-input v-model="userMemory" class="movie-user-memory-input" outlined type="textarea" label="My additional context" hint="This context is placed at the beginning of every film conversation." :maxlength="maximumMovieChatUserMemoryCharacters" counter />
                <div class="movie-memory-actions">
                  <span>Saved on this device and used as the conversation’s starting context.</span>
                  <q-btn color="primary" no-caps icon="save" label="Save my context" @click="persistUserMemory" />
                </div>
              </q-card-section>
            </q-card>

            <q-card flat bordered class="movies-learning-card">
              <q-card-section>
                <div class="text-h6">Learning memory</div>
                <p class="text-body2 text-grey-7">Built from local reports first, then merged with synchronized reports from the database.</p>
              </q-card-section>
              <q-card-section class="movie-memory-fields">
                <q-input :model-value="movieMemory" class="movie-learning-memory-input" outlined readonly type="textarea" label="Shared film context" />
                <span class="movie-memory-status">{{ reports.length }} reports in context · {{ pendingCount }} waiting for database</span>
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
                <q-input v-model="movieTitle" dense outlined label="Film or episode" maxlength="160" counter />
                <q-input v-model="watchedAt" dense outlined label="Date watched" type="date" />
                <q-input v-model="reportText" class="movie-report-input" outlined type="textarea" label="ChatGPT learning report" hint="Include difficult listening, useful phrases, weak vocabulary and suggested practice." maxlength="20000" counter />
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
                    <div class="movie-report-card__identity">
                      <strong>{{ report.movieTitle }}</strong>
                      <span class="movie-report-card__date"><q-icon name="event" />{{ formatMovieDate(report.watchedAt) }}</span>
                    </div>
                    <div class="movie-report-card__actions">
                      <span class="movie-report-status" :class="report.synchronizedAt ? 'movie-report-status--saved' : 'movie-report-status--waiting'">
                        <q-icon :name="report.synchronizedAt ? 'cloud_done' : 'cloud_off'" />
                        {{ report.synchronizedAt ? 'Saved' : 'Waiting to send' }}
                      </span>
                      <q-btn
                        :aria-label="`Delete ${report.movieTitle}`"
                        class="movie-report-delete"
                        color="negative"
                        flat
                        icon="delete_outline"
                        round
                        size="sm"
                        :loading="deletingReportId === report.id"
                        @click="confirmDeleteReport(report)"
                      ><q-tooltip>Delete report</q-tooltip></q-btn>
                    </div>
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
import { copyToClipboard, Dialog, Notify } from 'quasar';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useAppStore } from 'src/stores/app-store';
import { appendMovieChatMessage, loadMovieChatMessages, loadMovieChatUserMemory, loadMovieCoachPrompt, saveMovieChatUserMemory, saveMovieCoachPrompt, sendMovieChatMessage, type LocalMovieChatMessage } from 'src/services/movie-chat';
import { buildMovieChatMemory, maximumMovieChatUserMemoryCharacters, maximumMovieCoachPromptCharacters } from 'src/services/movie-chat-memory';
import { parseMovieChatContent } from 'src/services/movie-chat-content';
import { deleteMovieLearningReport, loadMovieLearningReports, pendingMovieLearningReportCount, refreshMovieLearningReportsFromCloud, saveMovieLearningReport, syncMovieLearningReports } from 'src/services/movie-learning-reports';

const appStore = useAppStore();
type MovieLearningTab = 'discuss' | 'memory' | 'report';
type ChatScrollBehavior = 'auto' | 'smooth';
const movieLearningTabStorageKey = 'mentor-ai:movie-learning-tab:v1';
const movieChatFontSizeStorageKey = 'mentor-ai:movie-chat-font-size:v1';
const minimumChatFontSize = 14;
const maximumChatFontSize = 22;
const chatFontSizeStep = 2;
const movieLearningTabs: MovieLearningTab[] = ['discuss', 'memory', 'report'];
const storedMovieLearningTab = typeof localStorage === 'undefined' ? null : localStorage.getItem(movieLearningTabStorageKey);
const storedMovieChatFontSizeValue = typeof localStorage === 'undefined' ? null : localStorage.getItem(movieChatFontSizeStorageKey);
const storedMovieChatFontSize = storedMovieChatFontSizeValue === null ? Number.NaN : Number(storedMovieChatFontSizeValue);
const activeTab = ref<MovieLearningTab>(movieLearningTabs.includes(storedMovieLearningTab as MovieLearningTab) ? storedMovieLearningTab as MovieLearningTab : 'discuss');
const chatFontSize = ref(Number.isFinite(storedMovieChatFontSize)
  ? Math.min(maximumChatFontSize, Math.max(minimumChatFontSize, storedMovieChatFontSize))
  : 16);
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
const deletingReportId = ref<string | null>(null);
const userMemory = ref('');
const coachPrompt = ref('');
const savedCoachPrompt = ref('');
const canSave = computed(() => Boolean(movieTitle.value.trim() && watchedAt.value && reportText.value.trim()));
const canSendChat = computed(() => Boolean(chatDraft.value.trim() && appStore.isOnline && !chatSending.value));
const hasUnansweredMessage = computed(() => chatMessages.value.at(-1)?.role === 'user');
const movieMemory = computed(() => buildMovieChatMemory(userMemory.value, reports.value));

watch(activeTab, async (tab) => {
  localStorage.setItem(movieLearningTabStorageKey, tab);
  if (tab === 'discuss') await scrollChatToEnd('auto');
});

onMounted(async () => {
  savedCoachPrompt.value = loadMovieCoachPrompt();
  coachPrompt.value = savedCoachPrompt.value;
  userMemory.value = loadMovieChatUserMemory();
  chatMessages.value = await loadMovieChatMessages();
  await refreshReports();
  await scrollChatToEnd();
  if (appStore.isOnline) {
    await refreshMovieLearningReportsFromCloud().then(refreshReports).catch(() => undefined);
  }
});

function persistCoachPrompt() {
  saveMovieCoachPrompt(coachPrompt.value);
  savedCoachPrompt.value = loadMovieCoachPrompt();
  coachPrompt.value = savedCoachPrompt.value;
  Notify.create({ type: 'positive', icon: 'save', message: 'The main movie coach prompt was saved on this device.' });
}

function persistUserMemory() {
  saveMovieChatUserMemory(userMemory.value);
  Notify.create({ type: 'positive', icon: 'save', message: 'Your film-learning context was saved on this device.' });
}

function changeChatFontSize(change: number) {
  chatFontSize.value = Math.min(maximumChatFontSize, Math.max(minimumChatFontSize, chatFontSize.value + change));
  localStorage.setItem(movieChatFontSizeStorageKey, String(chatFontSize.value));
}

async function copyChatBlock(content: string) {
  try {
    await copyToClipboard(content);
    Notify.create({ type: 'positive', icon: 'content_copy', message: 'Block copied.' });
  } catch {
    Notify.create({ type: 'warning', icon: 'error_outline', message: 'Could not copy this block.' });
  }
}

async function submitChatMessage() {
  if (!canSendChat.value) return;
  const content = chatDraft.value.trim();
  chatDraft.value = '';
  try {
    await appendMovieChatMessage('user', content);
    chatMessages.value = await loadMovieChatMessages();
    await scrollChatToEnd();
  } catch (error) {
    Notify.create({ type: 'warning', icon: 'error_outline', message: error instanceof Error ? error.message : 'The message could not be saved.' });
    return;
  }
  await requestChatReply();
}
async function retryUnansweredMessage() {
  if (!hasUnansweredMessage.value || chatSending.value || !appStore.isOnline) return;
  await requestChatReply();
}
async function requestChatReply() {
  chatSending.value = true;
  try {
    const response = await sendMovieChatMessage(chatMessages.value, savedCoachPrompt.value, movieMemory.value);
    await appendMovieChatMessage('assistant', response.reply);
    chatMessages.value = await loadMovieChatMessages();
    await scrollChatToEnd();
  } catch (error) {
    Notify.create({
      type: 'warning',
      icon: 'cloud_off',
      message: `${error instanceof Error ? error.message : 'Movie chat is unavailable.'} Your message is saved; use Retry to send it again.`,
    });
  } finally {
    chatSending.value = false;
    await scrollChatToEnd();
  }
}
async function scrollChatToEnd(behavior: ChatScrollBehavior = 'smooth') {
  await nextTick();
  chatScroll.value?.scrollTo({ top: chatScroll.value.scrollHeight, behavior });
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

function formatMovieDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
function confirmDeleteReport(report: MovieLearningReport) {
  Dialog.create({
    title: 'Delete this report?',
    message: `${report.movieTitle} will be removed from your film history on every device. This cannot be undone.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Delete', color: 'negative', noCaps: true },
  }).onOk(() => { void removeReport(report); });
}
async function removeReport(report: MovieLearningReport) {
  if (deletingReportId.value) return;
  deletingReportId.value = report.id;
  try {
    await deleteMovieLearningReport(report);
    await refreshReports();
    Notify.create({ type: 'positive', icon: 'delete_outline', message: `${report.movieTitle} was removed from your film history.` });
  } catch (error) {
    Notify.create({
      type: 'warning',
      icon: 'cloud_off',
      message: error instanceof Error ? error.message : 'The report could not be deleted.',
    });
  } finally {
    deletingReportId.value = null;
  }
}
</script>

<style scoped>
.movies-learning-page { padding: 18px 24px 120px; }
.movies-learning-page--discuss,
.movies-learning-page--report { box-sizing: border-box; height: calc(100dvh - 50px); overflow: hidden; padding-bottom: 104px; }
.movies-learning-shell { margin: 0 auto; max-width: 1180px; }
.movies-learning-page--discuss .movies-learning-shell { max-width: 1440px; }
.movies-learning-page--discuss .movies-learning-shell,
.movies-learning-page--report .movies-learning-shell { display: flex; flex-direction: column; height: 100%; }
.movies-learning-header { margin-bottom: 12px; }
.movies-learning-header p { color: var(--app-primary); font-weight: 800; margin: 0 0 4px; text-transform: uppercase; }
.movies-learning-header h1 { font-size: clamp(2rem, 4vw, 3rem); margin: 0; }
.movies-learning-workspace { display: grid; gap: 20px; grid-template-columns: 150px minmax(0, 1fr); }
.movies-learning-page--discuss .movies-learning-workspace,
.movies-learning-page--report .movies-learning-workspace { flex: 1; min-height: 0; }
.movies-learning-tabs { align-self: start; border-right: 1px solid var(--app-border); }
.movies-learning-tabs :deep(.q-tab) { justify-content: center; min-height: 58px; }
.movies-learning-tabs :deep(.q-tab__content) { justify-content: center; }
.movies-learning-tabs :deep(.q-tab__icon) { flex: 0 0 24px; width: 24px; }
.movies-learning-panels { background: transparent; }
.movies-learning-page--discuss .movies-learning-panels,
.movies-learning-page--report .movies-learning-panels { min-height: 0; overflow: hidden; }
.movies-learning-page--discuss .movies-learning-panels :deep(.q-panel),
.movies-learning-page--discuss .movies-learning-panels :deep(.q-tab-panel),
.movies-learning-page--report .movies-learning-panels :deep(.q-panel), .movies-learning-page--report .movies-learning-panels :deep(.q-tab-panel) { height: 100%; }
.movies-learning-panels :deep(.q-tab-panel) { padding: 0; }
.movie-chat-layout { height: 100%; margin: 0 auto; max-width: 1200px; min-height: 0; }
.movie-memory-layout { display: grid; gap: 20px; }
.movie-memory-fields { display: grid; gap: 16px; padding-top: 0; }
.movie-coach-prompt-input :deep(.q-field__control), .movie-user-memory-input :deep(.q-field__control) { height: 300px; }
.movie-coach-prompt-input :deep(.q-field__native), .movie-user-memory-input :deep(.q-field__native) { height: 238px; overflow-y: auto; resize: none; scrollbar-color: var(--app-border-strong) transparent; scrollbar-width: thin; }
.movie-coach-prompt-input :deep(.q-field__native::-webkit-scrollbar), .movie-user-memory-input :deep(.q-field__native::-webkit-scrollbar) { width: 8px; }
.movie-coach-prompt-input :deep(.q-field__native::-webkit-scrollbar-thumb), .movie-user-memory-input :deep(.q-field__native::-webkit-scrollbar-thumb) { background: var(--app-border-strong); border: 2px solid transparent; border-radius: 999px; background-clip: padding-box; }
.movie-coach-prompt-input :deep(.q-field__native::-webkit-scrollbar-track), .movie-user-memory-input :deep(.q-field__native::-webkit-scrollbar-track) { background: transparent; }
.movie-learning-memory-input :deep(.q-field__control) { height: 200px; }
.movie-learning-memory-input :deep(.q-field__native) { height: 166px; overflow-y: auto; resize: none; scrollbar-color: var(--app-border-strong) transparent; scrollbar-width: thin; }
.movie-learning-memory-input :deep(.q-field__native::-webkit-scrollbar) { width: 8px; }
.movie-learning-memory-input :deep(.q-field__native::-webkit-scrollbar-thumb) { background: var(--app-border-strong); border: 2px solid transparent; border-radius: 999px; background-clip: padding-box; }
.movie-learning-memory-input :deep(.q-field__native::-webkit-scrollbar-track) { background: transparent; }
.movie-user-memory-input { margin-bottom: 12px; }
.movie-memory-actions { align-items: center; display: grid; gap: 12px 16px; grid-template-columns: minmax(0, 1fr) auto; }
.movie-memory-actions .q-btn { white-space: nowrap; }
.movie-memory-actions span, .movie-memory-status { color: var(--app-muted-strong); font-size: 0.86rem; }
.movies-learning-grid { display: grid; gap: 24px; grid-template-columns: minmax(360px, 0.85fr) minmax(420px, 1.15fr); }
.movies-learning-page--report .movies-learning-grid { height: 100%; min-height: 0; }
.movies-learning-card, .movie-report-card { background: var(--app-surface); border-color: var(--app-border); border-radius: 18px; }
.movies-learning-form { display: grid; gap: 16px; }
.movie-report-input :deep(.q-field__control) { height: 300px; }
.movie-report-input :deep(.q-field__native) { height: 238px; overflow-y: auto; resize: none; scrollbar-color: var(--app-border-strong) transparent; scrollbar-width: thin; }
.movie-report-input :deep(.q-field__native::-webkit-scrollbar) { width: 8px; }
.movie-report-input :deep(.q-field__native::-webkit-scrollbar-thumb) { background: var(--app-border-strong); border: 2px solid transparent; border-radius: 999px; background-clip: padding-box; }
.movie-report-input :deep(.q-field__native::-webkit-scrollbar-track) { background: transparent; }
.movie-chat-card { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; height: 100%; min-height: 0; }
.movie-chat-heading { align-items: center; border-bottom: 1px solid var(--app-border); display: flex; gap: 16px; justify-content: space-between; }
.movie-chat-heading span { color: var(--app-muted-strong); font-size: 0.86rem; }
.movie-chat-heading__actions, .movie-chat-font-controls { align-items: center; display: flex; flex: 0 0 auto; }
.movie-chat-heading__actions { gap: 10px; }
.movie-chat-font-controls { background: var(--app-surface-active); border: 1px solid var(--app-border); border-radius: 999px; padding: 2px; }
.movie-chat-messages { display: flex; flex-direction: column; gap: 12px; min-height: 0; overflow-y: auto; padding: 22px 24px; }
.movie-chat-message { border-radius: 16px; max-width: 86%; padding: 12px 15px; }
.movie-chat-message--user { align-self: flex-end; background: var(--app-primary); color: white; }
.movie-chat-message--assistant { align-self: flex-start; background: var(--app-surface-active); border: 1px solid var(--app-border); }
.movie-chat-message__content { display: grid; gap: 10px; margin-top: 5px; }
.movie-chat-message p { font-size: var(--movie-chat-font-size); line-height: 1.55; margin: 0; white-space: pre-wrap; }
.movie-chat-code-block { background: #17202b; border: 1px solid rgb(255 255 255 / 14%); border-radius: 10px; color: #f5f7fa; min-width: min(560px, 70vw); overflow: hidden; }
.movie-chat-code-block header { align-items: center; background: rgb(255 255 255 / 7%); border-bottom: 1px solid rgb(255 255 255 / 12%); display: flex; justify-content: space-between; padding: 4px 6px 4px 12px; }
.movie-chat-code-block header span { color: #c7d0da; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; }
.movie-chat-code-block header :deep(.q-btn) { color: #f5f7fa; }
.movie-chat-code-block pre { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: var(--movie-chat-font-size); line-height: 1.55; margin: 0; max-width: 100%; overflow-x: auto; padding: 14px; white-space: pre-wrap; word-break: break-word; }
.movie-chat-message--user .movie-chat-code-block { background: rgb(0 0 0 / 28%); }
.movie-chat-thinking { align-items: center; color: var(--app-muted-strong); display: flex; gap: 8px; }
.movie-chat-retry { align-items: center; align-self: flex-end; background: var(--app-surface-active); border: 1px solid var(--app-border); border-radius: 12px; display: flex; gap: 8px; padding: 6px 8px 6px 12px; }
.movie-chat-retry span { color: var(--app-muted-strong); font-size: 0.86rem; }
.movie-chat-composer { align-items: flex-end; border-top: 1px solid var(--app-border); display: grid; gap: 10px; grid-template-columns: 1fr auto; }
.movie-chat-composer :deep(.q-field__native) { font-size: var(--movie-chat-font-size); line-height: 1.55; }
.movie-chat-empty { margin: auto; }
.movies-learning-form { padding: 0 16px 20px; }
.movies-learning-history { align-content: start; display: grid; gap: 14px; grid-auto-rows: max-content; }
.movies-learning-page--report .movies-learning-history { min-height: 0; overflow-y: auto; padding: 0 8px 16px 0; scrollbar-color: var(--app-border-strong) transparent; scrollbar-gutter: stable; scrollbar-width: thin; }
.movies-learning-history::-webkit-scrollbar { width: 8px; }
.movies-learning-history::-webkit-scrollbar-thumb { background: var(--app-border-strong); border: 2px solid transparent; border-radius: 999px; background-clip: padding-box; }
.movies-learning-history::-webkit-scrollbar-track { background: transparent; }
.movies-learning-history__heading, .movie-report-card__heading { align-items: center; display: flex; gap: 12px; justify-content: space-between; }
.movies-learning-history__heading > div { display: grid; gap: 3px; }
.movies-learning-history__heading span, .movie-report-card strong { font-size: 1.05rem; font-weight: 800; }
.movies-learning-history__heading small { color: var(--app-muted-strong); }
.movie-report-card { overflow: hidden; position: relative; transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease; }
.movie-report-card::before { background: color-mix(in srgb, var(--app-primary) 72%, transparent); bottom: 14px; content: ''; left: 0; position: absolute; top: 14px; width: 3px; }
.movie-report-card:hover { border-color: color-mix(in srgb, var(--app-primary) 36%, var(--app-border)); box-shadow: 0 10px 28px rgb(0 0 0 / 8%); transform: translateY(-1px); }
.movie-report-card .q-card__section { padding: 18px 20px 18px 22px; }
.movie-report-card__heading { align-items: flex-start; }
.movie-report-card__identity { display: grid; gap: 5px; min-width: 0; }
.movie-report-card__identity strong { line-height: 1.3; overflow-wrap: anywhere; }
.movie-report-card__date { align-items: center; color: var(--app-muted-strong); display: inline-flex; font-size: 0.82rem; gap: 5px; }
.movie-report-card__date .q-icon { font-size: 1rem; }
.movie-report-card__actions { align-items: center; display: flex; flex: 0 0 auto; gap: 4px; }
.movie-report-status { align-items: center; display: inline-flex; font-size: 0.78rem; font-weight: 700; gap: 5px; white-space: nowrap; }
.movie-report-status .q-icon { font-size: 1.05rem; }
.movie-report-status--saved { color: var(--app-muted-strong); }
.movie-report-status--waiting { background: color-mix(in srgb, #ef6c00 12%, transparent); border-radius: 999px; color: #d45f00; padding: 5px 9px; }
.movie-report-delete { opacity: 0.64; transition: opacity 160ms ease, background-color 160ms ease; }
.movie-report-delete:hover, .movie-report-delete:focus-visible { opacity: 1; }
.movie-report-card p { color: var(--app-text); line-height: 1.62; margin: 15px 0 0; white-space: pre-wrap; }
.movies-learning-empty { align-items: center; border: 1px dashed var(--app-border-strong); border-radius: 18px; color: var(--app-muted-strong); display: grid; gap: 8px; justify-items: center; padding: 48px 24px; text-align: center; }
@media (max-width: 760px) {
  .movie-memory-actions { grid-template-columns: 1fr; }
  .movie-memory-actions .q-btn { justify-self: start; }
  .movie-report-card__heading { align-items: stretch; flex-direction: column; }
  .movie-report-card__actions { justify-content: space-between; }
}
</style>
