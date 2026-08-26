<template>
  <q-page class="audio-page" :class="{ 'audio-page--detail': selectedAudio }">
    <section class="audio-shell">
      <header class="audio-header" :class="{ 'audio-header--detail': selectedAudio }">
        <q-btn
          v-if="selectedAudio"
          aria-label="Back to audio library"
          color="primary"
          flat
          icon="arrow_back"
          round
          @click="closeAudio"
        />
        <div>
          <p>{{ selectedAudio ? 'Audio lesson' : 'Long listening' }}</p>
          <h1>{{ selectedAudio?.title ?? 'Audio' }}</h1>
          <span v-if="!selectedAudio">Complete 30-minute programs in clear, slower American English.</span>
        </div>
      </header>

      <section v-if="!selectedAudio" class="audio-library" aria-label="Audio lesson library">
        <article v-for="item in audioLibrary" :key="item.id" class="audio-card">
          <button class="audio-card__main" type="button" @click="selectAudio(item)">
            <q-icon name="chevron_right" />
            <span><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span>
          </button>
          <div class="audio-card__meta">
            <span><q-icon name="school" /> {{ item.level }}</span>
            <span><q-icon name="schedule" /> {{ formatAudioDuration(item.durationSeconds) }}</span>
            <span><q-icon name="storage" /> {{ formatAudioSize(item.sizeBytes) }}</span>
            <q-btn v-if="cachedUrls.has(item.sourceUrl)" :aria-label="`Delete ${item.title} from offline storage`" color="negative" flat icon="delete_outline" round :loading="busyId === item.id" @click="removeAudio(item)" />
            <q-btn v-else :aria-label="`Save ${item.title} offline`" color="primary" flat icon="download_for_offline" round :disable="!isOnline" :loading="busyId === item.id" @click="downloadAudio(item)" />
          </div>
          <ContentMentorFeedback category="audio" :content-id="item.id" />
        </article>
      </section>

      <article v-else class="audio-detail" aria-label="Audio lesson">
        <div class="audio-detail__summary">
          <div class="audio-detail__icon"><q-icon name="headphones" /></div>
          <p>{{ selectedAudio.description }}</p>
          <div class="audio-card__meta audio-detail__meta">
            <span><q-icon name="school" /> {{ selectedAudio.level }}</span>
            <span><q-icon name="schedule" /> {{ formatAudioDuration(selectedAudio.durationSeconds) }}</span>
            <span><q-icon name="storage" /> {{ formatAudioSize(selectedAudio.sizeBytes) }}</span>
            <span><q-icon :name="playbackIsOffline ? 'offline_pin' : 'cloud_queue'" /> {{ playbackIsOffline ? 'Available offline' : 'Streaming' }}</span>
          </div>
          <ContentMentorFeedback category="audio" :content-id="selectedAudio.id" />
        </div>

        <section class="audio-player" aria-label="Audio player">
          <audio ref="audioElement" :src="playbackUrl" controls :loop="repeatEnabled" preload="metadata" @ended="handleEnded" @pause="handlePause" @play="handlePlay" @seeking="handleSeeking" @timeupdate="saveProgress" />
          <div class="audio-player__settings">
            <div>
              <strong>Playback speed</strong>
              <div class="audio-speed-controls" aria-label="Playback speed"><q-btn v-for="rate in playbackRates" :key="rate" :label="`${rate}×`" :color="playbackRate === rate ? 'primary' : undefined" :outline="playbackRate !== rate" no-caps @click="setPlaybackRate(rate)" /></div>
            </div>
            <div class="audio-repeat-setting">
              <div><strong>Repeat</strong><span>{{ repeatEnabled ? 'Start again automatically' : 'Stop at the end' }}</span></div>
              <q-toggle v-model="repeatEnabled" color="primary" icon="repeat" aria-label="Repeat audio" @update:model-value="saveRepeatPreference" />
            </div>
          </div>
          <div class="audio-player__actions">
            <a :href="selectedAudio.articleUrl" target="_blank" rel="noopener">Transcript and source <q-icon name="open_in_new" /></a>
          </div>
        </section>
        <div class="audio-detail__offline-action">
          <q-btn v-if="cachedUrls.has(selectedAudio.sourceUrl)" color="negative" flat icon="delete_outline" label="Remove offline copy" no-caps :loading="busyId === selectedAudio.id" @click="removeAudio(selectedAudio)" />
          <q-btn v-else color="primary" icon="download_for_offline" label="Save offline" no-caps :disable="!isOnline" :loading="busyId === selectedAudio.id" @click="downloadAudio(selectedAudio)" />
        </div>
      </article>

      <p class="audio-credit">Audio and program descriptions: VOA Learning English, public domain. Offline copies stay on this device.</p>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { audioLibrary, deleteOfflineAudio, formatAudioDuration, formatAudioSize, getCachedAudioUrls, resolveAudioPlaybackUrl, saveAudioOffline, type LibraryAudio } from 'src/services/audio-library';
