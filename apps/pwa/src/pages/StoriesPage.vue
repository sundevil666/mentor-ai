<template>
  <q-page class="videos-page" :class="{ 'videos-page--detail': selectedStory }">
    <section class="videos-shell" :class="{ 'videos-shell--detail': selectedStory }">
      <header class="videos-header">
        <q-btn v-if="selectedStory" aria-label="Back to story list" color="primary" flat icon="arrow_back" round @click="closeStory" />
        <div>
          <p>English audio library</p>
          <h1>{{ selectedStory?.title ?? 'Stories & Tales' }}</h1>
        </div>
      </header>

      <section v-if="!selectedStory" class="video-library" aria-label="Audio stories library">
        <article
          v-for="story in storyLibrary"
          :key="story.id"
          class="video-card"
          role="link"
          tabindex="0"
          @click="openStory(story.id)"
          @keydown.enter="openStory(story.id)"
          @keydown.space.prevent="openStory(story.id)"
        >
          <q-icon class="video-card__play-backdrop" name="headphones" />
          <div class="video-card__body">
            <div class="video-card__heading"><h2>{{ story.title }}</h2></div>
            <p>{{ story.description }}</p>
            <div class="video-card__meta">
              <span><q-icon name="school" /> {{ story.level }}</span>
              <span><q-icon name="schedule" /> {{ formatStoryDuration(story.durationSeconds) }}</span>
              <span><q-icon name="menu_book" /> {{ story.author }}</span>
              <span class="video-card__engagement"><q-icon name="insights" /> {{ engagementLabel(story.id) }}</span>
            </div>
          </div>
        </article>
      </section>

      <section v-else class="video-detail video-detail--subtitles-hidden">
        <div class="audio-program-card__art"><q-icon name="auto_stories" size="82px" /></div>
        <audio
          ref="audioElement"
          class="story-audio"
          :src="selectedStory.sourceUrl"
          :loop="repeat"
          preload="metadata"
          @ended="handleEnded"
          @loadedmetadata="restoreProgress"
          @pause="handlePause"
          @play="handlePlay"
          @timeupdate="handleTimeUpdate"
        />
        <div class="video-progress" aria-label="Story progress" style="grid-template-columns: auto auto minmax(0, 1fr) auto">
          <span>{{ formatStoryDuration(currentTime) }}</span>
          <q-btn :aria-label="playing ? 'Pause story' : 'Play story'" color="primary" :icon="playing ? 'pause' : 'play_arrow'" round unelevated @click="togglePlayback" />
          <q-slider :model-value="currentTime" :min="0" :max="duration || selectedStory.durationSeconds" :step="1" color="primary" @update:model-value="seek" />
          <span>{{ formatStoryDuration(duration || selectedStory.durationSeconds) }}</span>
        </div>
        <div class="video-playback-settings">
          <q-toggle v-model="repeat" aria-label="Repeat story" color="primary" icon="repeat" />
          <div class="video-speed-controls" aria-label="Playback speed">
            <q-btn v-for="rate in playbackRates" :key="rate" :color="playbackRate === rate ? 'primary' : undefined" :label="`${rate}×`" :outline="playbackRate !== rate" no-caps unelevated @click="setPlaybackRate(rate)" />
          </div>
        </div>
        <div class="video-detail__body">
          <div class="video-card__meta video-detail__meta">
            <span><q-icon name="school" /> {{ selectedStory.level }}</span>
            <span><q-icon name="record_voice_over" /> Read by {{ selectedStory.reader }}</span>
            <span><q-icon name="storage" /> {{ formatStorySize(selectedStory.sizeBytes) }}</span>
            <ContentMentorFeedback
              class="video-card__feedback"
              category="audio"
              :content-id="selectedStory.id"
            />
            <q-btn
              :aria-label="isSaved(selectedStory) ? 'Delete offline story' : 'Save story offline'"
              class="video-detail__offline-action"
              :color="isSaved(selectedStory) ? 'negative' : 'primary'"
              flat
              :icon="isSaved(selectedStory) ? 'delete_outline' : 'download_for_offline'"
              round
              :loading="busy"
              @click="toggleOffline(selectedStory)"
            />
          </div>
          <p>{{ selectedStory.description }}</p>
          <p class="story-source">{{ selectedStory.sourceLabel }}. The recording is bundled with the app for reliable offline listening.</p>
        </div>
      </section>

      <p v-if="!selectedStory" class="video-storage-note">{{ offlineSummary }} All four public-domain recordings are bundled with the app.</p>
    </section>

    <nav class="mobile-start-dock" aria-label="Primary navigation">
      <router-link class="mobile-start-dock__button" :to="{ name: 'dashboard' }"><q-icon name="home" size="24px" /><span>Home</span></router-link>
      <router-link class="mobile-start-dock__button" :to="{ name: 'dashboard', query: { training: 'listening' } }"><q-icon name="headphones" size="24px" /><span>Listen</span></router-link>
      <router-link class="mobile-start-dock__button" :to="{ name: 'dashboard', query: { training: 'speaking' } }"><q-icon name="record_voice_over" size="24px" /><span>Speak</span></router-link>
      <router-link class="mobile-start-dock__button" :to="{ name: 'audio' }"><q-icon name="podcasts" size="24px" /><span>Audio</span></router-link>
      <router-link class="mobile-start-dock__button mobile-start-dock__button--active" :to="{ name: 'stories' }"><q-icon name="auto_stories" size="24px" /><span>Stories</span></router-link>
    </nav>
  </q-page>
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import ContentMentorFeedback from 'src/components/ContentMentorFeedback.vue';
import { loadContentEngagementSummaries, recordContentEngagement, syncContentEngagement, type ContentEngagementSummary } from 'src/services/content-engagement';
import { loadContentProgress, saveContentProgress, syncAllContentProgress } from 'src/services/content-progress';
import { forgetOfflineLesson, markOfflineLessonOpened, registerOfflineStory } from 'src/services/offline-library';
import { deleteOfflineStory, formatStoryDuration, formatStorySize, getCachedStoryUrls, saveStoryOffline, storyLibrary, type LibraryStory } from 'src/services/story-library';
import { useAppStore } from 'src/stores/app-store';
import { configurePlaybackAudioSession } from 'src/services/audio-session';

