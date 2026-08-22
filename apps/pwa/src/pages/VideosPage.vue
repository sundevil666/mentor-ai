<template>
  <q-page class="videos-page">
    <section class="videos-shell">
      <header class="videos-header">
        <div>
          <p>Real English</p>
          <h1>Videos</h1>
          <span>Watch online or save a video on this device for offline listening.</span>
        </div>
      </header>

      <section class="video-library" aria-label="Video library">
        <article v-for="video in videoLibrary" :key="video.id" class="video-card">
          <video
            class="video-card__player"
            :src="video.sourceUrl"
            controls
            playsinline
            preload="metadata"
          />
          <div class="video-card__body">
            <div class="video-card__heading">
              <div>
                <h2>{{ video.title }}</h2>
                <span>{{ video.sourceLabel }}</span>
              </div>
              <q-badge v-if="cachedUrls.has(video.sourceUrl)" color="positive" label="Offline" />
            </div>
            <p>{{ video.description }}</p>
            <div class="video-card__meta">
              <span><q-icon name="schedule" /> {{ formatVideoDuration(video.durationSeconds) }}</span>
              <span><q-icon name="storage" /> {{ formatVideoSize(video.sizeBytes) }}</span>
            </div>
            <q-btn
              v-if="cachedUrls.has(video.sourceUrl)"
              color="negative"
              icon="delete_outline"
              label="Delete from offline cache"
              no-caps
              outline
              :loading="busyVideoId === video.id"
              @click="removeVideo(video)"
            />
            <q-btn
              v-else
              color="primary"
              icon="download_for_offline"
              label="Save for offline"
              no-caps
              unelevated
              :disable="!isOnline"
              :loading="busyVideoId === video.id"
              @click="saveVideo(video)"
            />
          </div>
        </article>
      </section>

      <p class="video-storage-note">
        Offline copies stay only on this device and can be removed at any time.
      </p>
    </section>

    <nav class="video-bottom-dock" aria-label="Primary navigation">
      <router-link :to="{ name: 'dashboard' }">
        <q-icon name="home" size="24px" />
        <span>Home</span>
      </router-link>
      <router-link class="video-bottom-dock__active" :to="{ name: 'videos' }">
        <q-icon name="video_library" size="24px" />
        <span>Video</span>
      </router-link>
    </nav>
  </q-page>
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { computed, onMounted, ref } from 'vue';
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

const appStore = useAppStore();
const cachedUrls = ref(new Set<string>());
const busyVideoId = ref<string | null>(null);
const isOnline = computed(() => appStore.isOnline);

onMounted(refreshCacheStatus);

async function refreshCacheStatus() {
  cachedUrls.value = await getCachedVideoUrls();
}

async function saveVideo(video: LibraryVideo) {
  busyVideoId.value = video.id;
  try {
    await saveVideoOffline(video);
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
    await refreshCacheStatus();
    Notify.create({ message: 'Offline copy deleted.' });
  } finally {
    busyVideoId.value = null;
  }
}
</script>
