<template>
  <q-page class="patterns-page category-theme--patterns" :class="{ 'patterns-page--detail': patternSelected }">
    <section class="patterns-shell">
      <header
        v-if="!patternSelected"
        class="patterns-header"
      >
        <p>Reusable English</p><h1>Patterns</h1>
        <span>Choose one phrase pattern and train it until it becomes automatic.</span>
      </header>

      <section
        v-if="!patternSelected"
        class="pattern-library"
        aria-label="Pattern library"
      >
        <button
          v-for="(item, index) in patternLibrary"
          :key="item.id"
          class="pattern-library-card"
          type="button"
          @click="openPattern(item.id)"
        >
          <span class="pattern-library-card__icon"><q-icon name="view_agenda" /></span>
          <span class="pattern-library-card__body">
            <small>Pattern {{ index + 1 }}</small>
            <strong>{{ item.title }}</strong>
            <span>{{ item.description }}</span>
            <span class="pattern-library-card__meta">
              {{ item.level }} · About {{ item.estimatedMinutes }} min · {{ item.examples.length }} phrases
            </span>
          </span>
          <q-icon name="chevron_right" />
        </button>
      </section>

      <header
        v-else
        class="patterns-detail-header"
      >
        <q-btn
          aria-label="Back to pattern library"
          class="app-back-button"
          color="primary"
          flat
          icon="arrow_back"
          round
          @click="closePattern"
        />
        <div>
          <p>Pattern practice</p>
          <h1>{{ selectedPattern?.title }}</h1>
          <span>{{ selectedPattern?.description }}</span>
        </div>
      </header>

      <article
        v-if="patternSelected"
        class="pattern-card pattern-card--detail"
      >
        <div
          class="pattern-frame"
          aria-label="Phrase pattern"
        >
          <span>Keep</span><strong>{{ selectedPattern?.prefix }}</strong><span class="pattern-frame__slot">change the action</span><strong>{{ selectedPattern?.suffix }}</strong>
        </div>
        <section
          class="pattern-playlist"
          aria-label="Could you practice playlist"
        >
          <div class="pattern-playlist__heading">
            <div>
              <span>Hands-free playlist</span>
              <strong>{{ selectedPattern?.title }} · {{ selectedPattern?.examples.length }} phrases</strong>
              <small>Phrase → 4-second pause to repeat → next phrase</small>
            </div>
            <q-icon
              :name="playlistOffline ? 'offline_pin' : 'cloud_download'"
              size="28px"
            />
          </div>
          <audio
            v-if="playlistUrl"
            ref="playlistAudio"
            :src="playlistUrl"
            controls
            :loop="repeatEnabled"
            preload="metadata"
            @ended="isLessonPlaying = false"
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
            <div class="pattern-playlist__repeat">
              <span><strong>Repeat</strong><small>Play the complete list again</small></span>
              <q-toggle
                v-model="repeatEnabled"
                color="primary"
                icon="repeat"
                aria-label="Repeat playlist"
                @update:model-value="saveRepeatPreference"
              />
            </div>
            <q-btn
              v-if="playlistOffline"
              color="negative"
              flat
              icon="delete_outline"
              label="Remove download"
              no-caps
              @click="removePlaylist"
            />
            <q-btn
              v-else
              color="primary"
              flat
              icon="download_for_offline"
              label="Download offline"
              no-caps
              :loading="playlistPreparing"
              @click="downloadPlaylist"
            />
          </div>
          <span
            v-if="playlistOffline"
            class="pattern-playlist__offline"
          ><q-icon name="check_circle" /> Downloaded. This playlist works without internet.</span>
        </section>
        <AppAudioDock
          :current-time="playlistCurrentTime"
          :disabled="playlistPreparing"
          :duration="playlistDuration"
          :playback-rate="playbackRate"
          :playing="isLessonPlaying"
          :repeat="repeatEnabled"
          progress-label="Pattern playlist progress"
          show-repeat
          @seek="seekPlaylist"
          @toggle-playback="togglePlaylist"
          @update:playback-rate="setPlaybackRate"
          @update:repeat="setRepeat"
        />
      </article>

      <section
        v-if="patternSelected"
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
              class="pattern-example__prompt"
            >Скажи вслух, затем открой ответ</span>
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
      <p
        v-if="patternSelected"
        class="pattern-tip"
      >
        <q-icon name="tips_and_updates" /> <span>Do not memorize separate sentences. Memorize <strong>{{ selectedPattern?.title }}</strong> and put a new action in the middle.</span>
      </p>
    </section>
    <q-dialog v-model="showPlaylistUpdateDialog" persistent>
      <q-card>
        <q-card-section>
          <div class="text-h6">Pattern lesson update available</div>
          <p class="q-mb-none q-mt-sm">The downloaded loop is an older version. Update it before playback to get all {{ selectedPattern?.examples.length }} phrases.</p>
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
import { speakWithPreferredVoice, stopSpeech } from 'src/services/speech-synthesis';
import { deleteOutdatedPatternPlaylists, deletePatternPlaylist, getCachedPatternPlaylist, hasOutdatedPatternPlaylist, preparePatternPlaylist } from 'src/services/pattern-playlist';
import { configurePlaybackAudioSession } from 'src/services/audio-session';
import AppAudioDock from 'src/components/AppAudioDock.vue';