const appStore = useAppStore();
const selectedStoryId = ref<string | null>(null);
const audioElement = ref<HTMLAudioElement | null>(null);
const cachedUrls = ref(new Set<string>());
const engagementSummaries = ref(new Map<string, ContentEngagementSummary>());
const currentTime = ref(0);
const duration = ref(0);
const playing = ref(false);
const repeat = ref(false);
const playbackRate = ref(1);
const busy = ref(false);
let lastProgressSave = 0;
const playbackRates = [0.75, 1, 1.25, 1.5];
const selectedStory = computed(() => storyLibrary.find((story) => story.id === selectedStoryId.value) ?? null);
const offlineSummary = computed(() => `${storyLibrary.length} stories · ${formatStoryDuration(storyLibrary.reduce((sum, story) => sum + story.durationSeconds, 0))} total listening.`);

onMounted(async () => {
  configurePlaybackAudioSession();
  cachedUrls.value = await getCachedStoryUrls();
  engagementSummaries.value = await loadContentEngagementSummaries('audio');
  document.addEventListener('visibilitychange', handleVisibilityChange);
});
onUnmounted(() => {
  persistProgress();
  clearMediaSession();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

async function openStory(id: string) {
  configurePlaybackAudioSession();
  selectedStoryId.value = id;
  markOfflineLessonOpened(id, 'stories');
  await nextTick();
  configureMediaSession();
}
function closeStory() { persistProgress(); audioElement.value?.pause(); selectedStoryId.value = null; clearMediaSession(); }
async function togglePlayback() {
  const audio = audioElement.value;
  if (!audio) return;
  if (audio.paused) {
    configurePlaybackAudioSession();
    try { await audio.play(); } catch { Notify.create({ type: 'negative', message: 'Tap play again to start this story.' }); }
  } else audio.pause();
}
function seek(value: number | null) { if (audioElement.value && value !== null) audioElement.value.currentTime = value; }
function setPlaybackRate(rate: number) { playbackRate.value = rate; if (audioElement.value) audioElement.value.playbackRate = rate; }
function handlePlay() {
  configurePlaybackAudioSession();
  playing.value = true;
  setMediaSessionPlaybackState('playing');
  if (selectedStory.value) void recordEngagement(selectedStory.value.id, 'started');
}
function handlePause() {
  playing.value = false;
  setMediaSessionPlaybackState('paused');
}
function handleTimeUpdate() {
  const audio = audioElement.value;
  if (!audio) return;
  currentTime.value = audio.currentTime;
  duration.value = Number.isFinite(audio.duration) ? audio.duration : (selectedStory.value?.durationSeconds ?? 0);
  if (Date.now() - lastProgressSave > 5_000) persistProgress();
  updateMediaPosition();
}
function handleEnded() { playing.value = false; if (selectedStory.value) void recordEngagement(selectedStory.value.id, 'finished'); persistProgress(true); }
async function restoreProgress() {
  const story = selectedStory.value;
  const audio = audioElement.value;
  if (!story || !audio) return;
  audio.playbackRate = playbackRate.value;
  duration.value = Number.isFinite(audio.duration) ? audio.duration : story.durationSeconds;
  const progress = await loadContentProgress('audio', story.id);
  if (progress && !progress.completed) audio.currentTime = Math.min(progress.position, Math.max(0, duration.value - 1));
}
function persistProgress(completed = false) {
  const story = selectedStory.value;
  const audio = audioElement.value;
  if (!story || !audio || !Number.isFinite(audio.currentTime)) return;
  lastProgressSave = Date.now();
  void saveContentProgress({ studentId: appStore.studentId, category: 'audio', contentId: story.id, position: audio.currentTime, furthestPosition: audio.currentTime, duration: duration.value || story.durationSeconds, completed, updatedAt: new Date().toISOString() }).then(() => syncAllContentProgress());
}
async function toggleOffline(story: LibraryStory) {
  busy.value = true;
  try {
    if (isSaved(story)) { await deleteOfflineStory(story); forgetOfflineLesson(story.id, 'stories'); }
    else { await saveStoryOffline(story); registerOfflineStory(story); }
    cachedUrls.value = await getCachedStoryUrls();
  } catch { Notify.create({ type: 'negative', message: 'Could not update offline storage.' }); }
  finally { busy.value = false; }
}
function isSaved(story: LibraryStory) { return cachedUrls.value.has(new URL(story.sourceUrl, window.location.origin).href) || cachedUrls.value.has(story.sourceUrl); }
async function recordEngagement(id: string, type: 'started' | 'finished') {
  await recordContentEngagement({ studentId: appStore.studentId, category: 'audio', contentId: id, type });
  engagementSummaries.value = await loadContentEngagementSummaries('audio');
  void syncContentEngagement();
}
function engagementLabel(id: string) { const summary = engagementSummaries.value.get(id); return summary ? `${summary.starts} starts · ${summary.finishes} finished` : 'Not started'; }
function handleVisibilityChange() { persistProgress(); }
function configureMediaSession() {
  const story = selectedStory.value;
  if (!story || !('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: story.title, artist: story.reader, album: 'Stories & Tales' });
  navigator.mediaSession.setActionHandler('play', () => { void resumeStoryFromMediaSession(); });
  navigator.mediaSession.setActionHandler('pause', () => {
    audioElement.value?.pause();
    setMediaSessionPlaybackState('paused');
  });
  navigator.mediaSession.setActionHandler('seekbackward', () => seek(Math.max(0, currentTime.value - 10)));
  navigator.mediaSession.setActionHandler('seekforward', () => seek(Math.min(duration.value, currentTime.value + 10)));
  navigator.mediaSession.setActionHandler('seekto', (details) => seek(details.seekTime ?? null));
}
async function resumeStoryFromMediaSession() {
  const audio = audioElement.value;
  if (!audio) return;
  configurePlaybackAudioSession();
  try {
    await audio.play();
    setMediaSessionPlaybackState('playing');
  } catch {
    setMediaSessionPlaybackState('paused');
  }
}
function setMediaSessionPlaybackState(state: 'none' | 'paused' | 'playing') {
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = state;
}
function updateMediaPosition() {
  if (!('mediaSession' in navigator) || !duration.value || currentTime.value > duration.value) return;
  try { navigator.mediaSession.setPositionState({ duration: duration.value, playbackRate: playbackRate.value, position: currentTime.value }); } catch { /* Unsupported on older Safari. */ }
}
function clearMediaSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = null;
  navigator.mediaSession.playbackState = 'none';
}
</script>
