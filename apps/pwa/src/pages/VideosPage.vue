<template>
  <q-page class="videos-page">
    <section class="videos-shell">
      <header class="videos-header">
        <div>
          <p>Real English</p>
          <h1>Videos</h1>
        </div>
      </header>

      <section
        class="video-library"
        aria-label="Video library"
      >
        <article
          v-for="video in videoLibrary"
          :key="video.id"
          class="video-card"
        >
          <video
            v-if="selectedVideoId === video.id"
            ref="activeVideoElement"
            class="video-card__player"
            :src="video.sourceUrl"
            controls
            :loop="activeRepeat"
            playsinline
            preload="metadata"
            @loadedmetadata="restoreVideoPosition(video)"
            @pause="handleVideoPause"
            @play="handleVideoPlay"
            @seeked="synchronizeAudioToVideo"
          />
          <audio
            v-if="selectedVideoId === video.id"
            ref="backgroundAudioElement"
            :src="video.sourceUrl"
            :loop="activeRepeat"
            preload="metadata"
            @ended="handleBackgroundAudioEnded"
            @timeupdate="synchronizeVideoToAudio"
          />
          <div
            v-if="selectedVideoId === video.id"
            class="video-playback-settings"
          >
            <q-toggle
              :model-value="activeRepeat"
              color="primary"
              icon="repeat"
              label="Repeat video"
              left-label
              @update:model-value="setVideoRepeat"
            />
            <div
              class="video-speed-controls"
              aria-label="Playback speed"
            >
              <span>Speed</span>
              <q-btn
                v-for="rate in videoPlaybackRates"
                :key="rate"
                :color="activePlaybackRate === rate ? 'primary' : undefined"
                :label="`${rate}×`"
                :outline="activePlaybackRate !== rate"
                no-caps
                unelevated
                @click="setVideoPlaybackRate(rate)"
              />
            </div>
          </div>
          <div class="video-card__body">
            <div class="video-card__heading">
              <q-icon
                class="video-card__icon"
                name="smart_display"
                size="34px"
              />
              <div>
                <h2>{{ video.title }}</h2>
                <span>{{ video.sourceLabel }}</span>
              </div>
              <q-badge
                v-if="cachedUrls.has(video.sourceUrl)"
                color="positive"
                label="Offline"
              />
            </div>
            <p>{{ video.description }}</p>
            <div class="video-card__meta">
              <span><q-icon name="school" /> {{ video.level }}</span>
              <span><q-icon name="schedule" /> {{ formatVideoDuration(video.durationSeconds) }}</span>
              <span><q-icon name="storage" /> {{ formatVideoSize(video.sizeBytes) }}</span>
            </div>
            <div class="video-card__actions">
              <q-btn
                color="primary"
                :icon="selectedVideoId === video.id ? 'close' : 'play_arrow'"
                :label="selectedVideoId === video.id ? 'Close' : 'Watch'"
                no-caps
                outline
                @click="toggleVideo(video.id)"
              />
              <q-btn
                v-if="cachedUrls.has(video.sourceUrl)"
                color="negative"
                icon="delete_outline"
                label="Delete from cache"
                no-caps
                outline
                :loading="busyVideoId === video.id"
                @click="removeVideo(video)"
              />
              <q-btn
                v-else
                color="primary"
                icon="download_for_offline"
                label="Save offline"
                no-caps
                unelevated
                :disable="!isOnline"
                :loading="busyVideoId === video.id"
                @click="saveVideo(video)"
              />
            </div>
          </div>
        </article>
      </section>

      <p class="video-storage-note">
        {{ offlineStorageSummary }} Offline copies stay only on this device and can be removed at any time.
      </p>
    </section>

    <nav
      class="mobile-start-dock"
      aria-label="Primary navigation"
    >
      <router-link
        class="mobile-start-dock__button"
        :to="{ name: 'dashboard' }"
      >
        <q-icon name="home" size="24px" />
        <span>Home</span>
      </router-link>
      <router-link
        class="mobile-start-dock__button"
        :to="{ name: 'dashboard', query: { training: 'listening' } }"
      >
        <q-icon name="headphones" size="24px" />
        <span>Listen</span>
      </router-link>
      <router-link
        class="mobile-start-dock__button"
        :to="{ name: 'dashboard', query: { training: 'speaking' } }"
      >
        <q-icon name="record_voice_over" size="24px" />
        <span>Speak</span>
      </router-link>
      <router-link
        class="mobile-start-dock__button mobile-start-dock__button--active"
        :to="{ name: 'videos' }"
      >
        <q-icon name="video_library" size="24px" />
        <span>Video</span>
      </router-link>
    </nav>
  </q-page>
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import {
  deleteOfflineVideo,
  formatVideoDuration,
  formatVideoSize,
  getCachedVideoUrls,
  saveVideoOffline,
  videoLibrary,
  type LibraryVideo,
} from 'src/services/video-library';
import { useAppStore } from 'src/stores/app-store';
import { forgetOfflineLesson, markOfflineLessonOpened, registerOfflineVideo } from 'src/services/offline-library';
import { loadContentProgress, saveContentProgress, syncAllContentProgress } from 'src/services/content-progress';
import {
  readVideoPlaybackPreference,
  saveVideoPlaybackPreference,
  videoPlaybackRates,
  type VideoPlaybackRate,
} from 'src/services/video-preferences';