import { forgetOfflineLesson, markOfflineLessonOpened, registerOfflineAudio } from 'src/services/offline-library';
import ContentMentorFeedback from 'src/components/ContentMentorFeedback.vue';
import { recordContentEngagement, syncContentEngagement } from 'src/services/content-engagement';
import { useAppStore } from 'src/stores/app-store';

const appStore = useAppStore();
const audioElement = ref<HTMLAudioElement | null>(null);
const selectedAudio = ref<LibraryAudio | null>(null);
const cachedUrls = ref<Set<string>>(new Set());
const busyId = ref<string | null>(null);
const playbackUrl = ref('');
const playbackIsOffline = ref(false);
const playbackRate = ref(1);
const playbackRates = [0.75, 1, 1.25];
const repeatEnabled = ref(false);
const isPlaying = ref(false);
const isOnline = ref(navigator.onLine);
let playbackCycleActive = false;
let playbackCycleStart = 0;
let playbackCycleHadForwardSeek = false;
let playbackCycleFinished = false;
let lastObservedPlaybackPosition = 0;

onMounted(async () => {
  cachedUrls.value = await getCachedAudioUrls();
  window.addEventListener('online', updateOnlineState);
  window.addEventListener('offline', updateOnlineState);
  configureMediaSession();
  void syncContentEngagement().catch(() => undefined);
});

onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnlineState);
  window.removeEventListener('offline', updateOnlineState);
});

async function selectAudio(item: LibraryAudio) {
  selectedAudio.value = item;
  markOfflineLessonOpened(item.id, 'audio');
  const playback = await resolveAudioPlaybackUrl(item);
  playbackUrl.value = playback.url;
  playbackIsOffline.value = playback.offline;
  if (playback.offline && !cachedUrls.value.has(item.sourceUrl)) {
    cachedUrls.value = new Set([...cachedUrls.value, item.sourceUrl]);
    registerOfflineAudio(item);
  }
  repeatEnabled.value = readRepeatPreference(item.id);
  await nextTick();
  const player = audioElement.value;
  if (!player) return;
  player.currentTime = readProgress(item.id);
  player.playbackRate = playbackRate.value;
  updateMediaMetadata(item);
}

function closeAudio() {
  audioElement.value?.pause();
  selectedAudio.value = null;
  playbackUrl.value = '';
  isPlaying.value = false;
  playbackCycleActive = false;
  playbackCycleFinished = false;
}

async function downloadAudio(item: LibraryAudio) {
  busyId.value = item.id;
  try {
    await saveAudioOffline(item);
    registerOfflineAudio(item);
    cachedUrls.value = await getCachedAudioUrls();
    Notify.create({ type: 'positive', icon: 'offline_pin', message: `${item.title} is available offline.` });
  } catch {
    Notify.create({ type: 'negative', icon: 'cloud_off', message: 'Could not save this audio.', caption: 'Check the connection and available storage.' });
  } finally { busyId.value = null; }
}

async function removeAudio(item: LibraryAudio) {
  busyId.value = item.id;
  await deleteOfflineAudio(item);
  forgetOfflineLesson(item.id, 'audio');
  cachedUrls.value = await getCachedAudioUrls();
  busyId.value = null;
  Notify.create({ type: 'positive', message: `${item.title} removed from this device.` });
}

