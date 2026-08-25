<template>
  <q-page
    class="videos-page"
    :class="{ 'videos-page--detail': selectedVideo }"
  >
    <section
      class="videos-shell"
      :class="{ 'videos-shell--detail': selectedVideo }"
    >
      <header class="videos-header">
        <q-btn
          v-if="selectedVideo"
          aria-label="Back to video list"
          color="primary"
          flat
          icon="arrow_back"
          round
          @click="closeVideo"
        />
        <div>
          <p>Real English</p>
          <h1>{{ selectedVideo?.title ?? 'Videos' }}</h1>
        </div>
      </header>

      <section
        v-if="!selectedVideo"
        class="video-library"
        aria-label="Video library"
      >
        <article
          v-for="video in videoLibrary"
          :key="video.id"
          class="video-card"
          role="link"
          tabindex="0"
          @click="handleVideoCardClick($event, video.id)"
          @keydown.enter="handleVideoCardKeydown($event, video.id)"
          @keydown.space.prevent="handleVideoCardKeydown($event, video.id)"
        >
          <q-icon
            class="video-card__play-backdrop"
            name="play_circle"
          />
          <div class="video-card__body">
            <div class="video-card__heading">
              <div>
                <h2>{{ video.title }}</h2>
              </div>
            </div>
            <p>{{ video.description }}</p>
            <div class="video-card__meta">
              <span><q-icon name="school" /> {{ video.level }}</span>
              <span><q-icon name="schedule" /> {{ formatVideoDuration(video.durationSeconds) }}</span>
              <span><q-icon name="storage" /> {{ formatVideoSize(video.sizeBytes) }}</span>
              <q-btn
                v-if="cachedUrls.has(video.sourceUrl)"
                aria-label="Delete offline video"
                class="video-card__offline-action"
                color="negative"
                flat
                icon="delete_outline"
                round
                :loading="busyVideoId === video.id"
                @click="removeVideo(video)"
              >
                <q-tooltip>Delete from offline storage</q-tooltip>
              </q-btn>
              <q-btn
                v-else
                aria-label="Save video offline"
                class="video-card__offline-action"
                color="primary"
                flat
                icon="download_for_offline"
                round
                :disable="!isOnline"
                :loading="busyVideoId === video.id"
                @click="saveVideo(video)"
              >
                <q-tooltip>Save video for offline viewing</q-tooltip>
              </q-btn>
            </div>
          </div>
        </article>
      </section>

      <section
        v-else
        class="video-detail"
        :class="{ 'video-detail--subtitles-hidden': !activeSubtitlesVisible }"
      >
        <video
          ref="activeVideoElement"
          class="video-card__player"
          :src="selectedVideo.sourceUrl"
          controls
          :loop="activeRepeat"
          muted
          playsinline
          preload="metadata"
          @loadedmetadata="handleVideoMetadataLoaded(selectedVideo)"
          @pause="handleVideoPause"
          @play="handleVideoPlay"
          @seeked="synchronizeAudioToVideo"
          @timeupdate="handleVideoTimeUpdate"
        >
          <track
            kind="captions"
            label="English"
            :src="selectedVideo.captionUrl"
            srclang="en"
          >
        </video>
        <div
          class="video-progress"
          aria-label="Video progress"
        >
          <span>{{ formatVideoDuration(videoCurrentTime) }}</span>
          <q-slider
            :model-value="videoCurrentTime"
            :min="0"
            :max="videoDuration || selectedVideo.durationSeconds"
            :step="1"
            color="primary"
            @update:model-value="seekVideoProgress"
          />
          <span>{{ formatVideoDuration(videoDuration || selectedVideo.durationSeconds) }}</span>
        </div>
        <audio
          ref="backgroundAudioElement"
          :src="selectedVideo.sourceUrl"
          :loop="activeRepeat"
          preload="metadata"
          @ended="handleBackgroundAudioEnded"
          @timeupdate="synchronizeVideoToAudio"
        />
        <div class="video-playback-settings">
          <q-toggle
            :model-value="activeRepeat"
            aria-label="Repeat video"
            color="primary"
            icon="repeat"
            @update:model-value="setVideoRepeat"
          />
          <q-btn
            :aria-label="activeSubtitlesVisible ? 'Hide subtitles' : 'Show subtitles'"
            :color="activeSubtitlesVisible ? 'primary' : undefined"
            flat
            :icon="activeSubtitlesVisible ? 'subtitles' : 'subtitles_off'"
            round
            @click="setSubtitlesVisible(!activeSubtitlesVisible)"
          >
            <q-tooltip>{{ activeSubtitlesVisible ? 'Hide subtitles' : 'Show subtitles' }}</q-tooltip>
          </q-btn>
          <div
            class="video-speed-controls"
            aria-label="Playback speed"
          >
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
        <div class="video-detail__body">
          <div class="video-card__meta video-detail__meta">
            <span><q-icon name="school" /> {{ selectedVideo.level }}</span>
            <span><q-icon name="schedule" /> {{ formatVideoDuration(selectedVideo.durationSeconds) }}</span>
            <span><q-icon name="storage" /> {{ formatVideoSize(selectedVideo.sizeBytes) }}</span>
            <q-btn
              v-if="cachedUrls.has(selectedVideo.sourceUrl)"
              aria-label="Delete offline video"
              class="video-detail__offline-action"
              color="negative"
              flat
              icon="delete_outline"
              round
              :loading="busyVideoId === selectedVideo.id"
              @click="removeVideo(selectedVideo)"
            >
              <q-tooltip>Delete from offline storage</q-tooltip>
            </q-btn>
            <q-btn
              v-else
              aria-label="Save video offline"
              class="video-detail__offline-action"
              color="primary"
              flat
              icon="download_for_offline"
              round
              :disable="!isOnline"
              :loading="busyVideoId === selectedVideo.id"
              @click="saveVideo(selectedVideo)"
            >
              <q-tooltip>Save video for offline viewing</q-tooltip>
            </q-btn>
          </div>
          <div
            v-if="activeSubtitlesVisible"
            ref="subtitleScroller"
            class="video-subtitles"
            aria-label="English subtitles"
            aria-live="polite"
          >
            <p
              v-if="subtitleStatus === 'loading'"
              class="video-subtitles__status"
            >
              Loading English subtitles…
            </p>
            <p
              v-else-if="subtitleStatus === 'error'"
              class="video-subtitles__status"
            >
              English subtitles are temporarily unavailable.
            </p>
            <template v-else>
              <button
                v-for="cue in subtitleCues"
                :key="cue.id"
                class="video-subtitles__cue"
                :class="{ 'video-subtitles__cue--active': activeSubtitleCueId === cue.id }"
                :data-cue-id="cue.id"
                type="button"
                @click="seekToSubtitle(cue.start)"
              >
                {{ cue.text }}
              </button>
            </template>
          </div>
        </div>
      </section>

      <p
        v-if="!selectedVideo"
        class="video-storage-note"
      >
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
        class="mobile-start-dock__button"
        :to="{ name: 'audio' }"
      >
        <q-icon name="podcasts" size="24px" />
        <span>Audio</span>
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
import { parseWebVtt, type VideoSubtitleCue } from 'src/services/video-subtitles';
import { startVideoWithBackgroundAudio } from 'src/services/video-background-playback';