const appStore = useAppStore();
const cachedUrls = ref(new Set<string>());
const busyVideoId = ref<string | null>(null);
const selectedVideoId = ref<string | null>(null);
const activeVideoElement = ref<HTMLVideoElement | null>(null);
const backgroundAudioElement = ref<HTMLAudioElement | null>(null);
const activeRepeat = ref(true);
const activePlaybackRate = ref<VideoPlaybackRate>(1);
const isOnline = computed(() => appStore.isOnline);
let lastProgressSaveAt = 0;
const offlineStorageSummary = computed(() => {
  const cachedVideos = videoLibrary.filter((video) => cachedUrls.value.has(video.sourceUrl));
  const totalBytes = cachedVideos.reduce((total, video) => total + video.sizeBytes, 0);
  return cachedVideos.length === 0
    ? 'No videos are saved offline.'
    : `${cachedVideos.length} saved · ${formatVideoSize(totalBytes)} used.`;
});

onMounted(() => {
  void refreshCacheStatus();
  void syncAllContentProgress().catch(() => undefined);
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  stopActiveVideo();
  clearVideoMediaSession();
});

async function refreshCacheStatus() {
  cachedUrls.value = await getCachedVideoUrls();
}

async function toggleVideo(videoId: string) {
  if (selectedVideoId.value === videoId) {
    stopActiveVideo();
    selectedVideoId.value = null;
    clearVideoMediaSession();
    return;
  }

  stopActiveVideo();
  markOfflineLessonOpened(videoId, 'videos');
  const playbackPreference = readVideoPlaybackPreference(videoId);
  activeRepeat.value = playbackPreference.repeat;
  activePlaybackRate.value = playbackPreference.playbackRate;
  selectedVideoId.value = videoId;
  await nextTick();

  const video = videoLibrary.find((item) => item.id === videoId);
  const player = activeVideoElement.value;
  const audio = backgroundAudioElement.value;
  if (!video || !player || !audio) return;

  applyPlaybackRate(playbackPreference.playbackRate);
  configureVideoMediaSession(video, audio);
  try {
    audio.volume = 0;
    await audio.play();
    await player.play();
  } catch {
    Notify.create({ type: 'negative', message: 'Tap play to start this video.' });
  }
}

function setVideoRepeat(repeat: boolean) {
  activeRepeat.value = repeat;
  saveActiveVideoPlaybackPreference();
}

function setVideoPlaybackRate(playbackRate: VideoPlaybackRate) {
  activePlaybackRate.value = playbackRate;
  applyPlaybackRate(playbackRate);
  saveActiveVideoPlaybackPreference();
}

function applyPlaybackRate(playbackRate: VideoPlaybackRate) {
  if (activeVideoElement.value) activeVideoElement.value.playbackRate = playbackRate;
  if (backgroundAudioElement.value) backgroundAudioElement.value.playbackRate = playbackRate;
}

function saveActiveVideoPlaybackPreference() {
  if (!selectedVideoId.value) return;
  saveVideoPlaybackPreference(selectedVideoId.value, {
    repeat: activeRepeat.value,
    playbackRate: activePlaybackRate.value,
  });
}

function handleVideoPlay() {
  const audio = backgroundAudioElement.value;
  if (!audio) return;
  audio.volume = document.hidden ? 1 : 0;
  if (audio.paused) void audio.play();
}

function handleVideoPause() {
  const audio = backgroundAudioElement.value;
  window.setTimeout(() => {
    if (!document.hidden) audio?.pause();
  }, 500);
}

function synchronizeAudioToVideo() {
  const player = activeVideoElement.value;
  const audio = backgroundAudioElement.value;
  if (!player || !audio || !Number.isFinite(player.currentTime)) return;
  audio.currentTime = player.currentTime;
}

