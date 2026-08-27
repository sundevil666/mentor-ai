<template>
  <q-page class="patterns-page">
    <section class="patterns-shell">
      <header class="patterns-header">
        <p>Reusable English</p><h1>Patterns</h1>
        <span>Learn one flexible phrase frame, then change the words to fit the situation.</span>
      </header>

      <article class="pattern-card">
        <div class="pattern-card__topline">
          <span><q-icon name="auto_awesome" /> Start here</span>
          <span>{{ pattern.level }} · About {{ pattern.estimatedMinutes }} min</span>
        </div>
        <div class="pattern-card__body">
          <div class="pattern-card__icon">
            <q-icon
              name="view_agenda"
              size="30px"
            />
          </div>
          <div><small>Pattern 1</small><h2>{{ pattern.title }}</h2><p>{{ pattern.description }}</p></div>
        </div>
        <div
          class="pattern-frame"
          aria-label="Phrase pattern"
        >
          <span>Keep</span><strong>Could you</strong><span class="pattern-frame__slot">change the action</span><strong>please?</strong>
        </div>
        <section
          class="pattern-playlist"
          aria-label="Could you practice playlist"
        >
          <div class="pattern-playlist__heading">
            <div>
              <span>Hands-free playlist</span>
              <strong>Could you… · {{ pattern.examples.length }} phrases</strong>
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
            @pause="isLessonPlaying = false"
            @play="isLessonPlaying = true"
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
              color="primary"
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
      </article>

      <section
        class="pattern-examples"
        aria-labelledby="pattern-examples-title"
      >
        <div class="pattern-section-heading">
          <div>
            <span>Build the reflex</span><h2 id="pattern-examples-title">
              Change only the middle
            </h2>
          </div>
          <strong>{{ completedCount }}/{{ pattern.examples.length }}</strong>
        </div>
        <q-linear-progress
          rounded
          size="8px"
          color="primary"
          :value="progress"
        />
        <article
          v-for="example in pattern.examples"
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
            >Could you <mark>{{ example.slotValue }}</mark>, please?<small>{{ example.translation }}</small></span>
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
      <p class="pattern-tip">
        <q-icon name="tips_and_updates" /> <span>Do not memorize six separate sentences. Memorize <strong>Could you …, please?</strong> and put a new action in the middle.</span>
      </p>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { patternLibrary, type PhrasePatternExample } from 'src/services/pattern-library';
import { speakWithPreferredVoice, stopSpeech } from 'src/services/speech-synthesis';
import { deletePatternPlaylist, getCachedPatternPlaylist, preparePatternPlaylist } from 'src/services/pattern-playlist';
import { configurePlaybackAudioSession } from 'src/services/audio-session';

const pattern = patternLibrary[0]!;
const progressKey = `mentor-ai:pattern-progress:${pattern.id}`;
const completedIds = ref(readCompletedIds());
const revealedIds = ref(new Set<string>());
const playingId = ref<string | null>(null);
const isLessonPlaying = ref(false);
const playlistAudio = ref<HTMLAudioElement | null>(null);
const playlistUrl = ref('');
const playlistOffline = ref(false);
const playlistPreparing = ref(false);
const playlistCompleted = ref(0);
const repeatEnabled = ref(localStorage.getItem(`mentor-ai:pattern-repeat:${pattern.id}`) !== 'false');
const completedCount = computed(() => completedIds.value.size);
const progress = computed(() => completedCount.value / pattern.examples.length);
const playlistProgress = computed(() => playlistCompleted.value / pattern.examples.length);

onMounted(async () => {
  const cached = await getCachedPatternPlaylist(pattern.id);
  if (cached) setPlaylistBlob(cached);
});

onBeforeUnmount(() => {
  stopSpeech();
  playlistAudio.value?.pause();
  revokePlaylistUrl();
});

function readCompletedIds() {
  try {
    const value = JSON.parse(localStorage.getItem(progressKey) ?? '[]') as unknown;
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
  } catch { return new Set<string>(); }
}

function toggleAnswer(id: string) {
  const next = new Set(revealedIds.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  revealedIds.value = next;
}

function toggleCompleted(id: string) {
  const next = new Set(completedIds.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  completedIds.value = next;
  localStorage.setItem(progressKey, JSON.stringify([...next]));
}

async function playExample(example: PhrasePatternExample) {
  stopPlaylist(); stopSpeech(); playingId.value = example.id;
  const started = await speakWithPreferredVoice(example.phrase, { mediaTitle: pattern.title, onEnd: () => { playingId.value = null; }, onError: showAudioError });
  if (!started) playingId.value = null;
}

async function togglePlaylist() {
  const player = playlistAudio.value;
  if (player && !player.paused) { player.pause(); return; }
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

async function downloadPlaylist() {
  if (await ensurePlaylist()) Notify.create({ type: 'positive', icon: 'offline_pin', message: 'Could you playlist downloaded for offline practice.' });
}

async function ensurePlaylist() {
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

function saveRepeatPreference() {
  localStorage.setItem(`mentor-ai:pattern-repeat:${pattern.id}`, String(repeatEnabled.value));
}

function showAudioError() {
  playingId.value = null; isLessonPlaying.value = false; playlistPreparing.value = false;
  Notify.create({ type: 'negative', icon: 'volume_off', message: 'Could not play this phrase', caption: 'Check the connection and try again.' });
}
</script>