const appStore = useAppStore();
const cachedUrls = ref(new Set<string>());
const busyVideoId = ref<string | null>(null);
const selectedVideoId = ref<string | null>(null);
const activeVideoElement = ref<HTMLVideoElement | null>(null);
const backgroundAudioElement = ref<HTMLAudioElement | null>(null);
const activeRepeat = ref(true);
const activePlaybackRate = ref<VideoPlaybackRate>(1);
const activeSubtitlesVisible = ref(true);
const videoCurrentTime = ref(0);
const videoDuration = ref(0);
const subtitleCues = ref<VideoSubtitleCue[]>([]);
const activeSubtitleCueId = ref<string | null>(null);
const subtitleStatus = ref<'loading' | 'ready' | 'error'>('loading');
const subtitleScroller = ref<HTMLElement | null>(null);
const isOnline = computed(() => appStore.isOnline);
const selectedVideo = computed(() => videoLibrary.find((video) => video.id === selectedVideoId.value) ?? null);
let lastProgressSaveAt = 0;
let shouldResumeAfterVisibilityChange = false;
let videoPauseTimer: number | undefined;
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
  window.addEventListener('resize', updateActiveSubtitleScale);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('resize', updateActiveSubtitleScale);
  stopActiveVideo();
  clearVideoMediaSession();
});

async function refreshCacheStatus() {
  cachedUrls.value = await getCachedVideoUrls();
}

function handleVideoCardClick(event: MouseEvent, videoId: string) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest('button, video, audio, .video-playback-settings')) return;
  void toggleVideo(videoId);
}

function handleVideoCardKeydown(event: KeyboardEvent, videoId: string) {
  if (event.target !== event.currentTarget) return;
  void toggleVideo(videoId);
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
  activeSubtitlesVisible.value = playbackPreference.subtitlesVisible;
  videoCurrentTime.value = 0;
  videoDuration.value = 0;
  selectedVideoId.value = videoId;
  await nextTick();

  const video = videoLibrary.find((item) => item.id === videoId);
  const player = activeVideoElement.value;
  const audio = backgroundAudioElement.value;
  if (!video || !player || !audio) return;

  void loadVideoSubtitles(video);
  applyPlaybackRate(playbackPreference.playbackRate);
  configureVideoMediaSession(video, audio);
  try {
    await startVideoWithBackgroundAudio(player, audio);
  } catch {
    audio.pause();
    Notify.create({ type: 'negative', message: 'Tap play to start this video.' });
  }
}