function synchronizeVideoToAudio() {
  const player = activeVideoElement.value;
  const audio = backgroundAudioElement.value;
  if (!player || !audio || document.hidden) return;
  if (Math.abs(player.currentTime - audio.currentTime) > 0.45) player.currentTime = audio.currentTime;
  updateVideoMediaPosition(audio);
  persistActiveVideoProgress(audio);
}

async function restoreVideoPosition(video: LibraryVideo) {
  const player = activeVideoElement.value;
  const audio = backgroundAudioElement.value;
  if (!player || !audio) return;
  const progress = await loadContentProgress('video', video.id);
  if (!progress || progress.completed) return;
  const position = Math.min(progress.furthestPosition, Math.max(0, player.duration - 0.25));
  player.currentTime = position;
  audio.currentTime = position;
}

function persistActiveVideoProgress(audio: HTMLAudioElement, force = false) {
  const video = videoLibrary.find((item) => item.id === selectedVideoId.value);
  if (!video || !Number.isFinite(audio.currentTime)) return;
  const timestamp = Date.now();
  if (!force && timestamp - lastProgressSaveAt < 3000) return;
  lastProgressSaveAt = timestamp;
  const duration = Number.isFinite(audio.duration) ? audio.duration : video.durationSeconds;
  void saveContentProgress({
    studentId: appStore.studentId,
    category: 'video',
    contentId: video.id,
    position: audio.currentTime,
    furthestPosition: audio.currentTime,
    duration,
    completed: duration > 0 && audio.currentTime >= duration - 2,
    updatedAt: new Date().toISOString(),
  });
}

function handleVisibilityChange() {
  const player = activeVideoElement.value;
  const audio = backgroundAudioElement.value;
  if (!player || !audio) return;

  if (document.hidden) {
    audio.currentTime = player.currentTime;
    audio.volume = 1;
    if (audio.paused) void audio.play();
    return;
  }

  if (!audio.paused) {
    audio.volume = 0;
    player.currentTime = audio.currentTime;
    void player.play();
  }
}

function handleBackgroundAudioEnded() {
  if (backgroundAudioElement.value) persistActiveVideoProgress(backgroundAudioElement.value, true);
  activeVideoElement.value?.pause();
  if (activeVideoElement.value) activeVideoElement.value.currentTime = 0;
}

function stopActiveVideo() {
  if (backgroundAudioElement.value) persistActiveVideoProgress(backgroundAudioElement.value, true);
  activeVideoElement.value?.pause();
  backgroundAudioElement.value?.pause();
}

function configureVideoMediaSession(video: LibraryVideo, audio: HTMLAudioElement) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: video.title,
    artist: 'Mentor AI',
    album: 'Real English videos',
  });
  navigator.mediaSession.setActionHandler('play', () => {
    audio.volume = document.hidden ? 1 : 0;
    void audio.play();
    if (!document.hidden) void activeVideoElement.value?.play();
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    audio.pause();
    activeVideoElement.value?.pause();
  });
  navigator.mediaSession.setActionHandler('stop', () => stopActiveVideo());
  navigator.mediaSession.setActionHandler('seekbackward', (details) => {
    audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset ?? 10));
  });
  navigator.mediaSession.setActionHandler('seekforward', (details) => {
    audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + (details.seekOffset ?? 10));
  });
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime !== undefined) audio.currentTime = details.seekTime;
  });
}

function updateVideoMediaPosition(audio: HTMLAudioElement) {
  if (!('mediaSession' in navigator) || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
  navigator.mediaSession.setPositionState({
    duration: audio.duration,
    playbackRate: audio.playbackRate,
    position: Math.min(audio.currentTime, audio.duration),
  });
}

function clearVideoMediaSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = null;
  const actions = ['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto'] as const;
  for (const action of actions) {
    navigator.mediaSession.setActionHandler(action, null);
  }
}

async function saveVideo(video: LibraryVideo) {
  busyVideoId.value = video.id;
  try {
    await saveVideoOffline(video);
    registerOfflineVideo(video);
    await refreshCacheStatus();
    Notify.create({ type: 'positive', message: `${video.title} is ready offline.` });
  } catch {
    Notify.create({ type: 'negative', message: 'Could not save the video. Check the connection and try again.' });
  } finally {
    busyVideoId.value = null;
  }
}

async function removeVideo(video: LibraryVideo) {
  busyVideoId.value = video.id;
  try {
    await deleteOfflineVideo(video);
    forgetOfflineLesson(video.id, 'videos');
    await refreshCacheStatus();
    Notify.create({ message: 'Offline copy deleted.' });
  } finally {
    busyVideoId.value = null;
  }
}
</script>
