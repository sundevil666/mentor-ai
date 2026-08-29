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

      <section v-else-if="selectedBook && selectedBookPages.length" class="personal-reader" :class="{ 'personal-reader--focus': readingMode }" aria-label="Book reader">
        <div v-if="!readingMode" class="personal-reader__toolbar">
          <q-btn color="primary" icon="fullscreen" label="Reading mode" no-caps outline @click="setReadingMode(true)" />
          <q-select
            dense
            emit-value
            map-options
            outlined
            label="Chapter / part"
            :model-value="currentBookChapterPageIndex"
            :options="bookPageOptions"
            @update:model-value="goToBookPage"
          />
          <span>{{ currentBookPageIndex + 1 }} / {{ readerPageCount }}</span>
        </div>
        <div v-if="!readingMode" class="personal-reader__progress" aria-label="Reading progress">
          <span>Page {{ currentBookPageIndex + 1 }}</span>
          <q-linear-progress rounded size="8px" :value="(currentBookPageIndex + 1) / readerPageCount" color="primary" track-color="grey-3" />
          <span>{{ readerPageCount }} {{ readerPageCount === 1 ? 'page' : 'pages' }}</span>
        </div>
        <div ref="readerContent" class="personal-reader__content">
          <article ref="readerPaper" class="personal-reader__paper" :style="{ fontSize: `${readerFontSize}px` }" @click="handleReaderTextTap">
            <section
              v-for="(page, pageIndex) in selectedBookPages"
              :key="page.id"
              class="personal-reader__chapter"
              :data-book-chapter-index="pageIndex"
            >
              <h2 class="personal-reader__part">{{ formatBookPartLabel(pageIndex, getChapterTitle(page.chapterId)) }}</h2>
              <p v-for="(paragraph, paragraphIndex) in splitBookParagraphs(page.text)" :key="paragraphIndex">
                <template v-for="(token, tokenIndex) in tokenizeReaderParagraph(paragraph)" :key="tokenIndex">
                  <span
                    v-if="token.isWord"
                    class="personal-reader__word"
                    :class="{ 'personal-reader__word--loading': readerLookupLoading && token.text.toLocaleLowerCase('en') === selectedReaderText.toLocaleLowerCase('en') }"
                    :data-reader-word="token.text"
                  >{{ token.text }}</span>
                  <template v-else>{{ token.text }}</template>
                </template>
              </p>
            </section>
          </article>
          <span class="personal-reader__end-spacer" aria-hidden="true" />
        </div>

        <aside v-if="readingMode" class="personal-reader__sidebar" aria-label="Reading controls">
          <div class="personal-reader__progress personal-reader__sidebar-progress" aria-label="Reading progress">
            <div>
              <span>Page {{ currentBookPageIndex + 1 }}</span>
              <span>{{ readerPageCount }} {{ readerPageCount === 1 ? 'page' : 'pages' }}</span>
            </div>
            <q-linear-progress rounded size="8px" :value="(currentBookPageIndex + 1) / readerPageCount" color="primary" track-color="grey-3" />
          </div>

          <q-btn class="personal-reader__exit" color="primary" icon="close_fullscreen" label="Exit reading" no-caps outline @click="setReadingMode(false)" />

          <div class="personal-reader__font-controls" aria-label="Text size">
            <span>Text {{ readerFontSize }} px</span>
            <div>
              <q-btn aria-label="Decrease text size" icon="text_decrease" outline round :disable="readerFontSize <= minReaderFontSize" @click="changeReaderFontSize(-1)" />
              <q-btn aria-label="Increase text size" color="primary" icon="text_increase" round unelevated :disable="readerFontSize >= maxReaderFontSize" @click="changeReaderFontSize(1)" />
            </div>
          </div>

          <section class="personal-reader__lookup" aria-live="polite" aria-label="Selected text helper">
            <div v-if="selectedReaderText" class="personal-reader__lookup-heading">
              <strong>{{ readerLookupKind === 'word' ? 'Word' : 'Phrase' }}</strong>
              <q-btn aria-label="Play selected text" color="primary" icon="volume_up" round size="sm" unelevated @click="speakReaderText(selectedReaderText)" />
            </div>
            <p v-if="selectedReaderText" class="personal-reader__lookup-text">{{ selectedReaderText }}</p>
            <p v-if="readerPhonetic" class="personal-reader__lookup-phonetic">{{ readerPhonetic }}</p>
            <div v-else-if="readerPhoneticLoading && readerLookupKind === 'word'" class="personal-reader__lookup-loading personal-reader__lookup-loading--phonetic">
              <q-spinner color="primary" size="16px" />
              <span>Loading transcription…</span>
            </div>
            <p v-else-if="readerLookup && readerLookupKind === 'word'" class="personal-reader__lookup-phonetic">Transcription not found.</p>
            <p v-else-if="readerLookup" class="personal-reader__lookup-phonetic">IPA transcription is available for single words.</p>
            <div v-if="readerLookupLoading" class="personal-reader__lookup-loading">
              <q-spinner color="primary" size="24px" />
              <span>Translating…</span>
            </div>
            <p v-else-if="readerLookup?.translation" class="personal-reader__lookup-translation">{{ readerLookup.translation }}</p>
            <p v-else-if="readerLookup?.translationError" class="personal-reader__lookup-error">{{ readerLookup.translationError }}</p>
            <p v-else-if="readerLookupError" class="personal-reader__lookup-error">{{ readerLookupError }}</p>
            <p v-else class="personal-reader__lookup-hint">Tap a word, or press and hold to select a phrase.</p>
          </section>

          <div class="personal-reader__sidebar-navigation">
            <q-select
              dense
              emit-value
              map-options
              outlined
              label="Chapter / part"
              :model-value="currentBookChapterPageIndex"
              :options="bookPageOptions"
              @update:model-value="goToBookPage"
            />
            <span>{{ currentBookPageIndex + 1 }} / {{ readerPageCount }}</span>
            <nav aria-label="Book navigation">
              <q-btn aria-label="Previous part" color="primary" icon="arrow_back" round unelevated :disable="currentBookPageIndex === 0" @click="goToBookPage(currentBookPageIndex - 1)" />
              <q-btn aria-label="Next part" color="primary" icon="arrow_forward" round unelevated :disable="currentBookPageIndex >= readerPageCount - 1" @click="goToBookPage(currentBookPageIndex + 1)" />
            </nav>
          </div>
        </aside>

        <nav v-else class="personal-reader__navigation" aria-label="Book navigation">
          <q-btn aria-label="Previous part" class="personal-reader__previous" color="primary" icon="arrow_back" round unelevated :disable="currentBookPageIndex === 0" @click="goToBookPage(currentBookPageIndex - 1)" />
          <q-btn aria-label="Next part" class="personal-reader__next" color="primary" icon="arrow_forward" round unelevated :disable="currentBookPageIndex >= readerPageCount - 1" @click="goToBookPage(currentBookPageIndex + 1)" />
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
import type { ReaderTextLookup, ReadingChapter, ReadingPage } from '@mentor-ai/shared';
import ContentMentorFeedback from 'src/components/ContentMentorFeedback.vue';
import { loadContentEngagementSummaries, recordContentEngagement, syncContentEngagement, type ContentEngagementSummary } from 'src/services/content-engagement';
import { loadContentProgress, saveContentProgress, syncAllContentProgress } from 'src/services/content-progress';
import { forgetOfflineLesson, markOfflineLessonOpened, registerOfflineStory } from 'src/services/offline-library';
import { deleteOfflineStory, formatStoryDuration, formatStorySize, getCachedStoryUrls, saveStoryOffline, storyLibrary, type LibraryStory } from 'src/services/story-library';
import { useAppStore } from 'src/stores/app-store';
import { configurePlaybackAudioSession, isIosStandalone, useRecoveringMediaPlayPause } from 'src/services/audio-session';
import { deletePersonalBook, importPersonalBook, listPersonalBooks, loadPersonalBook, markPersonalBookOpened, type PersonalBook } from 'src/services/personal-book-library';
import { fetchReaderPhonetic, fetchReaderTextLookup, synchronizeReaderVocabulary } from 'src/services/api-client';
import { findReaderVocabularyLookup, listReaderVocabulary, recordReaderVocabularyLookup } from 'src/services/reader-vocabulary';
import { speakWithPreferredVoice } from 'src/services/speech-synthesis';

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
const readerPaper = ref<HTMLElement | null>(null);
const readerPageCount = ref(1);
const readerPageStride = ref(1);
const chapterPageIndexes = ref<number[]>([]);
const selectedReaderText = ref('');
const readerLookup = ref<ReaderTextLookup | null>(null);
const readerLookupLoading = ref(false);
const readerPhonetic = ref<string | undefined>();
const readerPhoneticLoading = ref(false);
const readerLookupError = ref('');
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
let readerResizeObserver: ResizeObserver | null = null;
let readerResizeFrame = 0;
let lastReaderViewportWidth = 0;
let lastReaderViewportHeight = 0;
let readerSelectionTimer = 0;
let readerLookupRequestId = 0;
const playbackRates = [0.75, 1, 1.25, 1.5];
const selectedStory = computed(() => storyLibrary.find((story) => story.id === selectedStoryId.value) ?? null);
const offlineSummary = computed(() => `${storyLibrary.length} stories · ${formatStoryDuration(storyLibrary.reduce((sum, story) => sum + story.durationSeconds, 0))} total listening.`);
const currentBookChapterIndex = computed(() => {
  let activeIndex = 0;
  chapterPageIndexes.value.forEach((pageIndex, chapterIndex) => {
    if (pageIndex <= currentBookPageIndex.value) activeIndex = chapterIndex;
  });
  return activeIndex;
});
const currentBookChapterPageIndex = computed(() => chapterPageIndexes.value[currentBookChapterIndex.value] ?? 0);
const readerLookupKind = computed(() => /\s/.test(selectedReaderText.value) ? 'phrase' : 'word');
const bookPageOptions = computed(() => selectedBookPages.value.map((page, index) => ({
  label: formatBookPartLabel(index, selectedBookChapters.value.find((chapter) => chapter.id === page.chapterId)?.title),
  value: chapterPageIndexes.value[index] ?? 0,
})));

