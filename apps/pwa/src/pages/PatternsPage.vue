<template>
  <q-page class="patterns-page category-theme--patterns" :class="{ 'patterns-page--detail': detailSelected }">
    <AppDetailLayout class="patterns-shell">
      <template #header>
        <header
          v-if="!detailSelected"
          class="patterns-header"
        >
          <p>English that works as a whole</p><h1>Phrasebook</h1>
        </header>

        <header
          v-else
          class="patterns-detail-header"
        >
          <q-btn
            aria-label="Back to phrasebook"
            class="app-back-button"
            color="primary"
            flat
            icon="arrow_back"
            round
            @click="closeDetail"
          />
          <div>
            <p>{{ selectedPattern ? 'Pattern practice' : 'Expression practice' }}</p>
            <h1>{{ selectedPractice?.title }}</h1>
            <span>{{ selectedPractice?.description }}</span>
          </div>
        </header>
      </template>

      <template v-if="!detailSelected" #navigation>
        <q-tabs
          v-model="activeLibraryTab"
          class="phrasebook-tabs"
          active-color="primary"
          indicator-color="primary"
          align="justify"
          no-caps
        >
          <q-tab name="patterns" icon="view_agenda" label="Patterns" />
          <q-tab name="expressions" icon="forum" label="Expressions" />
        </q-tabs>
      </template>

      <section
        v-if="!detailSelected && activeLibraryTab === 'patterns'"
        class="pattern-library"
        aria-label="Pattern library"
      >
        <button
          v-for="(item, index) in patternLibrary"
          :key="item.id"
          class="pattern-library-card"
          :class="{ 'content-library-card--completed': isPatternCompleted(item.id) }"
          type="button"
          @click="openPattern(item.id)"
        >
          <span class="pattern-library-card__icon"><q-icon :name="isPatternCompleted(item.id) ? 'verified' : 'view_agenda'" /></span>
          <span class="pattern-library-card__body">
            <small v-if="!isPatternCompleted(item.id)">Pattern {{ index + 1 }}</small>
            <span v-else class="content-library-card__completed-label"><q-icon name="check_circle" /> Completed</span>
            <strong>{{ item.title }}</strong>
            <span v-if="!isPatternCompleted(item.id)">{{ item.description }}</span>
            <span class="pattern-library-card__meta">
              {{ item.level }} · About {{ item.estimatedMinutes }} min · {{ item.examples.length }} phrases
            </span>
          </span>
          <q-icon name="chevron_right" />
        </button>
      </section>

      <section
        v-if="!detailSelected && activeLibraryTab === 'expressions'"
        class="pattern-library"
        aria-label="Everyday expression library"
      >
        <button
          class="pattern-library-card"
          :class="{ 'content-library-card--completed': expressionCompleted }"
          type="button"
          @click="openExpressions"
        >
          <span class="pattern-library-card__icon"><q-icon :name="expressionCompleted ? 'verified' : 'forum'" /></span>
          <span class="pattern-library-card__body">
            <small v-if="!expressionCompleted">Expression set 1</small>
            <span v-else class="content-library-card__completed-label"><q-icon name="check_circle" /> Completed</span>
            <strong>{{ expressionPractice.title }}</strong>
            <span v-if="!expressionCompleted">{{ expressionPractice.description }}</span>
            <span class="pattern-library-card__meta">
              {{ expressionPractice.level }} · About {{ expressionPractice.estimatedMinutes }} min · {{ expressionLibrary.length }} phrases
            </span>
          </span>
          <q-icon name="chevron_right" />
        </button>
      </section>

      <article
        v-if="detailSelected"
        class="pattern-card pattern-card--detail"
      >
        <div
          v-if="selectedPattern"
          class="pattern-frame"
          aria-label="Phrase pattern"
        >
          <span>Keep</span><strong>{{ selectedPattern?.prefix }}</strong><span class="pattern-frame__slot">change the action</span><strong>{{ selectedPattern?.suffix }}</strong>
        </div>
        <div v-else class="expression-detail-intro">
          <q-icon name="psychology_alt" />
          <span>Listen to the whole expression and connect it directly with the situation—not with a literal translation.</span>
        </div>
        <section
          class="pattern-playlist"
          aria-label="Phrase practice playlist"
        >
          <div class="pattern-playlist__heading">
            <div>
              <span>Hands-free playlist</span>
              <strong>{{ selectedPractice?.title }} · {{ selectedPractice?.examples.length }} phrases</strong>
              <small>Phrase → 4-second pause to repeat → next phrase</small>
            </div>
            <q-btn
              :aria-label="patternOffline ? 'Remove offline phrase audio' : 'Download phrase audio for offline use'"
              color="primary"
              flat
              :icon="patternOffline ? 'delete_outline' : 'download_for_offline'"
              :loading="playlistPreparing"
              round
              @click="togglePatternOffline"
            >
              <q-tooltip>{{ patternOffline ? 'Remove offline audio' : 'Download all audio for offline use' }}</q-tooltip>
            </q-btn>
          </div>
          <audio
            v-if="playlistUrl"
            ref="playlistAudio"
            :src="playlistUrl"
            controls
            :loop="repeatEnabled"
            preload="metadata"
            @ended="handlePlaylistEnded"
            @pause="isLessonPlaying = false"
            @play="isLessonPlaying = true"
            @loadedmetadata="updatePlaylistProgress"
            @timeupdate="updatePlaylistProgress"
          />
          <q-linear-progress
            v-if="playlistPreparing"
            color="primary"
            rounded
            size="8px"
            :value="playlistProgress"
          />
          <div class="pattern-playlist__actions">
            <q-btn
              class="app-play-button"
              color="blue-7"
              :icon="isLessonPlaying ? 'pause' : 'play_arrow'"
              :label="isLessonPlaying ? 'Pause' : playlistUrl ? 'Play entire loop' : 'Prepare and play'"
              no-caps
              :loading="playlistPreparing"
              @click="togglePlaylist"
            />
          </div>
        </section>
      </article>

      <section
        v-if="selectedPattern"
        class="pattern-examples"
        aria-labelledby="pattern-examples-title"
      >
        <div class="pattern-section-heading">
          <div>
            <span>Build the reflex</span><h2 id="pattern-examples-title">
              Change only the middle
            </h2>
          </div>
          <strong>{{ completedCount }}/{{ selectedPattern?.examples.length }}</strong>
        </div>
        <q-linear-progress
          rounded
          size="8px"
          color="primary"
          :value="progress"
        />
        <article
          v-for="example in selectedPattern?.examples"
          :key="example.id"
          class="pattern-example"
          :class="{ 'pattern-example--done': completedIds.has(example.id) }"
        >
          <button
            class="pattern-example__content"
            type="button"
            @click="toggleAnswer(example.id)"
          >
            <span class="pattern-example__situation">{{ example.situation }}</span>
            <span
              v-if="revealedIds.has(example.id)"
              class="pattern-example__answer"
            >{{ selectedPattern?.prefix }} <mark>{{ example.slotValue }}</mark>{{ selectedPattern?.suffix }}<small>{{ example.translation }}</small></span>
            <span
              v-else
              class="pattern-example__answer"
            >{{ example.phrase }}</span>
          </button>
          <div class="pattern-example__actions">
            <q-btn
              :aria-label="`Listen: ${example.phrase}`"
              color="primary"
              flat
              icon="volume_up"
              round
              :loading="playingId === example.id"
              @click="playExample(example)"
            />
            <q-btn
              :aria-label="completedIds.has(example.id) ? 'Mark as not practiced' : 'Mark as practiced'"
              :color="completedIds.has(example.id) ? 'positive' : 'grey-6'"
              flat
              :icon="completedIds.has(example.id) ? 'check_circle' : 'radio_button_unchecked'"
              round
              @click="toggleCompleted(example.id)"
            />
          </div>
        </article>
      </section>
      <section
        v-if="selectedExpression"
        class="pattern-examples"
        aria-labelledby="expression-examples-title"
      >
        <div class="pattern-section-heading">
          <div>
            <span>Build the reflex</span><h2 id="expression-examples-title">One meaning at a time</h2>
          </div>
          <strong>{{ completedCount }}/{{ expressionLibrary.length }}</strong>
        </div>
        <q-linear-progress rounded size="8px" color="primary" :value="progress" />
        <article
          v-for="expression in expressionLibrary"
          :key="expression.id"
          class="expression-card"
          :class="{ 'expression-card--done': completedIds.has(expression.id) }"
        >
          <div class="expression-card__copy">
            <strong>{{ expression.phrase }}</strong>
            <span class="expression-card__meaning">{{ expression.meaning }}</span>
            <span class="expression-card__situation"><q-icon name="movie" /> {{ expression.situation }}</span>
            <small>{{ expression.insight }}</small>
          </div>
          <div class="expression-card__actions">
            <q-btn :aria-label="`Listen: ${expression.phrase}`" color="primary" flat icon="volume_up" round :loading="playingId === expression.id" @click="playExpression(expression)" />
            <q-btn :aria-label="completedIds.has(expression.id) ? 'Mark as learning' : 'Mark as learned'" :color="completedIds.has(expression.id) ? 'positive' : 'grey-6'" flat :icon="completedIds.has(expression.id) ? 'check_circle' : 'radio_button_unchecked'" round @click="toggleCompleted(expression.id)" />
          </div>
        </article>
      </section>
      <p
        v-if="selectedPattern"
        class="pattern-tip"
      >
        <q-icon name="tips_and_updates" /> <span>Do not memorize separate sentences. Memorize <strong>{{ selectedPattern?.title }}</strong> and put a new action in the middle.</span>
      </p>
      <p v-if="selectedExpression" class="pattern-tip">
        <q-icon name="tips_and_updates" /> <span>Do not memorize a word-for-word translation. Recall the situation first, then the whole English phrase.</span>
      </p>
      <template v-if="detailSelected" #controls>
        <AppAudioDock
          :current-time="playlistCurrentTime"
          :disabled="playlistPreparing"
          :duration="playlistDuration"
          :playback-rate="playbackRate"
          :playing="isLessonPlaying"
          :repeat="repeatEnabled"
          :speed-preference-key="selectedPractice ? `phrasebook:${selectedPractice.id}` : null"
          progress-label="Phrase playlist progress"
          show-repeat
          @seek="seekPlaylist"
          @toggle-playback="togglePlaylist"
          @update:playback-rate="setPlaybackRate"
          @update:repeat="setRepeat"
        />
      </template>
    </AppDetailLayout>
    <q-dialog v-model="showPlaylistUpdateDialog" persistent>
      <q-card>
        <q-card-section>
          <div class="text-h6">Phrase playlist update available</div>
          <p class="q-mb-none q-mt-sm">The downloaded loop is an older version. Update it before playback to get all {{ selectedPractice?.examples.length }} phrases.</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn color="primary" icon="system_update_alt" label="Update lesson" no-caps unelevated :loading="playlistPreparing" @click="updatePlaylist" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { patternLibrary, type PhrasePatternExample } from 'src/services/pattern-library';