const route = useRoute();
const router = useRouter();
const selectedPattern = computed(() => patternLibrary.find((item) => item.id === route.query.pattern));
const patternSelected = computed(() => Boolean(selectedPattern.value));
const completedIds = ref(new Set<string>());
const revealedIds = ref(new Set<string>());
const playingId = ref<string | null>(null);
const isLessonPlaying = ref(false);
const playlistCurrentTime = ref(0);
const playlistDuration = ref(0);
const playlistAudio = ref<HTMLAudioElement | null>(null);
const playlistUrl = ref('');
const playlistOffline = ref(false);
const playlistPreparing = ref(false);
const playlistCompleted = ref(0);
const showPlaylistUpdateDialog = ref(false);
const repeatEnabled = ref(true);
const playbackRate = ref(1);
const completedCount = computed(() => completedIds.value.size);
const progress = computed(() => completedCount.value / (selectedPattern.value?.examples.length ?? 1));
const playlistProgress = computed(() => playlistCompleted.value / (selectedPattern.value?.examples.length ?? 1));

watch(selectedPattern, async (nextPattern) => {
  stopPlaylist();
  playlistCurrentTime.value = 0;
  playlistDuration.value = 0;
  stopSpeech();
  revokePlaylistUrl();
  playingId.value = null;
  revealedIds.value = new Set();
  completedIds.value = nextPattern ? readCompletedIds(nextPattern.id) : new Set();
  repeatEnabled.value = nextPattern
    ? localStorage.getItem(`mentor-ai:pattern-repeat:${nextPattern.id}`) !== 'false'
    : true;
  if (!nextPattern) return;
  const cached = await getCachedPatternPlaylist(nextPattern);
  if (selectedPattern.value?.id === nextPattern.id && cached) setPlaylistBlob(cached);
  if (selectedPattern.value?.id === nextPattern.id && !cached && await hasOutdatedPatternPlaylist(nextPattern)) {
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
    const value = JSON.parse(localStorage.getItem(`mentor-ai:pattern-progress:${patternId}`) ?? '[]') as unknown;
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
  } catch { return new Set<string>(); }
}

function openPattern(id: string) {
  void router.push({ name: 'patterns', query: { pattern: id } });
}

function closePattern() {
  stopPlaylist();
  stopSpeech();
  playingId.value = null;
  revealedIds.value = new Set();
  void router.push({ name: 'patterns' });
}

function toggleAnswer(id: string) {
  const next = new Set(revealedIds.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  revealedIds.value = next;
}

function toggleCompleted(id: string) {
  const pattern = selectedPattern.value;
  if (!pattern) return;
  const next = new Set(completedIds.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  completedIds.value = next;
  localStorage.setItem(`mentor-ai:pattern-progress:${pattern.id}`, JSON.stringify([...next]));
}

async function playExample(example: PhrasePatternExample) {
  const pattern = selectedPattern.value;
  if (!pattern) return;
  stopPlaylist(); stopSpeech(); playingId.value = example.id;
  const started = await speakWithPreferredVoice(example.phrase, { mediaTitle: pattern.title, onEnd: () => { playingId.value = null; }, onError: showAudioError });
  if (!started) playingId.value = null;
}

async function togglePlaylist() {
  const pattern = selectedPattern.value;
  if (!pattern) return;
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
      title: `Pattern: ${pattern.title}`,
      artist: 'Mentor AI',
      album: 'Hands-free pattern practice',
    });
  }
  try { await playlistAudio.value?.play(); } catch { showAudioError(); }
}

async function updatePlaylist() {
  const pattern = selectedPattern.value;
  if (!pattern || !(await ensurePlaylist())) return;
  await deleteOutdatedPatternPlaylists(pattern);
  showPlaylistUpdateDialog.value = false;
  Notify.create({ type: 'positive', icon: 'offline_pin', message: `${pattern.title} updated and ready offline.` });
}

async function downloadPlaylist() {
  const pattern = selectedPattern.value;
  if (pattern && await ensurePlaylist()) Notify.create({ type: 'positive', icon: 'offline_pin', message: `${pattern.title} playlist downloaded for offline practice.` });
}

async function ensurePlaylist() {
  const pattern = selectedPattern.value;
  if (!pattern) return false;
  if (playlistUrl.value) return true;
  playlistPreparing.value = true;
  playlistCompleted.value = 0;
  try {
    const result = await preparePatternPlaylist(pattern, (completed) => { playlistCompleted.value = completed; });
    setPlaylistBlob(result.blob);
    return true;
  } catch { showAudioError(); return false; }
  finally { playlistPreparing.value = false; }
}

async function removePlaylist() {
  const pattern = selectedPattern.value;
  if (!pattern) return;
  stopPlaylist();
  await deletePatternPlaylist(pattern.id);
  revokePlaylistUrl();
  playlistOffline.value = false;
  Notify.create({ type: 'positive', message: 'Offline playlist removed from this device.' });
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
  const pattern = selectedPattern.value;
  if (pattern) localStorage.setItem(`mentor-ai:pattern-repeat:${pattern.id}`, String(repeatEnabled.value));
}

function showAudioError() {
  playingId.value = null; isLessonPlaying.value = false; playlistPreparing.value = false;
  Notify.create({ type: 'negative', icon: 'volume_off', message: 'Could not play this phrase', caption: 'Check the connection and try again.' });
}
</script>