function closeVideo() {
  stopActiveVideo();
  selectedVideoId.value = null;
  clearVideoMediaSession();
  subtitleCues.value = [];
  activeSubtitleCueId.value = null;
  videoCurrentTime.value = 0;
  videoDuration.value = 0;
}

async function loadVideoSubtitles(video: LibraryVideo) {
  subtitleStatus.value = 'loading';
  subtitleCues.value = [];
  activeSubtitleCueId.value = null;
  try {
    const response = await fetch(video.captionUrl);
    if (!response.ok) throw new Error('Subtitle request failed.');
    const cues = parseWebVtt(await response.text());
    if (cues.length === 0) throw new Error('Subtitle track is empty.');
    subtitleCues.value = cues;
    subtitleStatus.value = 'ready';
    updateActiveSubtitle(activeMediaTime());
  } catch {
    subtitleStatus.value = 'error';
  }
}

function seekToSubtitle(position: number) {
  const player = activeVideoElement.value;
  const audio = backgroundAudioElement.value;
  if (player) player.currentTime = position;
  if (audio) audio.currentTime = position;
  videoCurrentTime.value = position;
  updateActiveSubtitle(position);
  if (player?.paused && !document.hidden) void player.play();
}

function seekVideoProgress(position: number | null) {
  if (position === null || !Number.isFinite(position)) return;
  const player = activeVideoElement.value;
  const audio = backgroundAudioElement.value;
  if (player) player.currentTime = position;
  if (audio) audio.currentTime = position;
  videoCurrentTime.value = position;
  updateActiveSubtitle(position);
}

function updateActiveSubtitle(position: number) {
  const cue = subtitleCues.value.find((item) => position >= item.start && position < item.end) ?? null;
  if (cue?.id === activeSubtitleCueId.value) return;
  activeSubtitleCueId.value = cue?.id ?? null;
  if (!cue) return;
  void nextTick(() => {
    const container = subtitleScroller.value;
    const element = container?.querySelector<HTMLElement>(`[data-cue-id="${cue.id}"]`);
    if (!container || !element) return;
    applySubtitleScale(container, element);
    container.scrollTo({ top: element.offsetTop - container.clientHeight / 2, behavior: 'smooth' });
  });
}

function updateActiveSubtitleScale() {
  const container = subtitleScroller.value;
  const cueId = activeSubtitleCueId.value;
  const element = cueId ? container?.querySelector<HTMLElement>(`[data-cue-id="${cueId}"]`) : null;
  if (!container || !element) return;
  applySubtitleScale(container, element);
}

function applySubtitleScale(container: HTMLElement, element: HTMLElement) {
  const availableWidth = Math.max(0, container.clientWidth - 20);
  const naturalWidth = element.offsetWidth;
  if (naturalWidth <= 0) return;
  const scale = Math.min(1.6, Math.max(1.16, availableWidth / naturalWidth));
  element.style.setProperty('--subtitle-active-scale', scale.toFixed(3));
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

function setSubtitlesVisible(visible: boolean) {
  activeSubtitlesVisible.value = visible;
  saveActiveVideoPlaybackPreference();
  if (visible) {
    activeSubtitleCueId.value = null;
    void nextTick(() => updateActiveSubtitle(activeMediaTime()));
  }
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
    subtitlesVisible: activeSubtitlesVisible.value,
  });
}

function handleVideoPlay() {
  const audio = backgroundAudioElement.value;
  if (!audio) return;
  clearVideoPauseTimer();
  shouldResumeAfterVisibilityChange = true;
  if (audio.paused) void audio.play();
}

function handleVideoPause() {
  const audio = backgroundAudioElement.value;
  clearVideoPauseTimer();
  videoPauseTimer = window.setTimeout(() => {
    videoPauseTimer = undefined;
    if (!document.hidden && activeVideoElement.value?.paused) {
      shouldResumeAfterVisibilityChange = false;
      audio?.pause();
    }
  }, 500);
}

function clearVideoPauseTimer() {
  if (videoPauseTimer === undefined) return;
  window.clearTimeout(videoPauseTimer);
  videoPauseTimer = undefined;
}

function synchronizeAudioToVideo() {
  const player = activeVideoElement.value;
  const audio = backgroundAudioElement.value;
  if (!player || !audio || !Number.isFinite(player.currentTime)) return;
  audio.currentTime = player.currentTime;
}

function handleVideoTimeUpdate() {
  const player = activeVideoElement.value;
  if (!player || document.hidden) return;
  videoCurrentTime.value = player.currentTime;
  if (Number.isFinite(player.duration)) videoDuration.value = player.duration;
  updateActiveSubtitle(player.currentTime);
  updateVideoMediaPosition(player);
  persistActiveVideoProgress(player);
}