import { expressionLibrary, expressionPractice, type EnglishExpression } from 'src/services/expression-library';
import { deleteSpeechBatch, isSpeechBatchCached, preloadSpeechBatch, speakWithPreferredVoice, stopSpeech } from 'src/services/speech-synthesis';
import { deleteOutdatedPatternPlaylists, deletePatternPlaylist, getCachedPatternPlaylist, hasOutdatedPatternPlaylist, preparePatternPlaylist } from 'src/services/pattern-playlist';
import { configurePlaybackAudioSession } from 'src/services/audio-session';
import AppAudioDock from 'src/components/AppAudioDock.vue';
import AppDetailLayout from 'src/components/AppDetailLayout.vue';

const route = useRoute();
const router = useRouter();
const selectedPattern = computed(() => patternLibrary.find((item) => item.id === route.query.pattern));
const selectedExpression = computed(() => route.query.expression === expressionPractice.id ? expressionPractice : undefined);
const selectedPractice = computed(() => selectedPattern.value ?? selectedExpression.value);
const detailSelected = computed(() => Boolean(selectedPractice.value));
const activeLibraryTab = computed({
  get: () => route.query.tab === 'expressions' ? 'expressions' : 'patterns',
  set: (tab: string) => {
    stopSpeech();
    playingId.value = null;
    void router.replace({ name: 'patterns', query: tab === 'expressions' ? { tab: 'expressions' } : {} });
  },
});
const completedIds = ref(new Set<string>());
const completedExpressionIds = ref(readCompletedExpressionIds());
const completedPatternIds = ref(readCompletedPatternIds());
const revealedIds = ref(new Set<string>());
const playingId = ref<string | null>(null);
const isLessonPlaying = ref(false);
const playlistCurrentTime = ref(0);
const playlistDuration = ref(0);
const playlistAudio = ref<HTMLAudioElement | null>(null);
const playlistUrl = ref('');
const playlistOffline = ref(false);
const examplesOffline = ref(false);
const playlistPreparing = ref(false);
const playlistCompleted = ref(0);
const showPlaylistUpdateDialog = ref(false);
const repeatEnabled = ref(true);
const playbackRate = ref(1);
const completedCount = computed(() => completedIds.value.size);
const progress = computed(() => completedCount.value / (selectedPractice.value?.examples.length ?? 1));
const playlistProgress = computed(() => playlistCompleted.value / (selectedPractice.value?.examples.length ?? 1));
const patternOffline = computed(() => playlistOffline.value && examplesOffline.value);
const expressionCompleted = computed(() => completedExpressionIds.value.size === expressionLibrary.length);

