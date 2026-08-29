<template>
  <q-page class="videos-page category-theme--stories" :class="{ 'videos-page--detail': selectedStory || selectedBook, 'videos-page--book-detail': selectedBook, 'videos-page--reading-mode': readingMode }">
    <section class="videos-shell" :class="{ 'videos-shell--detail': selectedStory || selectedBook, 'videos-shell--book-detail': selectedBook }">
      <header v-if="!readingMode" class="videos-header" :class="{ 'videos-header--book-detail': selectedBook }">
        <q-btn v-if="selectedStory || selectedBook" aria-label="Back to library" color="primary" flat icon="arrow_back" round @click="closeDetail" />
        <div>
          <p>{{ activeTab === 'audio' ? 'English audio library' : 'Your private English library' }}</p>
          <h1>{{ selectedStory?.title ?? selectedBook?.title ?? 'Stories & Books' }}</h1>
        </div>
      </header>

      <q-tabs
        v-if="!selectedStory && !selectedBook"
        v-model="activeTab"
        class="story-library-tabs"
        active-color="primary"
        align="justify"
        indicator-color="primary"
        no-caps
        @update:model-value="saveActiveTab"
      >
        <q-tab icon="headphones" label="Audio" name="audio" />
        <q-tab icon="menu_book" :label="`Books (${personalBooks.length})`" name="books" />
      </q-tabs>

      <section v-if="!selectedStory && !selectedBook && activeTab === 'audio'" class="video-library" aria-label="Audio stories library">
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

      <section v-else-if="selectedStory" class="video-detail video-detail--subtitles-hidden">
        <div class="audio-program-card__art"><q-icon name="auto_stories" size="82px" /></div>
        <audio
          ref="audioElement"
          class="story-audio"
          :src="selectedStory.sourceUrl"
          controls
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
        <q-btn
          v-if="isIosStandalone()"
          class="full-width"
          color="primary"
          icon="open_in_new"
          label="Open this story in Safari for lock-screen audio"
          no-caps
          outline
          @click="openStoryInSafari"
        />
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

      <section v-else-if="!selectedBook && activeTab === 'books'" class="personal-books" aria-label="My books">
        <input ref="bookFileInput" class="personal-books__file-input" type="file" accept=".epub,.txt,application/epub+zip,text/plain" @change="handleBookFileSelection">

        <div v-if="personalBooks.length" class="personal-book-list">
          <div
            v-for="book in personalBooks"
            :key="book.id"
            class="personal-book-row"
          >
            <button class="personal-book-row__open" type="button" @click="openBook(book.id)">
              <q-icon name="menu_book" />
              <span>{{ book.title }}</span>
            </button>
            <q-btn :aria-label="`Delete ${book.title}`" color="negative" flat icon="delete_outline" round @click="confirmDeleteBook(book)" />
          </div>
        </div>

        <div v-else class="personal-books__empty">
          <q-icon name="library_books" size="64px" />
          <h2>No books yet</h2>
          <p>Tap + to import your first EPUB or TXT book.</p>
        </div>
      </section>

      <section v-else-if="selectedBook && currentBookPage" class="personal-reader" :class="{ 'personal-reader--focus': readingMode }" aria-label="Book reader">
        <div v-if="!readingMode" class="personal-reader__toolbar">
          <q-btn color="primary" icon="fullscreen" label="Reading mode" no-caps outline @click="setReadingMode(true)" />
          <q-select
            dense
            emit-value
            map-options
            outlined
            label="Chapter / part"
            :model-value="currentBookPageIndex"
            :options="bookPageOptions"
            @update:model-value="goToBookPage"
          />
          <span>{{ currentBookPageIndex + 1 }} / {{ selectedBookPages.length }}</span>
        </div>
        <div v-if="!readingMode" class="personal-reader__progress" aria-label="Reading progress">
          <span>Page {{ currentBookPageIndex + 1 }}</span>
          <q-linear-progress rounded size="8px" :value="(currentBookPageIndex + 1) / selectedBookPages.length" color="primary" track-color="grey-3" />
          <span>{{ selectedBookPages.length }} {{ selectedBookPages.length === 1 ? 'page' : 'pages' }}</span>
        </div>
        <div ref="readerContent" class="personal-reader__content" @scroll.passive="handleBookScroll">
          <div v-if="readingMode" class="personal-reader__progress" aria-label="Reading progress">
            <span>Page {{ currentBookPageIndex + 1 }}</span>
            <q-linear-progress rounded size="8px" :value="(currentBookPageIndex + 1) / selectedBookPages.length" color="primary" track-color="grey-3" />
            <span>{{ selectedBookPages.length }} {{ selectedBookPages.length === 1 ? 'page' : 'pages' }}</span>
          </div>
          <article class="personal-reader__paper" :style="{ fontSize: `${readerFontSize}px` }">
            <p class="personal-reader__part">{{ currentBookPartLabel }}</p>
            <p v-for="(paragraph, index) in currentBookParagraphs" :key="index">{{ paragraph }}</p>
          </article>
        </div>

        <aside v-if="readingMode" class="personal-reader__sidebar" aria-label="Reading controls">
          <q-btn class="personal-reader__exit" color="primary" icon="close_fullscreen" label="Exit reading" no-caps outline @click="setReadingMode(false)" />

          <div class="personal-reader__font-controls" aria-label="Text size">
            <span>Text {{ readerFontSize }} px</span>
            <div>
              <q-btn aria-label="Decrease text size" icon="text_decrease" outline round :disable="readerFontSize <= minReaderFontSize" @click="changeReaderFontSize(-1)" />
              <q-btn aria-label="Increase text size" color="primary" icon="text_increase" round unelevated :disable="readerFontSize >= maxReaderFontSize" @click="changeReaderFontSize(1)" />
            </div>
          </div>

          <div class="personal-reader__sidebar-navigation">
            <q-select
              dense
              emit-value
              map-options
              outlined
              label="Chapter / part"
              :model-value="currentBookPageIndex"
              :options="bookPageOptions"
              @update:model-value="goToBookPage"
            />
            <span>{{ currentBookPageIndex + 1 }} / {{ selectedBookPages.length }}</span>
            <nav aria-label="Book navigation">
              <q-btn aria-label="Previous part" color="primary" icon="arrow_back" round unelevated :disable="currentBookPageIndex === 0" @click="goToBookPage(currentBookPageIndex - 1)" />
              <q-btn aria-label="Next part" color="primary" icon="arrow_forward" round unelevated :disable="currentBookPageIndex >= selectedBookPages.length - 1" @click="goToBookPage(currentBookPageIndex + 1)" />
            </nav>
          </div>
        </aside>

        <nav v-else class="personal-reader__navigation" aria-label="Book navigation">
          <q-btn aria-label="Previous part" class="personal-reader__previous" color="primary" icon="arrow_back" round unelevated :disable="currentBookPageIndex === 0" @click="goToBookPage(currentBookPageIndex - 1)" />
          <q-btn aria-label="Next part" class="personal-reader__next" color="primary" icon="arrow_forward" round unelevated :disable="currentBookPageIndex >= selectedBookPages.length - 1" @click="goToBookPage(currentBookPageIndex + 1)" />
        </nav>
      </section>

      <p v-if="!selectedStory && !selectedBook && activeTab === 'audio'" class="video-storage-note">{{ offlineSummary }} Every public-domain recording is bundled with the app in 30–40 minute listening parts.</p>
    </section>

    <q-btn
      v-if="!selectedStory && !selectedBook && activeTab === 'books'"
      aria-label="Add a book"
      class="personal-books__add-button"
      color="primary"
      fab
      icon="add"
      :loading="importingBook"
      @click="chooseBookFile"
    />

    <q-dialog v-model="showImportConfirmation" persistent>
      <q-card class="personal-book-import-dialog">
        <q-card-section>
          <div class="text-h6">Import this book?</div>
          <p class="q-mb-none">{{ pendingBookFile?.name }}</p>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-checkbox v-model="rightsConfirmed" label="I have a lawful copy and will use it privately." />
          <p class="text-caption q-mb-none">Mentor AI does not remove DRM or share imported books with other accounts.</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" no-caps @click="cancelBookImport" />
          <q-btn color="primary" label="Import" no-caps unelevated :disable="!rightsConfirmed" :loading="importingBook" @click="confirmBookImport" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { Dialog, Notify } from 'quasar';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import type { ReadingChapter, ReadingPage } from '@mentor-ai/shared';
