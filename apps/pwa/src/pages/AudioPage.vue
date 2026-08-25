<template>
  <q-page class="audio-page">
    <section class="audio-shell">
      <header class="audio-header">
        <div><p>Long listening</p><h1>Audio</h1><span>Complete 30-minute programs in clear, slower American English.</span></div>
      </header>

      <section class="audio-library" aria-label="Audio lesson library">
        <article v-for="item in audioLibrary" :key="item.id" class="audio-card">
          <button class="audio-card__main" type="button" @click="selectAudio(item)">
            <q-icon :name="selectedAudio?.id === item.id && isPlaying ? 'graphic_eq' : 'play_circle'" />
            <span><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span>
          </button>
          <div class="audio-card__meta">
            <span><q-icon name="school" /> {{ item.level }}</span>
            <span><q-icon name="schedule" /> {{ formatAudioDuration(item.durationSeconds) }}</span>
            <span><q-icon name="storage" /> {{ formatAudioSize(item.sizeBytes) }}</span>
            <q-btn v-if="cachedUrls.has(item.sourceUrl)" :aria-label="`Delete ${item.title} from offline storage`" color="negative" flat icon="delete_outline" round :loading="busyId === item.id" @click="removeAudio(item)" />
            <q-btn v-else :aria-label="`Save ${item.title} offline`" color="primary" flat icon="download_for_offline" round :disable="!isOnline" :loading="busyId === item.id" @click="downloadAudio(item)" />
          </div>
        </article>
      </section>

      <section v-if="selectedAudio" class="audio-player" aria-label="Audio player">
        <div class="audio-player__title">
          <q-icon name="headphones" />
          <div><strong>{{ selectedAudio.title }}</strong><span>{{ playbackIsOffline ? 'Playing offline copy' : 'Streaming from VOA' }}</span></div>
        </div>
        <audio ref="audioElement" :src="playbackUrl" controls preload="metadata" @ended="handleEnded" @pause="isPlaying = false" @play="isPlaying = true" @timeupdate="saveProgress" />
        <div class="audio-player__actions">
          <div aria-label="Playback speed"><q-btn v-for="rate in playbackRates" :key="rate" :label="`${rate}×`" :color="playbackRate === rate ? 'primary' : undefined" :outline="playbackRate !== rate" no-caps @click="setPlaybackRate(rate)" /></div>
          <a :href="selectedAudio.articleUrl" target="_blank" rel="noopener">Transcript and source <q-icon name="open_in_new" /></a>
        </div>
      </section>

      <p class="audio-credit">Audio and program descriptions: VOA Learning English, public domain. Offline copies stay on this device.</p>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { audioLibrary, deleteOfflineAudio, formatAudioDuration, formatAudioSize, getCachedAudioUrls, resolveAudioPlaybackUrl, saveAudioOffline, type LibraryAudio } from 'src/services/audio-library';
import { forgetOfflineLesson, markOfflineLessonOpened, registerOfflineAudio } from 'src/services/offline-library';

const audioElement = ref<HTMLAudioElement | null>(null);
const selectedAudio = ref<LibraryAudio | null>(null);
const cachedUrls = ref<Set<string>>(new Set());
const busyId = ref<string | null>(null);
const playbackUrl = ref('');
const playbackIsOffline = ref(false);
const playbackRate = ref(1);
const playbackRates = [0.75, 1, 1.25];
const isPlaying = ref(false);
const isOnline = ref(navigator.onLine);
let objectUrl: string | null = null;

onMounted(async () => {
  cachedUrls.value = await getCachedAudioUrls();
  window.addEventListener('online', updateOnlineState);
  window.addEventListener('offline', updateOnlineState);
  configureMediaSession();
});

onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnlineState);
  window.removeEventListener('offline', updateOnlineState);
  if (objectUrl) URL.revokeObjectURL(objectUrl);
});

async function selectAudio(item: LibraryAudio) {
  if (selectedAudio.value?.id === item.id) {
    if (audioElement.value?.paused) await audioElement.value.play();
    else audioElement.value?.pause();
    return;
  }
  selectedAudio.value = item;
  markOfflineLessonOpened(item.id, 'audio');
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  const playback = await resolveAudioPlaybackUrl(item);
  objectUrl = playback.offline ? playback.url : null;
  playbackUrl.value = playback.url;
  playbackIsOffline.value = playback.offline;
  await nextTick();
  const player = audioElement.value;
  if (!player) return;
  player.currentTime = readProgress(item.id);
  player.playbackRate = playbackRate.value;
  updateMediaMetadata(item);
  try { await player.play(); } catch { /* Native controls remain available when autoplay is blocked. */ }
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
function saveProgress() {
  const player = audioElement.value;
  const item = selectedAudio.value;
  if (!player || !item || !Number.isFinite(player.currentTime)) return;
  localStorage.setItem(`mentor-ai:audio-progress:${item.id}`, String(Math.floor(player.currentTime)));
  if ('mediaSession' in navigator && Number.isFinite(player.duration) && player.duration > 0) navigator.mediaSession.setPositionState({ duration: player.duration, playbackRate: player.playbackRate, position: Math.min(player.currentTime, player.duration) });
}
function readProgress(id: string) { const saved = Number(localStorage.getItem(`mentor-ai:audio-progress:${id}`)); return Number.isFinite(saved) && saved > 0 ? saved : 0; }
function handleEnded() { const item = selectedAudio.value; if (item) localStorage.removeItem(`mentor-ai:audio-progress:${item.id}`); isPlaying.value = false; }
function configureMediaSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.setActionHandler('play', () => { void audioElement.value?.play(); });
  navigator.mediaSession.setActionHandler('pause', () => audioElement.value?.pause());
  navigator.mediaSession.setActionHandler('seekbackward', (details) => seekBy(-(details.seekOffset ?? 15)));
  navigator.mediaSession.setActionHandler('seekforward', (details) => seekBy(details.seekOffset ?? 15));
}
function updateMediaMetadata(item: LibraryAudio) { if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: item.title, artist: 'VOA Learning English', album: 'Mentor AI · Audio' }); }
function seekBy(seconds: number) { const player = audioElement.value; if (player) player.currentTime = Math.max(0, Math.min(player.duration || Number.MAX_SAFE_INTEGER, player.currentTime + seconds)); }
function updateOnlineState() { isOnline.value = navigator.onLine; }
</script>