watch(selectedPractice, async (nextPractice) => {
  stopPlaylist();
  playlistCurrentTime.value = 0;
  playlistDuration.value = 0;
  stopSpeech();
  revokePlaylistUrl();
  playingId.value = null;
  examplesOffline.value = false;
  revealedIds.value = new Set();
  completedIds.value = nextPractice ? readCompletedIds(nextPractice.id) : new Set();
  repeatEnabled.value = nextPractice
    ? localStorage.getItem(`mentor-ai:pattern-repeat:${nextPractice.id}`) !== 'false'
    : true;
  if (!nextPractice) return;
  const cached = await getCachedPatternPlaylist(nextPractice);
  if (selectedPractice.value?.id === nextPractice.id && cached) setPlaylistBlob(cached);
  const phrasesCached = await isSpeechBatchCached(nextPractice.examples.map((example) => example.phrase));
  if (selectedPractice.value?.id === nextPractice.id) examplesOffline.value = phrasesCached;
  if (selectedPractice.value?.id === nextPractice.id && !cached && await hasOutdatedPatternPlaylist(nextPractice)) {
    showPlaylistUpdateDialog.value = true;
  }
}, { immediate: true });

onBeforeUnmount(() => {
  stopSpeech();
  playlistAudio.value?.pause();
  revokePlaylistUrl();
});