import ContentMentorFeedback from 'src/components/ContentMentorFeedback.vue';
import { loadContentEngagementSummaries, recordContentEngagement, syncContentEngagement, type ContentEngagementSummary } from 'src/services/content-engagement';
import { loadContentProgress, saveContentProgress, syncAllContentProgress } from 'src/services/content-progress';
import { forgetOfflineLesson, markOfflineLessonOpened, registerOfflineStory } from 'src/services/offline-library';
import { deleteOfflineStory, formatStoryDuration, formatStorySize, getCachedStoryUrls, saveStoryOffline, storyLibrary, type LibraryStory } from 'src/services/story-library';
import { useAppStore } from 'src/stores/app-store';
import { configurePlaybackAudioSession, isIosStandalone, useRecoveringMediaPlayPause } from 'src/services/audio-session';
import { deletePersonalBook, importPersonalBook, listPersonalBooks, loadPersonalBook, markPersonalBookOpened, type PersonalBook } from 'src/services/personal-book-library';

const appStore = useAppStore();
type StoryLibraryTab = 'audio' | 'books';
const activeTabKey = 'mentor-ai:stories-library-tab';
const activeTab = ref<StoryLibraryTab>(readActiveTab());
const selectedStoryId = ref<string | null>(null);
const selectedBook = ref<PersonalBook | null>(null);
const selectedBookChapters = ref<ReadingChapter[]>([]);
const selectedBookPages = ref<ReadingPage[]>([]);
const currentBookPageIndex = ref(0);
const readerContent = ref<HTMLElement | null>(null);
const minReaderFontSize = 14;
const maxReaderFontSize = 32;
const readerFontSize = ref(20);
const readingMode = ref(false);
const personalBooks = ref<PersonalBook[]>([]);
const bookFileInput = ref<HTMLInputElement | null>(null);
const pendingBookFile = ref<File | null>(null);
const showImportConfirmation = ref(false);
const rightsConfirmed = ref(false);
const importingBook = ref(false);
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
let lastBookScrollSave = 0;
const playbackRates = [0.75, 1, 1.25, 1.5];
const selectedStory = computed(() => storyLibrary.find((story) => story.id === selectedStoryId.value) ?? null);
const offlineSummary = computed(() => `${storyLibrary.length} stories · ${formatStoryDuration(storyLibrary.reduce((sum, story) => sum + story.durationSeconds, 0))} total listening.`);
const currentBookPage = computed(() => selectedBookPages.value[currentBookPageIndex.value] ?? null);
const currentBookChapter = computed(() => selectedBookChapters.value.find((chapter) => chapter.id === currentBookPage.value?.chapterId) ?? null);
const currentBookParagraphs = computed(() => currentBookPage.value?.text.split(/\n{2,}/).filter(Boolean) ?? []);
const currentBookPartLabel = computed(() => formatBookPartLabel(currentBookPageIndex.value, currentBookChapter.value?.title));
const bookPageOptions = computed(() => selectedBookPages.value.map((page, index) => ({
  label: formatBookPartLabel(index, selectedBookChapters.value.find((chapter) => chapter.id === page.chapterId)?.title),
  value: index,
})));