function setPlaybackRate(rate: number) { playbackRate.value = rate; if (audioElement.value) audioElement.value.playbackRate = rate; }
function saveRepeatPreference() { const item = selectedAudio.value; if (item) localStorage.setItem(`mentor-ai:audio-repeat:${item.id}`, String(repeatEnabled.value)); }
function readRepeatPreference(id: string) { return localStorage.getItem(`mentor-ai:audio-repeat:${id}`) === 'true'; }
function saveProgress() {
  const player = audioElement.value;
  const item = selectedAudio.value;
  if (!player || !item || !Number.isFinite(player.currentTime)) return;
  localStorage.setItem(`mentor-ai:audio-progress:${item.id}`, String(Math.floor(player.currentTime)));
  observePlaybackCycle(player);
  if ('mediaSession' in navigator && Number.isFinite(player.duration) && player.duration > 0) navigator.mediaSession.setPositionState({ duration: player.duration, playbackRate: player.playbackRate, position: Math.min(player.currentTime, player.duration) });
}
function readProgress(id: string) { const saved = Number(localStorage.getItem(`mentor-ai:audio-progress:${id}`)); return Number.isFinite(saved) && saved > 0 ? saved : 0; }
function handlePlay() {
  isPlaying.value = true;
  setMediaSessionPlaybackState('playing');
  if (playbackCycleActive || !selectedAudio.value) return;
  playbackCycleActive = true;
  playbackCycleStart = audioElement.value?.currentTime ?? 0;
  lastObservedPlaybackPosition = playbackCycleStart;
  playbackCycleHadForwardSeek = false;
  playbackCycleFinished = false;
  void recordAudioEngagement('started');
}
function handlePause() {
  isPlaying.value = false;
  setMediaSessionPlaybackState('paused');
}
function handleSeeking() {
  const position = audioElement.value?.currentTime ?? 0;
  if (position > lastObservedPlaybackPosition + 2) playbackCycleHadForwardSeek = true;
}
function observePlaybackCycle(player: HTMLAudioElement) {
  if (playbackCycleFinished && player.currentTime < 2) {
    playbackCycleActive = false;
    handlePlay();
  }
  lastObservedPlaybackPosition = player.currentTime;
  if (Number.isFinite(player.duration) && player.duration > 0 && player.currentTime >= player.duration - 1) completePlaybackCycle();
}
function completePlaybackCycle() {
  if (!playbackCycleActive || playbackCycleFinished) return;
  playbackCycleFinished = true;
  void recordAudioEngagement('finished');
  if (playbackCycleStart <= 2 && !playbackCycleHadForwardSeek) void recordAudioEngagement('full-play');
}
function handleEnded() {
  const item = selectedAudio.value;
  completePlaybackCycle();
  if (item) localStorage.removeItem(`mentor-ai:audio-progress:${item.id}`);
  isPlaying.value = false;
}
function recordAudioEngagement(type: 'started' | 'finished' | 'full-play') {
  if (!selectedAudio.value) return Promise.resolve();
  return recordContentEngagement({
    studentId: appStore.studentId,
    category: 'audio',
    contentId: selectedAudio.value.id,
    type,
  });
}
function configureMediaSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.setActionHandler('play', () => { void resumeAudioFromMediaSession(); });
  navigator.mediaSession.setActionHandler('pause', () => {
    audioElement.value?.pause();
    setMediaSessionPlaybackState('paused');
  });
  navigator.mediaSession.setActionHandler('seekbackward', (details) => seekBy(-(details.seekOffset ?? 15)));
  navigator.mediaSession.setActionHandler('seekforward', (details) => seekBy(details.seekOffset ?? 15));
}
async function resumeAudioFromMediaSession() {
  const player = audioElement.value;
  if (!player) return;
  try {
    await player.play();
    setMediaSessionPlaybackState('playing');
  } catch {
    setMediaSessionPlaybackState('paused');
  }
}
function setMediaSessionPlaybackState(state: 'none' | 'paused' | 'playing') {
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = state;
}
function updateMediaMetadata(item: LibraryAudio) { if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: item.title, artist: 'VOA Learning English', album: 'Mentor AI · Audio' }); }
function seekBy(seconds: number) { const player = audioElement.value; if (player) player.currentTime = Math.max(0, Math.min(player.duration || Number.MAX_SAFE_INTEGER, player.currentTime + seconds)); }
function updateOnlineState() { isOnline.value = navigator.onLine; }
</script>