function readCompletedIds(patternId: string) {
  try {
    const storageKey = patternId === expressionPractice.id ? 'mentor-ai:expression-progress' : `mentor-ai:pattern-progress:${patternId}`;
    const value = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as unknown;
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
  } catch { return new Set<string>(); }
}

function readCompletedPatternIds() {
  return new Set(patternLibrary.filter((pattern) => {
    const completed = readCompletedIds(pattern.id);
    return pattern.examples.length > 0 && pattern.examples.every((example) => completed.has(example.id));
  }).map((pattern) => pattern.id));
}

function isPatternCompleted(patternId: string) { return completedPatternIds.value.has(patternId); }

function readCompletedExpressionIds() {
  try {
    const value = JSON.parse(localStorage.getItem('mentor-ai:expression-progress') ?? '[]') as unknown;
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
  } catch { return new Set<string>(); }
}

async function playExpression(expression: EnglishExpression) {
  stopPlaylist(); stopSpeech(); playingId.value = expression.id;
  const started = await speakWithPreferredVoice(expression.phrase, {
    mediaTitle: 'Everyday expressions',
    onEnd: () => { playingId.value = null; },
    onError: showAudioError,
  });
  if (!started) playingId.value = null;
}

function openPattern(id: string) {
  void router.push({ name: 'patterns', query: { pattern: id, tab: 'patterns' } });
}