function synchronizeVideoToAudio() {
  const player = activeVideoElement.value;
  const audio = backgroundAudioElement.value;
  if (!player || !audio) return;
  videoCurrentTime.value = audio.currentTime;
  if (Number.isFinite(audio.duration)) videoDuration.value = audio.duration;
  updateActiveSubtitle(audio.currentTime);
  if (document.hidden) return;
  if (Math.abs(player.currentTime - audio.currentTime) > 0.45) player.currentTime = audio.currentTime;
  updateVideoMediaPosition(audio);
  persistActiveVideoProgress(audio);
}

async function handleVideoMetadataLoaded(video: LibraryVideo) {
  const player = activeVideoElement.value;
  const audio = backgroundAudioElement.value;
  if (!player || !audio) return;
  videoDuration.value = Number.isFinite(player.duration) ? player.duration : video.durationSeconds;
  const progress = await loadContentProgress('video', video.id);
  if (!progress || progress.completed) return;
  const position = Math.min(progress.furthestPosition, Math.max(0, player.duration - 0.25));
  player.currentTime = position;
  audio.currentTime = position;
  videoCurrentTime.value = position;
  updateActiveSubtitle(position);
}

function persistActiveVideoProgress(media: HTMLMediaElement, force = false) {
  const video = videoLibrary.find((item) => item.id === selectedVideoId.value);
  if (!video || !Number.isFinite(media.currentTime)) return;
  const timestamp = Date.now();
  if (!force && timestamp - lastProgressSaveAt < 3000) return;
  lastProgressSaveAt = timestamp;
  const duration = Number.isFinite(media.duration) ? media.duration : video.durationSeconds;
  void saveContentProgress({
    studentId: appStore.studentId,
    category: 'video',
    contentId: video.id,
    position: media.currentTime,
    furthestPosition: media.currentTime,
    duration,
    completed: duration > 0 && media.currentTime >= duration - 2,
    updatedAt: new Date().toISOString(),
  });
}

function handleVisibilityChange() {
  const player = activeVideoElement.value;
  const audio = backgroundAudioElement.value;
  if (!player || !audio) return;

  if (document.hidden) {
    clearVideoPauseTimer();
    shouldResumeAfterVisibilityChange = shouldResumeAfterVisibilityChange || !player.paused;
    audio.currentTime = player.currentTime;
    if (shouldResumeAfterVisibilityChange && audio.paused) void audio.play();
    return;
  }

  if (Number.isFinite(audio.currentTime)) {
    player.currentTime = audio.currentTime;
  }
  if (shouldResumeAfterVisibilityChange && audio.paused) void audio.play();
  if (shouldResumeAfterVisibilityChange) void player.play();
}

function handleBackgroundAudioEnded() {
  if (backgroundAudioElement.value) persistActiveVideoProgress(backgroundAudioElement.value, true);
  activeVideoElement.value?.pause();
  if (activeVideoElement.value) activeVideoElement.value.currentTime = 0;
  videoCurrentTime.value = 0;
}

function stopActiveVideo() {
  clearVideoPauseTimer();
  shouldResumeAfterVisibilityChange = false;
  const activeMedia = document.hidden ? backgroundAudioElement.value : activeVideoElement.value;
  if (activeMedia) persistActiveVideoProgress(activeMedia, true);
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
    if (audio.paused) void audio.play();
    if (!document.hidden) void activeVideoElement.value?.play();
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    shouldResumeAfterVisibilityChange = false;
    audio.pause();
    activeVideoElement.value?.pause();
  });
  navigator.mediaSession.setActionHandler('stop', () => stopActiveVideo());
  navigator.mediaSession.setActionHandler('seekbackward', (details) => {
    seekVideoProgress(Math.max(0, activeMediaTime() - (details.seekOffset ?? 10)));
  });
  navigator.mediaSession.setActionHandler('seekforward', (details) => {
    const duration = activeVideoElement.value?.duration || audio.duration || Infinity;
    seekVideoProgress(Math.min(duration, activeMediaTime() + (details.seekOffset ?? 10)));
  });
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime !== undefined) seekVideoProgress(details.seekTime);
  });
}

function activeMediaTime() {
  return document.hidden
    ? (backgroundAudioElement.value?.currentTime ?? 0)
    : (activeVideoElement.value?.currentTime ?? 0);
}

function updateVideoMediaPosition(media: HTMLMediaElement) {
  if (!('mediaSession' in navigator) || !Number.isFinite(media.duration) || media.duration <= 0) return;
  navigator.mediaSession.setPositionState({
    duration: media.duration,
    playbackRate: media.playbackRate,
    position: Math.min(media.currentTime, media.duration),
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