onMounted(async () => {
  configurePlaybackAudioSession();
  personalBooks.value = await listPersonalBooks();
  cachedUrls.value = await getCachedStoryUrls();
  engagementSummaries.value = await loadContentEngagementSummaries('audio');
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('keydown', handleReaderKeydown);
  document.addEventListener('selectionchange', handleReaderSelectionChange);
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
  stopReaderPagination();
  clearMediaSession();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.removeEventListener('keydown', handleReaderKeydown);
  document.removeEventListener('selectionchange', handleReaderSelectionChange);
  window.clearTimeout(readerSelectionTimer);
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
  currentBookPageIndex.value = 0;
  readerPageCount.value = 1;
  readerPageStride.value = 1;
  chapterPageIndexes.value = loaded.pages.map(() => 0);
  const readerSettings = readBookReaderSettings(loaded.book.id);
  readerFontSize.value = readerSettings.fontSize;
  await markPersonalBookOpened(loaded.book);
  personalBooks.value = await listPersonalBooks();
  applyReadingMode(readerSettings.readingMode);
  await nextTick();
  await repaginateReader(readBookProgress(loaded.book.id, loaded.pages.length));
  startReaderPagination();
}
function closeBook() {
  persistBookProgress();
  stopReaderPagination();
  applyReadingMode(false);
  selectedBook.value = null;
  selectedBookChapters.value = [];
  selectedBookPages.value = [];
  currentBookPageIndex.value = 0;
  readerPageCount.value = 1;
  readerPageStride.value = 1;
  chapterPageIndexes.value = [];
  clearReaderLookup();
}
function goToBookPage(pageIndex: number | null) {
  if (pageIndex === null || !Number.isInteger(pageIndex)) return;
  persistBookProgress();
  currentBookPageIndex.value = Math.max(0, Math.min(readerPageCount.value - 1, pageIndex));
  scrollToReaderPage();
  persistBookProgress();
}
function formatBookPartLabel(index: number, title?: string) {
  const normalizedTitle = title?.replace(/\s+/g, ' ').trim();
  const genericTitle = normalizedTitle && !/^(chapter|part)\s+\d+$/i.test(normalizedTitle) ? normalizedTitle : 'Part';
  return `${index + 1}. ${genericTitle}`;
}
function getChapterTitle(chapterId?: string) {
  return selectedBookChapters.value.find((chapter) => chapter.id === chapterId)?.title;
}
function splitBookParagraphs(text: string) {
  return text.split(/\n{2,}/).filter(Boolean);
}
function tokenizeReaderParagraph(text: string): Array<{ text: string; isWord: boolean }> {
  return text.split(/([\p{L}]+(?:[-'’][\p{L}]+)*)/gu).filter(Boolean).map((token) => ({
    text: token,
    isWord: /^[\p{L}]+(?:[-'’][\p{L}]+)*$/u.test(token),
  }));
}
function handleReaderTextTap(event: MouseEvent) {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed && isReaderSelection(selection)) {
    queueReaderSelectionLookup();
    return;
  }
  const targetWord = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-reader-word]')?.dataset.readerWord : undefined;
  const word = targetWord ?? getWordAtPoint(event.clientX, event.clientY);
  if (word) void selectReaderText(word, true);
}
function handleReaderSelectionChange() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !isReaderSelection(selection)) return;
  queueReaderSelectionLookup();
}
function queueReaderSelectionLookup() {
  window.clearTimeout(readerSelectionTimer);
  readerSelectionTimer = window.setTimeout(() => {
    const selection = window.getSelection();
    const text = selection && isReaderSelection(selection) ? normalizeReaderSelection(selection.toString()) : '';
    if (text) void selectReaderText(text, false);
  }, 450);
}
function isReaderSelection(selection: Selection) {
  const paper = readerPaper.value;
  return Boolean(paper && selection.anchorNode && selection.focusNode && paper.contains(selection.anchorNode) && paper.contains(selection.focusNode));
}
function getWordAtPoint(x: number, y: number) {
  const documentWithCaret = document as Document & {
    caretRangeFromPoint?: (clientX: number, clientY: number) => Range | null;
    caretPositionFromPoint?: (clientX: number, clientY: number) => { offsetNode: Node; offset: number } | null;
  };
  let node: Node | null = null;
  let offset = 0;
  const range = documentWithCaret.caretRangeFromPoint?.(x, y);
  if (range) {
    node = range.startContainer;
    offset = range.startOffset;
  } else {
    const position = documentWithCaret.caretPositionFromPoint?.(x, y);
    node = position?.offsetNode ?? null;
    offset = position?.offset ?? 0;
  }
  if (!node || node.nodeType !== Node.TEXT_NODE || !readerPaper.value?.contains(node)) return '';
  const text = node.textContent ?? '';
  const matches = Array.from(text.matchAll(/[\p{L}]+(?:[-'’][\p{L}]+)*/gu));
  return matches.find((match) => {
    const start = match.index ?? 0;
    return offset >= start && offset <= start + match[0].length;
  })?.[0] ?? '';
}
function normalizeReaderSelection(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 500);
}
async function selectReaderText(rawText: string, speakImmediately: boolean) {
  const text = normalizeReaderSelection(rawText);
  if (!text || !selectedBook.value) return;
  selectedReaderText.value = text;
  readerLookup.value = null;
  readerPhonetic.value = undefined;
  readerLookupError.value = '';
  readerLookupLoading.value = true;
  readerPhoneticLoading.value = !/\s/.test(text);
  const requestId = ++readerLookupRequestId;
  if (speakImmediately) void speakReaderText(text);
  const cachedLookup = await findReaderVocabularyLookup(appStore.studentId, text).catch(() => null);
  if (requestId !== readerLookupRequestId) return;
  if (cachedLookup) {
    readerLookup.value = cachedLookup;
    readerPhonetic.value = cachedLookup.phonetic;
    readerLookupLoading.value = false;
    if (!cachedLookup.phonetic && !/\s/.test(text)) void loadReaderPhonetic(text, requestId);
    await saveReaderLookup(cachedLookup, requestId);
    return;
  }
  if (!/\s/.test(text)) void loadReaderPhonetic(text, requestId);
  try {
    const lookup = await fetchReaderTextLookup(text);
    if (requestId !== readerLookupRequestId) return;
    readerLookup.value = lookup;
    if (lookup.translation) await saveReaderLookup(lookup, requestId);
  } catch (error) {
    if (requestId === readerLookupRequestId) readerLookupError.value = error instanceof Error ? error.message : 'Translation is unavailable right now.';
  } finally {
    if (requestId === readerLookupRequestId) readerLookupLoading.value = false;
  }
}
async function loadReaderPhonetic(text: string, requestId: number) {
  try {
    const phonetic = await fetchReaderPhonetic(text);
    if (requestId === readerLookupRequestId) readerPhonetic.value = phonetic;
  } finally {
    if (requestId === readerLookupRequestId) readerPhoneticLoading.value = false;
  }
}
async function saveReaderLookup(lookup: ReaderTextLookup, requestId: number) {
  const book = selectedBook.value;
  if (!book || requestId !== readerLookupRequestId) return;
  await recordReaderVocabularyLookup({
    studentId: appStore.studentId,
    bookId: book.id,
    chapterId: selectedBookPages.value[currentBookChapterIndex.value]?.chapterId,
    lookup: { ...lookup, phonetic: readerPhonetic.value ?? lookup.phonetic },
  });
  void syncReaderVocabulary();
}
async function syncReaderVocabulary() {
  try {
    await synchronizeReaderVocabulary(await listReaderVocabulary(appStore.studentId));
  } catch {
    // The local vocabulary record remains available and retries on the next lookup.
  }
}
async function speakReaderText(text: string) {
  const played = await speakWithPreferredVoice(text, { mediaTitle: `Book: ${selectedBook.value?.title ?? 'selected text'}` });
  if (!played) Notify.create({ type: 'warning', message: 'Pronunciation is unavailable right now.' });
}
function clearReaderLookup() {
  readerLookupRequestId += 1;
  selectedReaderText.value = '';
  readerLookup.value = null;
  readerLookupLoading.value = false;
  readerPhonetic.value = undefined;
  readerPhoneticLoading.value = false;
  readerLookupError.value = '';
}
function setReadingMode(value: boolean) {
  const progressRatio = getCurrentReaderProgressRatio();
  applyReadingMode(value);
  saveBookReaderSettings();
  void repaginateReader({ progressRatio });
}
function applyReadingMode(value: boolean) {
  readingMode.value = value;
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('body--book-reading-mode', value);
}
function changeReaderFontSize(change: -1 | 1) {
  const progressRatio = getCurrentReaderProgressRatio();
  readerFontSize.value = Math.max(minReaderFontSize, Math.min(maxReaderFontSize, readerFontSize.value + change));
  saveBookReaderSettings();
  void repaginateReader({ progressRatio });
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
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (event.key === 'ArrowLeft') goToBookPage(currentBookPageIndex.value - 1);
  if (event.key === 'ArrowRight') goToBookPage(currentBookPageIndex.value + 1);
}
function persistBookProgress() {
  const book = selectedBook.value;
  if (!book || typeof localStorage === 'undefined') return;
  const previous = readBookProgress(book.id, selectedBookPages.value.length);
  const progressRatio = getCurrentReaderProgressRatio();
  localStorage.setItem(bookProgressKey(book.id), JSON.stringify({
    version: 2,
    currentPageIndex: currentBookPageIndex.value,
    pageCountAtSave: readerPageCount.value,
    progressRatio,
    furthestProgressRatio: Math.max(previous.furthestProgressRatio ?? 0, progressRatio),
    chapterId: selectedBookPages.value[currentBookChapterIndex.value]?.chapterId,
    updatedAt: new Date().toISOString(),
  }));
}
function bookProgressKey(bookId: string) { return `mentor-ai:personal-book-progress:${bookId}`; }
interface BookReaderProgress {
  progressRatio?: number;
  furthestProgressRatio?: number;
  legacyChapterIndex?: number;
}
function readBookProgress(bookId: string, chapterCount: number): BookReaderProgress {
  if (typeof localStorage === 'undefined') return { progressRatio: 0, furthestProgressRatio: 0 };
  try {
    const parsed = JSON.parse(localStorage.getItem(bookProgressKey(bookId)) ?? 'null') as { version?: number; currentPageIndex?: number; progressRatio?: number; furthestProgressRatio?: number } | null;
    if (parsed?.version === 2) {
      return {
        progressRatio: clampProgressRatio(parsed.progressRatio),
        furthestProgressRatio: clampProgressRatio(parsed.furthestProgressRatio),
      };
    }
    return {
      furthestProgressRatio: 0,
      legacyChapterIndex: Math.max(0, Math.min(Math.max(0, chapterCount - 1), Number(parsed?.currentPageIndex) || 0)),
    };
  } catch {
    return { progressRatio: 0, furthestProgressRatio: 0 };
  }
}
function clampProgressRatio(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.min(1, numericValue)) : 0;
}
function getCurrentReaderProgressRatio() {
  return readerPageCount.value <= 1 ? 0 : currentBookPageIndex.value / (readerPageCount.value - 1);
}
function startReaderPagination() {
  stopReaderPagination();
  if (typeof ResizeObserver === 'undefined' || !readerContent.value) return;
  lastReaderViewportWidth = Math.round(readerContent.value.getBoundingClientRect().width);
  lastReaderViewportHeight = Math.round(readerContent.value.getBoundingClientRect().height);
  readerResizeObserver = new ResizeObserver(([entry]) => {
    const width = Math.round(entry?.contentRect.width ?? 0);
    const height = Math.round(entry?.contentRect.height ?? 0);
    if (width === lastReaderViewportWidth && height === lastReaderViewportHeight) return;
    lastReaderViewportWidth = width;
    lastReaderViewportHeight = height;
    cancelAnimationFrame(readerResizeFrame);
    const progressRatio = getCurrentReaderProgressRatio();
    readerResizeFrame = requestAnimationFrame(() => { void repaginateReader({ progressRatio }); });
  });
  readerResizeObserver.observe(readerContent.value);
}
function stopReaderPagination() {
  readerResizeObserver?.disconnect();
  readerResizeObserver = null;
  cancelAnimationFrame(readerResizeFrame);
  lastReaderViewportWidth = 0;
  lastReaderViewportHeight = 0;
}
async function repaginateReader(position: BookReaderProgress = { progressRatio: getCurrentReaderProgressRatio(), furthestProgressRatio: 0 }) {
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const viewport = readerContent.value;
  const paper = readerPaper.value;
  if (!viewport || !paper || viewport.clientWidth <= 0) return;
  const pageWidth = viewport.clientWidth;
  const viewportStyle = getComputedStyle(viewport);
  const horizontalGutter = Number.parseFloat(viewportStyle.paddingLeft) + Number.parseFloat(viewportStyle.paddingRight);
  const columnWidth = Math.max(120, pageWidth - horizontalGutter);
  paper.style.setProperty('--reader-column-width', `${columnWidth}px`);
  paper.style.setProperty('--reader-column-gap', `${horizontalGutter}px`);
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  readerPageCount.value = Math.max(1, Math.ceil((paper.scrollWidth + horizontalGutter - 1) / pageWidth));
  readerPageStride.value = (paper.scrollWidth + horizontalGutter) / readerPageCount.value;
  viewport.style.setProperty('--reader-paper-scroll-width', `${paper.scrollWidth}px`);
  viewport.style.setProperty('--reader-end-gutter', `${horizontalGutter + Math.max(0, pageWidth - readerPageStride.value)}px`);
  chapterPageIndexes.value = selectedBookPages.value.map((_, chapterIndex) => {
    const chapter = paper.querySelector<HTMLElement>(`[data-book-chapter-index="${chapterIndex}"]`);
    return Math.max(0, Math.min(readerPageCount.value - 1, Math.floor(((chapter?.offsetLeft ?? 0) + 1) / readerPageStride.value)));
  });
  if (position.legacyChapterIndex !== undefined) {
    currentBookPageIndex.value = chapterPageIndexes.value[position.legacyChapterIndex] ?? 0;
  } else {
    currentBookPageIndex.value = Math.round(clampProgressRatio(position.progressRatio) * Math.max(0, readerPageCount.value - 1));
  }
  scrollToReaderPage(false);
  persistBookProgress();
}
function scrollToReaderPage(smooth = true) {
  const viewport = readerContent.value;
  if (!viewport) return;
  viewport.scrollTo({ left: currentBookPageIndex.value * readerPageStride.value, top: 0, behavior: smooth ? 'smooth' : 'auto' });
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