onMounted(async () => {
  configurePlaybackAudioSession();
  personalBooks.value = await listPersonalBooks();
  cachedUrls.value = await getCachedStoryUrls();
  engagementSummaries.value = await loadContentEngagementSummaries('audio');
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('keydown', handleReaderKeydown);
  const requestedStoryId = new URLSearchParams(window.location.search).get('story');
  if (requestedStoryId && storyLibrary.some((story) => story.id === requestedStoryId)) {
    activeTab.value = 'audio';
    await openStory(requestedStoryId);
  }
});
onUnmounted(() => {
  persistProgress();
  persistBookProgress();
  applyReadingMode(false);
  clearMediaSession();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.removeEventListener('keydown', handleReaderKeydown);
});

async function openStory(id: string) {
  configurePlaybackAudioSession();
  selectedStoryId.value = id;
  markOfflineLessonOpened(id, 'stories');
  await nextTick();
  configureMediaSession();
}
function closeStory() { persistProgress(); audioElement.value?.pause(); selectedStoryId.value = null; clearMediaSession(); }
function closeDetail() {
  if (selectedStory.value) closeStory();
  if (selectedBook.value) closeBook();
}
function saveActiveTab(value: string | number) {
  if (value === 'audio' || value === 'books') localStorage.setItem(activeTabKey, value);
}
function readActiveTab(): StoryLibraryTab {
  if (typeof localStorage === 'undefined') return 'audio';
  return localStorage.getItem(activeTabKey) === 'books' ? 'books' : 'audio';
}
function chooseBookFile() { bookFileInput.value?.click(); }
function handleBookFileSelection(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  input.value = '';
  if (!file) return;
  pendingBookFile.value = file;
  rightsConfirmed.value = false;
  showImportConfirmation.value = true;
}
function cancelBookImport() {
  showImportConfirmation.value = false;
  pendingBookFile.value = null;
  rightsConfirmed.value = false;
}
async function confirmBookImport() {
  const file = pendingBookFile.value;
  if (!file || !rightsConfirmed.value) return;
  importingBook.value = true;
  try {
    const book = await importPersonalBook(file);
    personalBooks.value = await listPersonalBooks();
    cancelBookImport();
    Notify.create({ type: 'positive', message: `${book.title} is ready to read offline.` });
    await openBook(book.id);
  } catch (error) {
    Notify.create({ type: 'negative', message: error instanceof Error ? error.message : 'Could not import this book.' });
  } finally {
    importingBook.value = false;
  }
}
async function openBook(bookId: string) {
  const loaded = await loadPersonalBook(bookId);
  if (!loaded || loaded.pages.length === 0) {
    Notify.create({ type: 'negative', message: 'This book has no readable pages.' });
    return;
  }
  selectedBook.value = loaded.book;
  selectedBookChapters.value = loaded.chapters;
  selectedBookPages.value = loaded.pages;
  currentBookPageIndex.value = readBookProgress(loaded.book.id, loaded.pages.length).currentPageIndex;
  const readerSettings = readBookReaderSettings(loaded.book.id);
  readerFontSize.value = readerSettings.fontSize;
  await markPersonalBookOpened(loaded.book);
  personalBooks.value = await listPersonalBooks();
  applyReadingMode(readerSettings.readingMode);
  void nextTick(restoreBookScrollPosition);
}
function closeBook() {
  persistBookProgress();
  applyReadingMode(false);
  selectedBook.value = null;
  selectedBookChapters.value = [];
  selectedBookPages.value = [];
  currentBookPageIndex.value = 0;
}
function goToBookPage(pageIndex: number | null) {
  if (pageIndex === null || !Number.isInteger(pageIndex)) return;
  persistBookProgress();
  currentBookPageIndex.value = Math.max(0, Math.min(selectedBookPages.value.length - 1, pageIndex));
  persistBookProgress(false);
  void nextTick(restoreBookScrollPosition);
}
function formatBookPartLabel(index: number, title?: string) {
  const normalizedTitle = title?.replace(/\s+/g, ' ').trim();
  const genericTitle = normalizedTitle && !/^(chapter|part)\s+\d+$/i.test(normalizedTitle) ? normalizedTitle : 'Part';
  return `${index + 1}. ${genericTitle}`;
}
function setReadingMode(value: boolean) {
  const scrollTop = getReaderScroller()?.scrollTop ?? 0;
  applyReadingMode(value);
  saveBookReaderSettings();
  void nextTick(() => getReaderScroller()?.scrollTo({ top: scrollTop }));
}
function applyReadingMode(value: boolean) {
  readingMode.value = value;
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('body--book-reading-mode', value);
}
function changeReaderFontSize(change: -1 | 1) {
  readerFontSize.value = Math.max(minReaderFontSize, Math.min(maxReaderFontSize, readerFontSize.value + change));
  saveBookReaderSettings();
}
function bookReaderSettingsKey(bookId: string) { return `mentor-ai:personal-book-reader-settings:${bookId}`; }
function readBookReaderSettings(bookId: string): { readingMode: boolean; fontSize: number } {
  if (typeof localStorage === 'undefined') return { readingMode: false, fontSize: 20 };
  try {
    const parsed = JSON.parse(localStorage.getItem(bookReaderSettingsKey(bookId)) ?? 'null') as { readingMode?: boolean; fontSize?: number } | null;
    const fontSize = Math.max(minReaderFontSize, Math.min(maxReaderFontSize, Number(parsed?.fontSize) || 20));
    return { readingMode: parsed?.readingMode === true, fontSize };
  } catch {
    return { readingMode: false, fontSize: 20 };
  }
}
function saveBookReaderSettings() {
  const book = selectedBook.value;
  if (!book || typeof localStorage === 'undefined') return;
  localStorage.setItem(bookReaderSettingsKey(book.id), JSON.stringify({ readingMode: readingMode.value, fontSize: readerFontSize.value }));
}
function handleReaderKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && readingMode.value) setReadingMode(false);
}
function persistBookProgress(includeScroll = true) {
  const book = selectedBook.value;
  if (!book || typeof localStorage === 'undefined') return;
  const previous = readBookProgress(book.id, selectedBookPages.value.length);
  const scrollTopByPage = { ...previous.scrollTopByPage };
  if (includeScroll) scrollTopByPage[String(currentBookPageIndex.value)] = Math.max(0, Math.round(getReaderScroller()?.scrollTop ?? 0));
  localStorage.setItem(bookProgressKey(book.id), JSON.stringify({
    currentPageIndex: currentBookPageIndex.value,
    furthestPageIndex: Math.max(previous.furthestPageIndex, currentBookPageIndex.value),
    scrollTopByPage,
    updatedAt: new Date().toISOString(),
  }));
}
function bookProgressKey(bookId: string) { return `mentor-ai:personal-book-progress:${bookId}`; }
function readBookProgress(bookId: string, pageCount: number): { currentPageIndex: number; furthestPageIndex: number; scrollTopByPage: Record<string, number> } {
  if (typeof localStorage === 'undefined') return { currentPageIndex: 0, furthestPageIndex: -1, scrollTopByPage: {} };
  try {
    const parsed = JSON.parse(localStorage.getItem(bookProgressKey(bookId)) ?? 'null') as { currentPageIndex?: number; furthestPageIndex?: number; scrollTopByPage?: Record<string, number> } | null;
    const maxIndex = Math.max(0, pageCount - 1);
    return {
      currentPageIndex: Math.max(0, Math.min(maxIndex, Number(parsed?.currentPageIndex) || 0)),
      furthestPageIndex: Math.max(-1, Math.min(maxIndex, Number.isFinite(parsed?.furthestPageIndex) ? Number(parsed?.furthestPageIndex) : -1)),
      scrollTopByPage: parsed?.scrollTopByPage && typeof parsed.scrollTopByPage === 'object' ? parsed.scrollTopByPage : {},
    };
  } catch {
    return { currentPageIndex: 0, furthestPageIndex: -1, scrollTopByPage: {} };
  }
}
function getReaderScroller() { return readerContent.value; }
function restoreBookScrollPosition() {
  const book = selectedBook.value;
  if (!book) return;
  const progress = readBookProgress(book.id, selectedBookPages.value.length);
  const scrollTop = Number(progress.scrollTopByPage[String(currentBookPageIndex.value)]) || 0;
  getReaderScroller()?.scrollTo({ top: Math.max(0, scrollTop) });
}
function handleBookScroll() {
  if (Date.now() - lastBookScrollSave < 1_000) return;
  lastBookScrollSave = Date.now();
  persistBookProgress();
}
function confirmDeleteBook(book: PersonalBook) {
  Dialog.create({
    title: 'Delete this book?',
    message: `${book.title} and its local reading text will be removed from this device.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Delete', color: 'negative', noCaps: true },
  }).onOk(() => { void removeBook(book); });
}
async function removeBook(book: PersonalBook) {
  try {
    await deletePersonalBook(book.id);
    localStorage.removeItem(bookProgressKey(book.id));
    localStorage.removeItem(bookReaderSettingsKey(book.id));
    personalBooks.value = await listPersonalBooks();
    Notify.create({ type: 'positive', message: `${book.title} was removed from this device.` });
  } catch {
    Notify.create({ type: 'negative', message: 'Could not delete this book.' });
  }
}
function openStoryInSafari() {
  const story = selectedStory.value;
  if (!story) return;
  const url = new URL('/stories', window.location.origin);
  url.searchParams.set('story', story.id);
  url.searchParams.set('safari-audio', '1');
  window.open(url, '_blank', 'noopener');
}
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
  const usesNativeIosControls = useRecoveringMediaPlayPause(navigator.mediaSession, () => audioElement.value);
  if (usesNativeIosControls) return;
  navigator.mediaSession.setActionHandler('seekbackward', () => seek(Math.max(0, currentTime.value - 10)));
  navigator.mediaSession.setActionHandler('seekforward', () => seek(Math.min(duration.value, currentTime.value + 10)));
  navigator.mediaSession.setActionHandler('seekto', (details) => seek(details.seekTime ?? null));
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