function openExpressions() {
  void router.push({ name: 'patterns', query: { expression: expressionPractice.id, tab: 'expressions' } });
}

function closeDetail() {
  stopPlaylist();
  stopSpeech();
  playingId.value = null;
  revealedIds.value = new Set();
  void router.push({ name: 'patterns', query: selectedExpression.value ? { tab: 'expressions' } : {} });
}

function toggleAnswer(id: string) {
  const next = new Set(revealedIds.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  revealedIds.value = next;
}

function toggleCompleted(id: string) {
  const practice = selectedPractice.value;
  if (!practice) return;
  const next = new Set(completedIds.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  completedIds.value = next;
  const storageKey = selectedExpression.value ? 'mentor-ai:expression-progress' : `mentor-ai:pattern-progress:${practice.id}`;
  localStorage.setItem(storageKey, JSON.stringify([...next]));
  if (selectedExpression.value) completedExpressionIds.value = next;
  completedPatternIds.value = readCompletedPatternIds();
}

function handlePlaylistEnded() {
  isLessonPlaying.value = false;
  const practice = selectedPractice.value;
  if (!practice) return;
  completedIds.value = new Set(practice.examples.map((example) => example.id));
  const storageKey = selectedExpression.value ? 'mentor-ai:expression-progress' : `mentor-ai:pattern-progress:${practice.id}`;
  localStorage.setItem(storageKey, JSON.stringify([...completedIds.value]));
  if (selectedExpression.value) completedExpressionIds.value = completedIds.value;
  completedPatternIds.value = readCompletedPatternIds();
}

async function playExample(example: PhrasePatternExample) {
  const practice = selectedPractice.value;
  if (!practice) return;
  stopPlaylist(); stopSpeech(); playingId.value = example.id;
  const started = await speakWithPreferredVoice(example.phrase, { mediaTitle: practice.title, onEnd: () => { playingId.value = null; }, onError: showAudioError });
  if (!started) playingId.value = null;
}

async function togglePlaylist() {
  const practice = selectedPractice.value;
  if (!practice) return;
  const player = playlistAudio.value;
  if (player && !player.paused) { player.pause(); return; }
  if (showPlaylistUpdateDialog.value) return;
  stopSpeech();
  playingId.value = null;
  if (!playlistUrl.value && !(await ensurePlaylist())) return;
  await nextTick();
  configurePlaybackAudioSession();
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: practice.title,
      artist: 'Mentor AI',
      album: 'Hands-free pattern practice',
    });
  }
  try { await playlistAudio.value?.play(); } catch { showAudioError(); }
}

async function updatePlaylist() {
  const practice = selectedPractice.value;
  if (!practice || !(await ensurePatternOffline())) return;
  await deleteOutdatedPatternPlaylists(practice);
  showPlaylistUpdateDialog.value = false;
  Notify.create({ type: 'positive', icon: 'offline_pin', message: `${practice.title} and all phrases updated and ready offline.` });
}

async function downloadPlaylist() {
  const practice = selectedPractice.value;
  if (practice && await ensurePatternOffline()) Notify.create({ type: 'positive', icon: 'offline_pin', message: `${practice.title} playlist and all phrases downloaded for offline practice.` });
}

function togglePatternOffline() {
  if (patternOffline.value) void removePlaylist();
  else void downloadPlaylist();
}

async function ensurePatternOffline() {
  const practice = selectedPractice.value;
  if (!practice || !(await ensurePlaylist())) return false;
  if (examplesOffline.value) return true;
  playlistPreparing.value = true;
  playlistCompleted.value = 0;
  try {
    const phrases = practice.examples.map((example) => example.phrase);
    const result = await preloadSpeechBatch(phrases, (completed) => { playlistCompleted.value = completed; });
    examplesOffline.value = result.failed === 0 && await isSpeechBatchCached(phrases);
    if (!examplesOffline.value) throw new Error('Some pattern phrases could not be saved offline.');
    return true;
  } catch {
    showOfflineError();
    return false;
  } finally {
    playlistPreparing.value = false;
  }
}

async function ensurePlaylist() {
  const practice = selectedPractice.value;
  if (!practice) return false;
  if (playlistUrl.value) return true;
  playlistPreparing.value = true;
  playlistCompleted.value = 0;
  try {
    const result = await preparePatternPlaylist(practice, (completed) => { playlistCompleted.value = completed; });
    setPlaylistBlob(result.blob);
    return true;
  } catch { showAudioError(); return false; }
  finally { playlistPreparing.value = false; }
}

async function removePlaylist() {
  const practice = selectedPractice.value;
  if (!practice) return;
  stopPlaylist();
  await deletePatternPlaylist(practice.id);
  await deleteSpeechBatch(practice.examples.map((example) => example.phrase));
  revokePlaylistUrl();
  playlistOffline.value = false;
  examplesOffline.value = false;
  Notify.create({ type: 'positive', message: 'Offline playlist and phrases removed from this device.' });
}

function setPlaylistBlob(blob: Blob) {
  revokePlaylistUrl();
  playlistUrl.value = URL.createObjectURL(blob);
  playlistOffline.value = true;
}

function revokePlaylistUrl() {
  if (playlistUrl.value) URL.revokeObjectURL(playlistUrl.value);
  playlistUrl.value = '';
}

function stopPlaylist() {
  playlistAudio.value?.pause();
  isLessonPlaying.value = false;
}

function updatePlaylistProgress() {
  const player = playlistAudio.value;
  if (!player) return;
  playlistCurrentTime.value = player.currentTime;
  playlistDuration.value = Number.isFinite(player.duration) ? player.duration : 0;
}

function setPlaybackRate(rate: number) {
  playbackRate.value = rate;
  if (playlistAudio.value) playlistAudio.value.playbackRate = rate;
}

function seekPlaylist(value: number | null) {
  if (playlistAudio.value && value !== null) playlistAudio.value.currentTime = value;
}

function setRepeat(value: boolean) {
  repeatEnabled.value = value;
  saveRepeatPreference();
}

function saveRepeatPreference() {
  const practice = selectedPractice.value;
  if (practice) localStorage.setItem(`mentor-ai:pattern-repeat:${practice.id}`, String(repeatEnabled.value));
}

function showAudioError() {
  playingId.value = null; isLessonPlaying.value = false; playlistPreparing.value = false;
  Notify.create({ type: 'negative', icon: 'volume_off', message: 'Could not play this phrase', caption: 'Check the connection and try again.' });
}

function showOfflineError() {
  playlistPreparing.value = false;
  Notify.create({ type: 'negative', icon: 'cloud_off', message: 'Could not download all pattern audio', caption: 'Check the connection and try again.' });
}
</script>
