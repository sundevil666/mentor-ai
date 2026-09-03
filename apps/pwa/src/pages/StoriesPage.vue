<template>
  <q-page
    class="videos-page"
    :class="[
      isAudioLibrary ? 'category-theme--audio' : 'category-theme--stories',
      {
        'videos-page--detail': selectedStory || selectedBook,
        'videos-page--audio-detail': selectedStory,
        'videos-page--book-detail': selectedBook,
        'videos-page--reading-mode': readingMode,
      },
    ]"
  >
    <section class="videos-shell" :class="{ 'videos-shell--detail': selectedStory || selectedBook, 'videos-shell--book-detail': selectedBook }">
      <header
        v-if="!readingMode"
        class="videos-header"
        :class="{ 'videos-header--book-detail': selectedBook }"
      >
        <q-btn
          v-if="selectedStory || selectedBook"
          aria-label="Back to library"
          class="app-back-button"
          color="primary"
          flat
          icon="arrow_back"
          round
          @click="closeDetail"
        />
        <div>
          <p>{{ isAudioLibrary ? 'English audio library' : 'Your private English library' }}</p>
          <h1>{{ selectedStory?.title ?? selectedBook?.title ?? (isAudioLibrary ? 'Audio stories' : 'Reading') }}</h1>
        </div>
      </header>

      <AudioLibraryTabs
        v-if="isAudioLibrary && !selectedStory"
        active-tab="stories"
      />

      <q-tabs
        v-if="!isAudioLibrary && !selectedBook"
        v-model="activeReadingCategory"
        class="story-library-tabs"
        active-color="primary"
        align="justify"
        indicator-color="primary"
        no-caps
      >
        <q-tab
          v-for="category in readingCategories"
          :key="category.id"
          :icon="category.icon"
          :label="category.label"
          :name="category.id"
        />
      </q-tabs>

      <section v-if="isAudioLibrary && !selectedStory" class="video-library" aria-label="Audio stories library">
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
        <AppAudioDock
          :current-time="currentTime"
          :duration="duration"
          :fallback-duration="selectedStory.durationSeconds"
          :playback-rate="playbackRate"
          :playing="playing"
          :repeat="repeat"
          :speed-preference-key="`story:${selectedStory.id}`"
          progress-label="Story progress"
          show-repeat
          @seek="seek"
          @toggle-playback="togglePlayback"
          @update:playback-rate="setPlaybackRate"
          @update:repeat="repeat = $event"
        />
      </section>

      <section v-else-if="!isAudioLibrary && !selectedBook && activeReadingCategory === 'fiction'" class="personal-books" aria-label="Fiction books">
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

      <section v-else-if="selectedBook && selectedBookPages.length" class="personal-reader" :class="{ 'personal-reader--focus': readingMode }" :style="[readerSidebarStyle, readerSpeechFrameStyle]" aria-label="Book reader">
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
            @update:model-value="goToBookChapter"
          />
          <span>{{ currentBookPageIndex + 1 }} / {{ readerPageCount }}</span>
        </div>
        <div v-if="!readingMode" class="personal-reader__progress" aria-label="Reading progress">
          <span>Page {{ currentBookPageIndex + 1 }}</span>
          <q-linear-progress rounded size="8px" :value="(currentBookPageIndex + 1) / readerPageCount" color="primary" track-color="grey-3" />
          <span>{{ readerPageCount }} {{ readerPageCount === 1 ? 'page' : 'pages' }}</span>
        </div>
        <div
          ref="readerContent"
          class="personal-reader__content"
          :class="{
            'personal-reader__content--listening': readingSpeechActive,
            'personal-reader__content--hearing': readingSpeechActive && readingSpeechHasSignal,
            'personal-reader__content--dragging': readerDragging,
          }"
          @touchstart="handleReaderTouchStart"
          @touchmove="handleReaderTouchMove"
          @touchend="handleReaderTouchEnd"
          @touchcancel="resetReaderTouch"
        >
          <article ref="readerPaper" class="personal-reader__paper" :style="{ fontSize: `${readerFontSize}px` }" @click="handleReaderTextTap">
            <section
              v-for="(page, pageIndex) in renderedBookPages"
              :key="page.id"
              class="personal-reader__chapter"
              :data-book-chapter-index="pageIndex"
            >
              <h2 class="personal-reader__part">{{ formatBookPartLabel(pageIndex, getChapterTitle(page.chapterId)) }}</h2>
              <p v-for="(paragraph, paragraphIndex) in page.paragraphs" :key="paragraphIndex">
                <template v-for="(token, tokenIndex) in paragraph" :key="tokenIndex">
                  <span
                    v-if="token.isWord"
                    class="personal-reader__word"
                    :class="{
                      'personal-reader__word--loading': readerLookupLoading && token.text.toLocaleLowerCase('en') === selectedReaderText.toLocaleLowerCase('en'),
                      'personal-reader__word--selected': token.wordIndex === selectedReaderWordIndex,
                      'personal-reader__word--marker': token.wordIndex === readerMarkerWordIndex,
                      'personal-reader__word--spoken': token.wordIndex !== undefined && spokenReaderWordIndexes.has(token.wordIndex),
                    }"
                    :data-reader-word="token.text"
                    :data-reader-word-index="token.wordIndex"
                  >{{ token.text }}</span>
                  <template v-else>{{ token.text }}</template>
                </template>
              </p>
            </section>
          </article>
          <span class="personal-reader__end-spacer" aria-hidden="true" />
        </div>

        <div
          v-if="readingMode && readingSpeechActive"
          class="personal-reader__speech-frame"
          :class="{ 'personal-reader__speech-frame--hearing': readingSpeechHasSignal }"
          aria-hidden="true"
        >
          <span class="personal-reader__speech-frame-base" />
          <span class="personal-reader__speech-frame-wave" />
        </div>

        <aside v-if="readingMode" class="personal-reader__sidebar" aria-label="Reading controls">
          <div class="personal-reader__sidebar-actions">
            <q-btn class="personal-reader__exit" color="primary" icon="close_fullscreen" label="Exit reading" no-caps outline @click="setReadingMode(false)" />
            <q-btn aria-label="Reading settings" icon="more_vert" outline round>
              <q-menu anchor="bottom right" self="top right">
                <div class="personal-reader__settings-menu">
                  <div class="personal-reader__font-controls" aria-label="Text size">
                    <span>Text {{ readerFontSize }} px</span>
                    <div>
                      <q-btn aria-label="Decrease text size" icon="text_decrease" outline round :disable="readerFontSize <= minReaderFontSize" @click="changeReaderFontSize(-1)" />
                      <q-btn aria-label="Increase text size" color="primary" icon="text_increase" round unelevated :disable="readerFontSize >= maxReaderFontSize" @click="changeReaderFontSize(1)" />
                    </div>
                  </div>

                  <div class="personal-reader__sidebar-size-controls" aria-label="Sidebar size">
                    <span>Panel {{ readerSidebarScalePercent }}%</span>
                    <div>
                      <q-btn aria-label="Decrease sidebar size" icon="zoom_out" outline round :disable="readerSidebarScale <= minReaderSidebarScale" @click="changeReaderSidebarScale(-1)" />
                      <q-btn aria-label="Increase sidebar size" color="primary" icon="zoom_in" round unelevated :disable="readerSidebarScale >= maxReaderSidebarScale" @click="changeReaderSidebarScale(1)" />
                    </div>
                  </div>
                </div>
              </q-menu>
            </q-btn>
          </div>

          <section class="personal-reader__daily-goal" :class="`personal-reader__daily-goal--${dailyReadingGoalState}`" aria-label="Today's reading goal">
            <div class="personal-reader__daily-goal-heading">
              <span>Today</span>
              <strong>{{ dailyReadingWords.toLocaleString('en') }} / {{ dailyReadingTarget.toLocaleString('en') }}</strong>
            </div>
            <q-linear-progress
              rounded
              size="12px"
              :value="dailyReadingProgressRatio"
              :color="dailyReadingGoalState === 'exceeded' ? 'positive' : 'primary'"
              track-color="grey-3"
            />
            <p>{{ dailyReadingGoalMessage }}</p>
            <small>{{ dailyReadingWordsRemaining.toLocaleString('en') }} words left today · counted from completed pages</small>
            <small v-if="dailyReadingTarget > dailyReadingGoalWords">Your recent average is raising the level above the 3,000-word base.</small>
            <div class="personal-reader__annual-pace" :class="{ 'personal-reader__annual-pace--ahead': annualReadingPaceBalance >= 0 }">
              <div class="personal-reader__daily-goal-heading">
                <span>Year pace</span>
                <strong>{{ annualReadingPaceTotal.toLocaleString('en') }} / {{ annualReadingPaceExpected.toLocaleString('en') }}</strong>
              </div>
              <small>{{ annualReadingPaceMessage }}</small>
              <small>Calendar year · days before tracking use the 3,000-word base.</small>
            </div>
          </section>

          <section class="personal-reader__speech-coach" :class="`personal-reader__speech-coach--${readingSpeechStatus}`" aria-live="polite" aria-label="Reading pronunciation coach">
            <button
              class="personal-reader__speech-orb"
              :class="{
                'personal-reader__speech-orb--active': readingSpeechActive,
                'personal-reader__speech-orb--hearing': readingSpeechActive && readingSpeechHasSignal,
                'personal-reader__speech-orb--error': readingSpeechStatus === 'error',
              }"
              :aria-label="readingSpeechActionLabel"
              :aria-pressed="readingSpeechActive"
              :disabled="readingSpeechTransitioning"
              :style="{ '--reader-speech-level': String(Math.max(0.08, readingSpeechLevel)) }"
              type="button"
              @click="toggleReadingSpeech"
            >
              <span v-for="bar in 7" :key="bar" :style="{ '--speech-bar': String(bar) }" />
              <q-icon name="mic" />
            </button>
            <div class="personal-reader__microphone-status" :class="`personal-reader__microphone-status--${readingMicrophoneIndicator.tone}`" role="status">
              <span class="personal-reader__microphone-status-dot" aria-hidden="true" />
              <strong>{{ readingMicrophoneIndicator.title }}</strong>
            </div>
            <div v-if="readingSpeechPermissionBlocked || readingSpeechCaptureUnavailable" class="personal-reader__speech-actions">
              <q-btn
                aria-label="Microphone access help"
                color="negative"
                flat
                icon="settings"
                round
                @click="showMicrophoneAccessHelp"
              />
            </div>
          </section>

          <section
            class="personal-reader__lookup"
            aria-live="polite"
            aria-label="Selected text helper"
            :style="{ fontSize: `${readerFontSize}px` }"
          >
            <div v-if="selectedReaderText" class="personal-reader__lookup-heading">
              <strong>{{ readerLookupKind === 'word' ? 'Word' : 'Phrase' }}</strong>
              <div>
                <q-btn
                  v-if="selectedReaderWordIndex !== null"
                  :aria-label="selectedReaderWordIndex === readerMarkerWordIndex ? 'Remove reading marker' : 'Mark this reading place'"
                  :color="selectedReaderWordIndex === readerMarkerWordIndex ? 'positive' : 'primary'"
                  :icon="selectedReaderWordIndex === readerMarkerWordIndex ? 'bookmark' : 'bookmark_add'"
                  round
                  size="sm"
                  :outline="selectedReaderWordIndex !== readerMarkerWordIndex"
                  @click="toggleReaderMarker"
                />
                <q-btn aria-label="Play selected text" color="primary" icon="volume_up" round size="sm" unelevated @click="speakReaderText(selectedReaderText)" />
              </div>
            </div>
            <p v-if="selectedReaderText" class="personal-reader__lookup-text">{{ selectedReaderText }}</p>
            <p v-if="readerPhonetic" class="personal-reader__lookup-phonetic">{{ readerPhonetic }}</p>
            <div v-else-if="readerPhoneticLoading && readerLookupKind === 'word'" class="personal-reader__lookup-loading personal-reader__lookup-loading--phonetic">
              <q-spinner color="primary" size="16px" />
              <span>Loading transcription…</span>
            </div>
            <div class="personal-reader__lookup-result">
              <div v-if="readerLookupLoading" class="personal-reader__lookup-loading">
                <q-spinner color="primary" size="24px" />
                <span>Translating…</span>
              </div>
              <p v-else-if="readerLookup?.translation" class="personal-reader__lookup-translation">{{ readerLookup.translation }}</p>
              <p v-else-if="readerLookup?.translationError" class="personal-reader__lookup-error">{{ readerLookup.translationError }}</p>
              <p v-else-if="readerLookupError" class="personal-reader__lookup-error">{{ readerLookupError }}</p>
              <p v-else class="personal-reader__lookup-hint">Tap a word, or press and hold to select a phrase.</p>
            </div>
            <q-btn
              v-if="readerMarkerWordIndex !== null && readerMarkerWordIndex !== selectedReaderWordIndex"
              class="personal-reader__marker-return"
              color="primary"
              icon="bookmark"
              label="Return to my marker"
              no-caps
              outline
              @click="goToReaderMarker"
            />
          </section>

          <section class="personal-reader__speech-debug" aria-label="Microphone debug log">
            <div class="personal-reader__speech-debug-heading">
              <strong>Microphone debug</strong>
              <q-btn aria-label="Copy microphone debug log" dense flat icon="content_copy" label="Copy" no-caps @click="copyReadingSpeechDebugLog" />
            </div>
            <pre>{{ readingSpeechDebugText }}</pre>
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
              @update:model-value="goToBookChapter"
            />
            <nav class="personal-reader__sidebar-page-row" aria-label="Book navigation">
              <q-btn aria-label="Previous part" color="primary" dense icon="arrow_back" round size="sm" unelevated :disable="currentBookPageIndex === 0" @click="goToBookPage(currentBookPageIndex - 1)" />
              <span :aria-label="`Current page ${currentBookPageIndex + 1}`">{{ currentBookPageIndex + 1 }}</span>
              <span class="personal-reader__sidebar-page-spacer" aria-hidden="true" />
              <span :aria-label="`${readerPageCount} pages total`">{{ readerPageCount }}</span>
              <q-btn aria-label="Next part" color="primary" dense icon="arrow_forward" round size="sm" unelevated :disable="currentBookPageIndex >= readerPageCount - 1" @click="goToBookPage(currentBookPageIndex + 1)" />
            </nav>
            <q-linear-progress aria-label="Reading progress" rounded size="6px" :value="(currentBookPageIndex + 1) / readerPageCount" color="primary" track-color="grey-3" />
          </div>
        </aside>

        <nav v-else class="personal-reader__navigation" aria-label="Book navigation">
          <q-btn aria-label="Previous part" class="personal-reader__previous" color="primary" icon="arrow_back" round unelevated :disable="currentBookPageIndex === 0" @click="goToBookPage(currentBookPageIndex - 1)" />
          <q-btn aria-label="Next part" class="personal-reader__next" color="primary" icon="arrow_forward" round unelevated :disable="currentBookPageIndex >= readerPageCount - 1" @click="goToBookPage(currentBookPageIndex + 1)" />
        </nav>
      </section>

      <p v-if="isAudioLibrary && !selectedStory" class="video-storage-note">{{ offlineSummary }} Every public-domain recording is bundled with the app in 30–40 minute listening parts.</p>
    </section>

    <q-btn
      v-if="!isAudioLibrary && !selectedBook && activeReadingCategory === 'fiction'"
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { ReaderTextLookup, ReadingChapter, ReadingPage } from '@mentor-ai/shared';
import ContentMentorFeedback from 'src/components/ContentMentorFeedback.vue';
import AppAudioDock from 'src/components/AppAudioDock.vue';
import AudioLibraryTabs from 'src/components/AudioLibraryTabs.vue';
import { loadContentEngagementSummaries, recordContentEngagement, syncContentEngagement, type ContentEngagementSummary } from 'src/services/content-engagement';
import { loadContentProgress, saveContentProgress, syncAllContentProgress } from 'src/services/content-progress';
import { forgetOfflineLesson, markOfflineLessonOpened, registerOfflineStory } from 'src/services/offline-library';
import { deleteOfflineStory, formatStoryDuration, formatStorySize, getCachedStoryUrls, saveStoryOffline, storyLibrary, type LibraryStory } from 'src/services/story-library';
import { useAppStore } from 'src/stores/app-store';
import { configureCaptureAudioSession, configurePlaybackAudioSession, isAppleMobileDevice, isIosStandalone, useRecoveringMediaPlayPause } from 'src/services/audio-session';
import { deletePersonalBook, importPersonalBook, listPersonalBookArchives, listPersonalBooks, loadPersonalBook, markPersonalBookOpened, mergePersonalBookArchives, type PersonalBook } from 'src/services/personal-book-library';
import { personalBookSyncControl } from 'src/services/personal-book-sync-control';
import { fetchReaderPhonetic, fetchReaderTextLookup, saveReadingTranscript, synchronizePersonalReadingBooks, synchronizeReaderVocabulary } from 'src/services/api-client';
import { getAuthToken } from 'src/services/auth';
import { findReaderVocabularyLookup, listReaderVocabulary, recordReaderVocabularyLookup } from 'src/services/reader-vocabulary';
import { speakWithPreferredVoice, speakWithSystemVoice } from 'src/services/speech-synthesis';
import { annualReadingPace, annualReadingPaceMessage as getAnnualReadingPaceMessage, createDailyReadingProgress, dailyReadingGoalWords, dailyReadingTargetWords, dailyWordsRead, localReadingDate, prepareDailyReadingProgress, readingGoalMessage, recordDailyReadWords, recordDailySpokenWords, spokenWordsForBook, type DailyReadingProgress } from 'src/services/daily-reading-progress';
import { alignReadingSpeech, confirmTabletReadingWordIndexes, matchReadingSpeechAtAnchor, recoverReadingSpeechPosition, tokenizeReadingSpeech } from 'src/services/reading-speech-tracker';
import { isSpeechRecognitionAvailable, startContinuousSpeechRecognition, type ContinuousSpeechRecognition } from 'src/services/speech-recognition';
import { startLocalReadingTranscriber, type LocalReadingTranscriber } from 'src/services/local-reading-transcriber';
import { canUseCloudReadingTranscription, startCloudReadingTranscriber, type CloudReadingTranscriber } from 'src/services/cloud-reading-transcriber';
import { calculateReaderPageCount, calculateReaderPaginationGeometry } from 'src/services/reader-pagination';
import { calculateReaderDragOffset, detectReaderSwipe, isReaderHorizontalDrag, type ReaderSwipePoint } from 'src/services/reader-swipe';
import { beginReaderLookupInteraction, shouldProcessLateReadingTranscript } from 'src/services/reader-lookup-interaction';

const props = withDefaults(defineProps<{
  libraryMode?: 'audio' | 'reading';
}>(), {
  libraryMode: 'reading',
});

const appStore = useAppStore();
type ReadingCategory = 'fiction';
const activeReadingCategory = ref<ReadingCategory>('fiction');
const isAudioLibrary = computed(() => props.libraryMode === 'audio');
const selectedStoryId = ref<string | null>(null);
const selectedBook = ref<PersonalBook | null>(null);
const selectedBookChapters = ref<ReadingChapter[]>([]);
const selectedBookPages = ref<ReadingPage[]>([]);
const currentBookPageIndex = ref(0);
const readerContent = ref<HTMLElement | null>(null);
const readerDragging = ref(false);
const readerPaper = ref<HTMLElement | null>(null);
const readerPageCount = ref(1);
const readerPageStride = ref(1);
const chapterPageIndexes = ref<number[]>([]);
const selectedReaderText = ref('');
const selectedReaderWordIndex = ref<number | null>(null);
const readerMarkerWordIndex = ref<number | null>(null);
const readerLookup = ref<ReaderTextLookup | null>(null);
const readerLookupLoading = ref(false);
const readerPhonetic = ref<string | undefined>();
const readerPhoneticLoading = ref(false);
const readerLookupError = ref('');
const minReaderFontSize = 14;
const maxReaderFontSize = 32;
const readerFontSize = ref(20);
const readingMode = ref(false);
const minReaderSidebarScale = 0;
const maxReaderSidebarScale = 4;
const readerSidebarScale = ref(readReaderSidebarScale());
type ReadingSpeechStatus = 'idle' | 'requesting' | 'listening' | 'noise' | 'paused' | 'error';
type RenderedReaderToken = { text: string; isWord: boolean; wordIndex?: number };
const readingSpeechStatus = ref<ReadingSpeechStatus>('idle');
const readingSpeechTransitioning = ref(false);
const readingSpeechLevel = ref(0);
const readingSpeechWordsPerMinute = ref(0);
const readingSpeechMessage = ref('Tap the microphone to request access and start listening.');
const readingSpeechPermissionBlocked = ref(false);
const readingSpeechCaptureUnavailable = ref(false);
const spokenReaderWordIndexes = ref(new Set<number>());
const readingSpeechAcceptedWords = ref(0);
const readingSpeechSpokenWords = ref(0);
const readingSpeechDebugEntries = ref<string[]>(['Waiting for microphone start.']);
let readingSpeechAnchor = 0;
let readingSpeechFurthestWordIndex = -1;
let readingSpeechLocalTranscriptWindow: string[] = [];
let readingSpeechPositionLocked = false;
let readingSpeechRecognition: ContinuousSpeechRecognition | null = null;
let localReadingTranscriber: LocalReadingTranscriber | null = null;
let cloudReadingTranscriber: CloudReadingTranscriber | null = null;
let readingSpeechStream: MediaStream | null = null;
let readingSpeechAudioContext: AudioContext | null = null;
let readingSpeechAnimationFrame = 0;
let readingSpeechDebugStartedAt = 0;
let readingSpeechLastSignalState = false;
let readingSpeechPaceWordCount = 0;
let readingSpeechPaceSampleAt = 0;
let resumeReadingSpeechAfterLookup = false;
const dailyReadingProgress = ref<DailyReadingProgress>(readDailyReadingProgress());
const personalBooks = ref<PersonalBook[]>([]);
const bookSyncing = ref(false);
const bookSyncError = ref('');
const cloudBookCount = ref<number | null>(null);
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
let readerPaginationRequestId = 0;
let lastReaderViewportWidth = 0;
let lastReaderViewportHeight = 0;
let readerSelectionTimer = 0;
let readerLookupRequestId = 0;
let readerTouchStart: ReaderSwipePoint | null = null;
let readerTouchStartScrollLeft = 0;
let suppressReaderTapUntil = 0;
let personalBookSyncPromise: Promise<void> | null = null;
const selectedStory = computed(() => storyLibrary.find((story) => story.id === selectedStoryId.value) ?? null);
const offlineSummary = computed(() => `${storyLibrary.length} stories · ${formatStoryDuration(storyLibrary.reduce((sum, story) => sum + story.durationSeconds, 0))} total listening.`);
const readingCategories = computed(() => ([
  {
    id: 'fiction' as const,
    icon: 'auto_stories',
    label: `Fiction (${personalBooks.value.length})`,
  },
]));
const bookSyncStatus = computed(() => {
  if (!getAuthToken()) return 'Sign in with Google to synchronize books across devices.';
  if (bookSyncing.value) return `Syncing ${personalBooks.value.length} local book${personalBooks.value.length === 1 ? '' : 's'}…`;
  if (bookSyncError.value) return `Cloud sync failed: ${bookSyncError.value}`;
  if (cloudBookCount.value !== null) return `${cloudBookCount.value} book${cloudBookCount.value === 1 ? '' : 's'} in your Google account cloud library.`;
  return 'Cloud library is ready to synchronize.';
});
const bookSyncIcon = computed(() => bookSyncError.value ? 'cloud_off' : bookSyncing.value ? 'sync' : cloudBookCount.value === null ? 'cloud_sync' : 'cloud_done');
const bookSyncCompactLabel = computed(() => {
  if (!getAuthToken()) return 'Sign in';
  if (bookSyncing.value) return 'Syncing…';
  if (bookSyncError.value) return 'Not synced';
  if (cloudBookCount.value === null) return 'Sync books';
  return `${cloudBookCount.value} synced`;
});
watch(
  [isAudioLibrary, selectedBook, bookSyncStatus, bookSyncIcon, bookSyncCompactLabel, bookSyncing],
  () => {
    personalBookSyncControl.visible = !isAudioLibrary.value && !selectedBook.value;
    personalBookSyncControl.disabled = !getAuthToken();
    personalBookSyncControl.icon = bookSyncIcon.value;
    personalBookSyncControl.label = bookSyncCompactLabel.value;
    personalBookSyncControl.loading = bookSyncing.value;
    personalBookSyncControl.status = bookSyncStatus.value;
    personalBookSyncControl.trigger = retryPersonalBookSync;
  },
  { immediate: true },
);
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
const dailyReadingWords = computed(() => dailyWordsRead(dailyReadingProgress.value));
const dailyReadingTarget = computed(() => dailyReadingTargetWords(dailyReadingProgress.value));
const dailyReadingWordsRemaining = computed(() => Math.max(0, dailyReadingTarget.value - dailyReadingWords.value));
const dailyReadingProgressRatio = computed(() => Math.min(1, dailyReadingWords.value / dailyReadingTarget.value));
const dailyReadingGoalState = computed(() => dailyReadingWords.value >= dailyReadingTarget.value * 1.5 ? 'exceeded' : dailyReadingWords.value >= dailyReadingTarget.value ? 'complete' : 'building');
const dailyReadingGoalMessage = computed(() => readingGoalMessage(dailyReadingWords.value, dailyReadingTarget.value));
const annualReadingPaceSummary = computed(() => annualReadingPace(dailyReadingProgress.value));
const annualReadingPaceTotal = computed(() => annualReadingPaceSummary.value.actualWords);
const annualReadingPaceExpected = computed(() => annualReadingPaceSummary.value.expectedWords);
const annualReadingPaceBalance = computed(() => annualReadingPaceSummary.value.balanceWords);
const annualReadingPaceMessage = computed(() => getAnnualReadingPaceMessage(annualReadingPaceBalance.value, dailyReadingTarget.value));
const readerSidebarScalePercent = computed(() => 100 + readerSidebarScale.value * 10);
const readerSidebarStyle = computed(() => ({
  '--reader-sidebar-width': `${230 + readerSidebarScale.value * 30}px`,
  '--reader-sidebar-mobile-width': `${158 + readerSidebarScale.value * 16}px`,
  '--reader-sidebar-font-size': `${16 + readerSidebarScale.value * 1.5}px`,
}));
const renderedBookPages = computed(() => {
  let wordIndex = 0;
  return selectedBookPages.value.map((page) => ({
    ...page,
    paragraphs: splitBookParagraphs(page.text).map((paragraph) => tokenizeReaderParagraph(paragraph).map<RenderedReaderToken>((token) => (
      token.isWord ? { ...token, wordIndex: wordIndex++ } : token
    ))),
  }));
});
const readerReferenceWords = computed(() => renderedBookPages.value.flatMap((page) => page.paragraphs.flatMap((paragraph) => paragraph.filter((token) => token.isWord).map((token) => token.text))));
const readingSpeechActive = computed(() => readingSpeechStatus.value === 'listening' || readingSpeechStatus.value === 'noise' || readingSpeechStatus.value === 'requesting');
const readingSpeechDebugText = computed(() => readingSpeechDebugEntries.value.join('\n'));
const readingSpeechHasSignal = computed(() => readingSpeechLevel.value >= 0.035);
const readerSpeechFrameStyle = computed(() => {
  const energy = readingSpeechActive.value ? Math.max(0.04, readingSpeechLevel.value) : 0;
  const energyRatio = Math.max(0, Math.min(1, energy / 0.2));
  const paceRatio = readingSpeechHasSignal.value
    ? Math.max(0, Math.min(1, (readingSpeechWordsPerMinute.value - 45) / 55))
    : 0;
  return {
    '--reader-speech-frame-duration': `${8 - paceRatio * 6.4}s`,
    '--reader-speech-wave-duration': `${4.8 - paceRatio * 4}s`,
    '--reader-speech-reactivity': String(0.62 + paceRatio * 0.3 + energyRatio * 0.08),
  };
});
const readingSpeechActionLabel = computed(() => {
  if (readingSpeechTransitioning.value) return 'Microphone state is changing';
  if (readingSpeechActive.value) return 'Stop microphone';
  if (readingSpeechStatus.value === 'error') return 'Retry microphone';
  return 'Turn microphone on';
});
const readingMicrophoneIndicator = computed(() => {
  if (readingSpeechStatus.value === 'requesting') return {
    tone: 'requesting',
    title: readingSpeechMessage.value.startsWith('Loading') ? 'LOADING SPEECH MODEL' : 'REQUESTING MICROPHONE',
  };
  if (readingSpeechStatus.value === 'listening' || readingSpeechStatus.value === 'noise') {
    return readingSpeechHasSignal.value
      ? { tone: 'hearing', title: 'HEARING YOU' }
      : { tone: 'listening', title: 'MICROPHONE ON' };
  }
  if (readingSpeechStatus.value === 'error') return { tone: 'error', title: 'MICROPHONE BLOCKED' };
  return { tone: 'off', title: 'MICROPHONE OFF' };
});

onMounted(async () => {
  configurePlaybackAudioSession();
  if (isAudioLibrary.value) {
    cachedUrls.value = await getCachedStoryUrls();
    engagementSummaries.value = await loadContentEngagementSummaries('audio');
  } else {
    personalBooks.value = await listPersonalBooks();
    await syncPersonalBooks().catch(() => undefined);
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('online', handleBookSyncWakeup);
  document.addEventListener('keydown', handleReaderKeydown);
  document.addEventListener('selectionchange', handleReaderSelectionChange);
  const requestedStoryId = isAudioLibrary.value
    ? new URLSearchParams(window.location.search).get('story')
    : null;
  if (requestedStoryId && storyLibrary.some((story) => story.id === requestedStoryId)) {
    await openStory(requestedStoryId);
  }
});
onUnmounted(() => {
  personalBookSyncControl.visible = false;
  personalBookSyncControl.trigger = null;
  persistProgress();
  persistBookProgress();
  applyReadingMode(false);
  stopReaderPagination();
  clearMediaSession();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('online', handleBookSyncWakeup);
  document.removeEventListener('keydown', handleReaderKeydown);
  document.removeEventListener('selectionchange', handleReaderSelectionChange);
  window.clearTimeout(readerSelectionTimer);
  stopReadingSpeech('idle');
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
    const signedIn = Boolean(getAuthToken());
    const cloudSynced = signedIn && await syncPersonalBooks().then(() => true).catch(() => false);
    cancelBookImport();
    Notify.create({
      type: cloudSynced || !signedIn ? 'positive' : 'warning',
      message: cloudSynced
        ? `${book.title} is ready offline and on your other signed-in devices.`
        : signedIn
          ? `${book.title} is ready offline. Cloud sync will retry when the connection is available.`
          : `${book.title} is ready to read offline. Sign in with Google to sync it to other devices.`,
    });
    await openBook(book.id);
  } catch (error) {
    Notify.create({ type: 'negative', message: error instanceof Error ? error.message : 'Could not import this book.' });
  } finally {
    importingBook.value = false;
  }
}

function syncPersonalBooks(): Promise<void> {
  if (!getAuthToken()) return Promise.resolve();
  if (personalBookSyncPromise) return personalBookSyncPromise;
  bookSyncing.value = true;
  bookSyncError.value = '';
  personalBookSyncPromise = (async () => {
    const localArchives = await listPersonalBookArchives();
    const cloudBooks = await synchronizePersonalReadingBooks(localArchives);
    cloudBookCount.value = cloudBooks.length;
    await mergePersonalBookArchives(cloudBooks);
    personalBooks.value = await listPersonalBooks();
  })().catch((error) => {
    bookSyncError.value = error instanceof Error ? error.message : 'Unknown synchronization error.';
    throw error;
  }).finally(() => {
    bookSyncing.value = false;
    personalBookSyncPromise = null;
  });
  return personalBookSyncPromise;
}

function handleBookSyncWakeup() { void syncPersonalBooks().catch(() => undefined); }
function retryPersonalBookSync() { void syncPersonalBooks().catch(() => undefined); }
async function openBook(bookId: string) {
  const loaded = await loadPersonalBook(bookId);
  if (!loaded || loaded.pages.length === 0) {
    Notify.create({ type: 'negative', message: 'This book has no readable pages.' });
    return;
  }
  // Apply this book's visual settings before selectedBook makes the reader
  // visible. Otherwise the previous/default font is painted for one frame and
  // then jumps after spoken progress finishes loading.
  const readerSettings = readBookReaderSettings(loaded.book.id);
  readerFontSize.value = readerSettings.fontSize;
  applyReadingMode(readerSettings.readingMode);
  selectedBook.value = loaded.book;
  selectedBookChapters.value = loaded.chapters;
  selectedBookPages.value = loaded.pages;
  currentBookPageIndex.value = 0;
  readerPageCount.value = 1;
  readerPageStride.value = 1;
  chapterPageIndexes.value = loaded.pages.map(() => 0);
  await restoreSpokenReadingProgress(loaded.book.id);
  readerMarkerWordIndex.value = readReaderMarker(loaded.book.id);
  await markPersonalBookOpened(loaded.book);
  personalBooks.value = await listPersonalBooks();
  await nextTick();
  await repaginateReader(readBookProgress(loaded.book.id, loaded.pages.length));
  goToSyncedSpokenPosition();
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
  spokenReaderWordIndexes.value = new Set();
  readingSpeechFurthestWordIndex = -1;
  selectedReaderWordIndex.value = null;
  readerMarkerWordIndex.value = null;
  readingSpeechAcceptedWords.value = 0;
  readingSpeechSpokenWords.value = 0;
  clearReaderLookup();
  stopReadingSpeech('idle');
}
function goToBookPage(pageIndex: number | null) {
  if (pageIndex === null || !Number.isInteger(pageIndex)) return;
  const destinationPageIndex = Math.max(0, Math.min(readerPageCount.value - 1, pageIndex));
  if (destinationPageIndex > currentBookPageIndex.value) recordCompletedReaderPage(currentBookPageIndex.value);
  persistBookProgress();
  currentBookPageIndex.value = destinationPageIndex;
  scrollToReaderPage();
  persistBookProgress();
  readingSpeechAnchor = getVisibleReaderWordAnchor();
}
function goToBookChapter(pageIndex: number | null) {
  if (pageIndex === null || !Number.isInteger(pageIndex)) return;
  const chapterIndex = chapterPageIndexes.value.findIndex((chapterPageIndex) => chapterPageIndex === pageIndex);
  if (chapterIndex < 0) return;
  persistBookProgress();
  void repaginateReader({ legacyChapterIndex: chapterIndex });
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
  return text.split('\n').filter(Boolean);
}
function tokenizeReaderParagraph(text: string): Array<{ text: string; isWord: boolean }> {
  return text.split(/([\p{L}]+(?:[-'’][\p{L}]+)*)/gu).filter(Boolean).map((token) => ({
    text: token,
    isWord: /^[\p{L}]+(?:[-'’][\p{L}]+)*$/u.test(token),
  }));
}
function handleReaderTextTap(event: MouseEvent) {
  if (Date.now() < suppressReaderTapUntil) return;
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed && isReaderSelection(selection)) {
    queueReaderSelectionLookup();
    return;
  }
  const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-reader-word]') : null;
  const targetWord = target?.dataset.readerWord;
  const targetWordIndex = Number(target?.dataset.readerWordIndex);
  const word = targetWord ?? getWordAtPoint(event.clientX, event.clientY);
  if (word) void selectReaderText(word, true, Number.isInteger(targetWordIndex) ? targetWordIndex : null);
}
function handleReaderTouchStart(event: TouchEvent) {
  const touch = event.touches.length === 1 ? event.touches[0] : undefined;
  readerTouchStart = touch ? { clientX: touch.clientX, clientY: touch.clientY } : null;
  readerTouchStartScrollLeft = readerContent.value?.scrollLeft ?? 0;
  readerDragging.value = false;
}
function handleReaderTouchMove(event: TouchEvent) {
  const start = readerTouchStart;
  const touch = event.touches.length === 1 ? event.touches[0] : undefined;
  const viewport = readerContent.value;
  if (!start || !touch || !viewport) return;
  const current = { clientX: touch.clientX, clientY: touch.clientY };
  if (!readerDragging.value && !isReaderHorizontalDrag(start, current)) return;
  readerDragging.value = true;
  event.preventDefault();
  const dragOffset = calculateReaderDragOffset(
    start,
    current,
    currentBookPageIndex.value > 0,
    currentBookPageIndex.value < readerPageCount.value - 1,
  );
  viewport.scrollLeft = readerTouchStartScrollLeft - dragOffset;
}
function handleReaderTouchEnd(event: TouchEvent) {
  const start = readerTouchStart;
  const wasDragging = readerDragging.value;
  readerTouchStart = null;
  readerDragging.value = false;
  const touch = event.changedTouches.length === 1 ? event.changedTouches[0] : undefined;
  if (!start || !touch) {
    if (wasDragging) scrollToReaderPage();
    return;
  }
  const direction = detectReaderSwipe(start, { clientX: touch.clientX, clientY: touch.clientY });
  if (wasDragging) suppressReaderTapUntil = Date.now() + 400;
  if (!direction) {
    if (wasDragging) scrollToReaderPage();
    return;
  }
  goToBookPage(currentBookPageIndex.value + (direction === 'next' ? 1 : -1));
}
function resetReaderTouch() {
  readerTouchStart = null;
  if (readerDragging.value) scrollToReaderPage();
  readerDragging.value = false;
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
    if (text) void selectReaderText(text, false, null);
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
async function selectReaderText(rawText: string, speakImmediately: boolean, wordIndex: number | null) {
  const text = normalizeReaderSelection(rawText);
  if (!text || !selectedBook.value) return;
  const shouldResumeReadingSpeech = readingSpeechActive.value;
  const requestId = ++readerLookupRequestId;
  try {
    await beginReaderLookupInteraction({
      revealSelection: () => {
        selectedReaderText.value = text;
        selectedReaderWordIndex.value = wordIndex;
        readerLookup.value = null;
        readerPhonetic.value = undefined;
        readerLookupError.value = '';
        readerLookupLoading.value = true;
        readerPhoneticLoading.value = !/\s/.test(text);
      },
      pauseListening: shouldResumeReadingSpeech ? () => {
        resumeReadingSpeechAfterLookup = true;
        appendReadingSpeechDebug(`Pausing microphone while translating "${text}".`);
        stopReadingSpeech('paused');
        readingSpeechMessage.value = 'Microphone paused while translating. It will resume automatically.';
      } : undefined,
      pronounce: speakImmediately ? () => { void speakReaderText(text); } : undefined,
      lookup: async () => {
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
      },
    });
  } catch (error) {
    if (requestId === readerLookupRequestId) readerLookupError.value = error instanceof Error ? error.message : 'Translation is unavailable right now.';
  } finally {
    if (requestId === readerLookupRequestId && resumeReadingSpeechAfterLookup && readingMode.value) {
      resumeReadingSpeechAfterLookup = false;
      appendReadingSpeechDebug('Translation finished; resuming microphone automatically.');
      await startReadingSpeech();
    }
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
  appendReadingSpeechDebug(`Pronunciation requested for "${text}".`);
  const microphoneTracks = readingSpeechStream?.getAudioTracks() ?? [];
  const muteMicrophone = () => {
    microphoneTracks.forEach((track) => { track.enabled = false; });
    if (microphoneTracks.length) appendReadingSpeechDebug(`Microphone muted while pronouncing "${text}".`);
  };
  const restoreMicrophone = () => {
    microphoneTracks.forEach((track) => { if (track.readyState === 'live') track.enabled = true; });
    if (microphoneTracks.length) appendReadingSpeechDebug('Microphone resumed after word pronunciation.');
  };
  let fallbackStarted = false;
  const playFallback = async () => {
    if (fallbackStarted) return;
    fallbackStarted = true;
    restoreMicrophone();
    appendReadingSpeechDebug(`System pronunciation failed; starting fallback voice for "${text}".`);
    const played = await speakWithPreferredVoice(text, {
      mediaTitle: `Book: ${selectedBook.value?.title ?? 'selected text'}`,
      temporary: true,
    });
    appendReadingSpeechDebug(played ? 'Fallback pronunciation started.' : 'Fallback pronunciation failed.');
    if (!played) Notify.create({ type: 'warning', message: 'Pronunciation is unavailable right now.' });
  };
  const systemVoiceStarted = speakWithSystemVoice(text, {
    onStart: () => {
      appendReadingSpeechDebug(`System pronunciation started for "${text}".`);
      muteMicrophone();
    },
    onEnd: restoreMicrophone,
    onError: () => { void playFallback(); },
  });
  if (systemVoiceStarted) return;
  await playFallback();
}
function clearReaderLookup() {
  readerLookupRequestId += 1;
  resumeReadingSpeechAfterLookup = false;
  selectedReaderText.value = '';
  selectedReaderWordIndex.value = null;
  readerLookup.value = null;
  readerLookupLoading.value = false;
  readerPhonetic.value = undefined;
  readerPhoneticLoading.value = false;
  readerLookupError.value = '';
}
function readerMarkerKey(bookId: string) { return `mentor-ai:personal-book-marker:${bookId}`; }
function readReaderMarker(bookId: string): number | null {
  if (typeof localStorage === 'undefined') return null;
  const stored = localStorage.getItem(readerMarkerKey(bookId));
  if (stored === null) return null;
  const value = Number(stored);
  return Number.isInteger(value) && value >= 0 ? value : null;
}
function toggleReaderMarker() {
  const book = selectedBook.value;
  const wordIndex = selectedReaderWordIndex.value;
  if (!book || wordIndex === null || typeof localStorage === 'undefined') return;
  if (readerMarkerWordIndex.value === wordIndex) {
    readerMarkerWordIndex.value = null;
    localStorage.removeItem(readerMarkerKey(book.id));
    Notify.create({ message: 'Reading marker removed.', icon: 'bookmark_remove' });
    return;
  }
  readerMarkerWordIndex.value = wordIndex;
  localStorage.setItem(readerMarkerKey(book.id), String(wordIndex));
  Notify.create({ type: 'positive', message: 'Your reading place is marked.', icon: 'bookmark' });
}
function goToReaderMarker() {
  const markerIndex = readerMarkerWordIndex.value;
  const paper = readerPaper.value;
  if (markerIndex === null || !paper) return;
  const marker = paper.querySelector<HTMLElement>(`[data-reader-word-index="${markerIndex}"]`);
  if (!marker) return;
  currentBookPageIndex.value = Math.max(0, Math.min(readerPageCount.value - 1, Math.floor((marker.offsetLeft + 1) / readerPageStride.value)));
  scrollToReaderPage();
  persistBookProgress();
  marker.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
}
async function toggleReadingSpeech() {
  if (readingSpeechTransitioning.value) return;
  readingSpeechTransitioning.value = true;
  if (readingSpeechActive.value) {
    appendReadingSpeechDebug('Stop requested by user.');
    stopReadingSpeech('paused');
    readingSpeechMessage.value = 'Your highlighted words are kept. Tap Start listening when you are ready.';
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    readingSpeechTransitioning.value = false;
    return;
  }
  readingSpeechPermissionBlocked.value = false;
  readingSpeechCaptureUnavailable.value = false;
  await startReadingSpeech();
  if (readingSpeechStatus.value !== 'requesting') readingSpeechTransitioning.value = false;
}
async function startReadingSpeech() {
  if (readingSpeechRecognition || readingSpeechStream || !readingMode.value) return;
  const useLocalRecognition = isAppleMobileDevice();
  startReadingSpeechDebug(useLocalRecognition ? 'device-whisper' : 'browser-speech');
  readingSpeechLocalTranscriptWindow = [];
  readingSpeechPositionLocked = false;
  resetReadingSpeechPace();
  if (!navigator.mediaDevices?.getUserMedia) {
    appendReadingSpeechDebug('ERROR: getUserMedia is unavailable.');
    readingSpeechStatus.value = 'error';
    readingSpeechMessage.value = 'Safari does not expose microphone capture on this page.';
    readingSpeechTransitioning.value = false;
    Notify.create({ type: 'negative', icon: 'mic_off', message: readingSpeechMessage.value, timeout: 8_000 });
    return;
  }
  readingSpeechStatus.value = 'requesting';
  readingSpeechPermissionBlocked.value = false;
  readingSpeechCaptureUnavailable.value = false;
  readingSpeechMessage.value = 'Use the device prompt to allow microphone access.';
  appendReadingSpeechDebug('Requesting microphone permission…');
  try {
    configureCaptureAudioSession();
    appendReadingSpeechDebug('Audio session configured for capture.');
    readingSpeechStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const audioTrack = readingSpeechStream.getAudioTracks()[0];
    const settings = audioTrack?.getSettings();
    appendReadingSpeechDebug(`Microphone granted: track=${audioTrack?.readyState ?? 'missing'}, enabled=${audioTrack?.enabled ?? false}, muted=${audioTrack?.muted ?? false}, sampleRate=${settings?.sampleRate ?? 'unknown'}, channels=${settings?.channelCount ?? 'unknown'}.`);
    void startReadingSpeechMeter(readingSpeechStream);
    readingSpeechAnchor = getVisibleReaderWordAnchor();
    appendReadingSpeechDebug(`Reading anchor: word ${readingSpeechAnchor}.`);
    appendReadingSpeechDebug(`Expected nearby text: "${readerReferenceWords.value.slice(readingSpeechAnchor, readingSpeechAnchor + 18).join(' ')}"`);
    if (useLocalRecognition) {
      const handleWhisperTranscript = (transcript: string, engine: 'device-whisper' | 'cloud-whisper') => {
        const arrivedAfterPause = !readingSpeechStream;
        if (arrivedAfterPause && !shouldProcessLateReadingTranscript(readerLookupLoading.value)) {
          appendReadingSpeechDebug('Ignoring the microphone final chunk while translation is in progress.');
          return;
        }
        handleReadingSpeechTranscript(transcript, engine);
        if (arrivedAfterPause) {
          readingSpeechStatus.value = 'paused';
          readingSpeechMessage.value = 'The final words were recognized and highlighted. Tap Start listening when you are ready.';
        }
      };
      const startOfflineRecognition = () => {
        if (!readingSpeechStream || localReadingTranscriber) return;
        if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder is unavailable after microphone permission was granted.');
        localReadingTranscriber = startLocalReadingTranscriber(readingSpeechStream, {
        onTranscript: (transcript) => {
          handleWhisperTranscript(transcript, 'device-whisper');
        },
        onDebug: (message) => appendReadingSpeechDebug(message),
        onReady: () => {
          appendReadingSpeechDebug('Offline model ready. Start reading aloud.');
          readingSpeechStatus.value = 'listening';
          readingSpeechMessage.value = 'Read aloud. Recognition is ready.';
          readingSpeechTransitioning.value = false;
        },
        onProgress: (message) => {
          appendReadingSpeechDebug(message);
          readingSpeechStatus.value = 'requesting';
          readingSpeechMessage.value = message;
        },
        onError: (message) => {
          appendReadingSpeechDebug(`ERROR: ${message}`);
          stopReadingSpeech('error');
          readingSpeechMessage.value = `Offline speech recognition stopped: ${message}`;
          readingSpeechTransitioning.value = false;
        },
        });
        readingSpeechStatus.value = 'requesting';
        readingSpeechMessage.value = 'Loading offline speech model…';
      };
      if (await canUseCloudReadingTranscription()) {
        appendReadingSpeechDebug('Online Whisper Large V3 Turbo is configured; starting continuous capture.');
        try {
          cloudReadingTranscriber = await startCloudReadingTranscriber(readingSpeechStream, {
            prompt: () => readerReferenceWords.value.slice(Math.max(0, readingSpeechAnchor - 40), readingSpeechAnchor + 320).join(' '),
            onTranscript: (transcript) => handleWhisperTranscript(transcript, 'cloud-whisper'),
            onDebug: (message) => appendReadingSpeechDebug(message),
            onReady: () => {
              appendReadingSpeechDebug('Online Whisper ready. Start reading aloud.');
              readingSpeechStatus.value = 'listening';
              readingSpeechMessage.value = 'Read aloud. Online recognition is ready.';
              readingSpeechTransitioning.value = false;
            },
            onUnavailable: (message) => {
              appendReadingSpeechDebug(`Online Whisper unavailable: ${message} Switching to offline recognition.`);
              cloudReadingTranscriber?.stop();
              cloudReadingTranscriber = null;
              startOfflineRecognition();
            },
          });
        } catch (error) {
          appendReadingSpeechDebug(`Online capture could not start: ${microphoneErrorDetails(error)} Switching to offline recognition.`);
          startOfflineRecognition();
        }
      } else {
        appendReadingSpeechDebug('Online Whisper is not configured or the tablet is offline; using offline recognition.');
        startOfflineRecognition();
      }
    } else {
      if (!isSpeechRecognitionAvailable()) throw new Error('SpeechRecognition is unavailable after microphone permission was granted.');
      readingSpeechRecognition = startContinuousSpeechRecognition({
      lang: 'en-US',
      onInterim: (transcript) => {
        updateReadingSpeechPace(transcript);
        appendReadingSpeechDebug(`Interim text: "${transcript}"`);
      },
      onFinal: (transcript) => handleReadingSpeechTranscript(transcript, 'browser'),
      onListeningChange: (listening) => {
        appendReadingSpeechDebug(listening ? 'Browser recognition listening.' : 'Browser recognition reconnecting.');
        if (!readingSpeechRecognition && !listening) return;
        readingSpeechStatus.value = listening ? 'listening' : 'requesting';
        readingSpeechMessage.value = listening ? 'Read naturally. Matching words are highlighted as you speak.' : 'Reconnecting voice recognition…';
        if (listening) readingSpeechTransitioning.value = false;
      },
      onError: (message) => {
        appendReadingSpeechDebug(`ERROR: browser recognition: ${message}`);
        stopReadingSpeech('error');
        readingSpeechCaptureUnavailable.value = isMicrophoneCaptureUnavailable(message);
        readingSpeechPermissionBlocked.value = !readingSpeechCaptureUnavailable.value && /not-allowed|permission|denied/i.test(message);
        readingSpeechMessage.value = readingSpeechCaptureUnavailable.value
          ? 'The iPad microphone service is unavailable. Fully close Mentor AI, reopen it, and try again.'
          : readingSpeechPermissionBlocked.value
            ? 'Access is blocked. Tap Fix microphone access for the PWA settings.'
          : `Speech recognition stopped: ${message}`;
        Notify.create({ type: 'negative', icon: 'mic', message: readingSpeechMessage.value, timeout: 6_000 });
        readingSpeechTransitioning.value = false;
      },
      });
    }
    if (!useLocalRecognition) {
      readingSpeechStatus.value = 'listening';
      readingSpeechMessage.value = 'Read naturally. Matching words are highlighted as you speak.';
    }
  } catch (error) {
    stopReadingSpeech('error');
    readingSpeechCaptureUnavailable.value = isMicrophoneCaptureUnavailable(error);
    readingSpeechPermissionBlocked.value = !readingSpeechCaptureUnavailable.value && isMicrophonePermissionError(error);
    const technicalMessage = microphoneErrorDetails(error);
    appendReadingSpeechDebug(`ERROR: microphone start failed: ${technicalMessage}`);
    readingSpeechMessage.value = readingSpeechCaptureUnavailable.value
      ? 'The iPad microphone service is unavailable. Fully close Mentor AI, reopen it, and try again.'
      : readingSpeechPermissionBlocked.value
        ? 'Access is blocked. Tap Fix microphone access for the PWA settings.'
      : `The microphone could not be started: ${technicalMessage}`;
    readingSpeechTransitioning.value = false;
    Notify.create({
      type: 'negative',
      icon: 'mic',
      message: `${readingSpeechMessage.value} (${technicalMessage})`,
      timeout: 10_000,
    });
  }
}
function microphoneErrorDetails(error: unknown) {
  if (error instanceof DOMException) return `${error.name}: ${error.message || 'no details'}`;
  return error instanceof Error ? error.message : String(error);
}
function showMicrophoneAccessHelp() {
  const appleTablet = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installedPwa = window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const message = appleTablet && installedPwa
    ? '<ol><li>Fully close the Mentor AI PWA from the iPad app switcher.</li><li>Open the same Mentor AI website in Safari.</li><li>Tap Page Menu beside the address bar → More → Website Settings → Microphone → Allow.</li><li>In iPad Settings → Apps → Safari → Microphone, choose Ask or Allow.</li><li>Reopen the Mentor AI PWA and tap Retry microphone.</li></ol>'
    : appleTablet
      ? '<ol><li>In Safari, open Mentor AI.</li><li>Tap the Page Menu beside the address bar, then More.</li><li>Open Website Settings and set Microphone to Allow.</li><li>If it is still blocked, open iPad Settings → Privacy & Security → Microphone and Speech Recognition, then allow Safari.</li><li>Return here and tap the button below.</li></ol>'
    : '<ol><li>Open this site’s permissions in your browser.</li><li>Set Microphone to Allow.</li><li>Return here and tap the button below.</li></ol>';
  Dialog.create({
    title: appleTablet && installedPwa ? 'Fix microphone in the iPad app' : appleTablet ? 'Allow microphone on iPad' : 'Allow microphone access',
    message,
    html: true,
    cancel: { label: 'Close', flat: true, noCaps: true },
    ok: { label: 'I allowed it — try again', color: 'primary', noCaps: true },
  }).onOk(() => {
    readingSpeechPermissionBlocked.value = false;
    readingSpeechCaptureUnavailable.value = false;
    void startReadingSpeech();
  });
}
function isMicrophoneCaptureUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /No AVAudioSessionCaptureDevice|capture device|audio input device/i.test(message);
}
function isMicrophonePermissionError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'NotAllowedError' || error.name === 'SecurityError'
    : error instanceof Error && /denied|allowed|permission/i.test(error.message);
}
function handleReadingSpeechTranscript(transcript: string, recognitionEngine: 'device-whisper' | 'cloud-whisper' | 'browser' = 'browser') {
  const whisperRecognition = recognitionEngine !== 'browser';
  const rawHeardWords = tokenizeReadingSpeech(transcript);
  if (whisperRecognition) updateReadingSpeechChunkPace(rawHeardWords.length);
  appendReadingSpeechDebug(`Final text (${recognitionEngine}, ${rawHeardWords.length} words): "${transcript}"`);
  if (!rawHeardWords.length) return;
  if (whisperRecognition) {
    readingSpeechLocalTranscriptWindow = [...readingSpeechLocalTranscriptWindow, transcript].slice(-3);
  }
  const book = selectedBook.value;
  if (book) void saveReadingTranscript({
    id: `reading-transcript-${crypto.randomUUID()}`,
    studentId: appStore.studentId,
    bookId: book.id,
    pageIndex: currentBookPageIndex.value,
    text: transcript,
    capturedAt: new Date().toISOString(),
    recognitionEngine,
  }).catch(() => {
    Notify.create({ type: 'warning', message: 'Words were recognized, but could not be saved for analysis.', timeout: 3_000 });
  });
  const spokenCount = rawHeardWords.length;
  const lockedSingleWordMatch = whisperRecognition && readingSpeechPositionLocked
    ? matchReadingSpeechAtAnchor(readerReferenceWords.value, transcript, readingSpeechAnchor)
    : null;
  // A one-word Whisper chunk is safe only after the position is locked and it
  // is exactly the next book word. This preserves short dialogue such as “No.”
  // without letting common isolated words jump the reader position.
  const minimumRecognizedWords = lockedSingleWordMatch?.accepted
    ? 1
    : whisperRecognition && readingSpeechPositionLocked ? 2 : 3;
  if (rawHeardWords.length < minimumRecognizedWords) {
    appendReadingSpeechDebug(`Match skipped: fewer than ${minimumRecognizedWords} recognized words.`);
    return;
  }
  const alignmentCandidates = [{ text: transcript, words: rawHeardWords, source: 'current chunk' }];
  if (whisperRecognition && readingSpeechLocalTranscriptWindow.length > 1) {
    const combinedText = readingSpeechLocalTranscriptWindow.join(' ');
    alignmentCandidates.push({ text: combinedText, words: tokenizeReadingSpeech(combinedText), source: `${readingSpeechLocalTranscriptWindow.length} combined chunks` });
  }
  const alignmentOptions = recognitionEngine === 'browser'
    ? { maxForwardWords: 360 }
    : readingSpeechPositionLocked
      ? { maxBackwardWords: 6, maxForwardWords: 16, minCoverage: 0.6, minMatchedWords: 2, minSpokenWords: 2 }
      : { minCoverage: 0.4 };
  const evaluatedCandidates = alignmentCandidates.map((candidate, candidateIndex) => ({
    ...candidate,
    match: candidateIndex === 0 && lockedSingleWordMatch?.accepted
      ? lockedSingleWordMatch
      : alignReadingSpeech(readerReferenceWords.value, candidate.text, readingSpeechAnchor, alignmentOptions),
  }));
  const nearbyCandidate = evaluatedCandidates.find((candidate) => candidate.match.accepted);
  const tabletRecoveryCandidate = whisperRecognition && !nearbyCandidate
    ? {
        text: transcript,
        words: rawHeardWords,
        source: 'wide position recovery',
        match: recoverReadingSpeechPosition(readerReferenceWords.value, transcript, readingSpeechAnchor),
      }
    : null;
  const selectedCandidate = nearbyCandidate
    ?? (tabletRecoveryCandidate?.match.accepted ? tabletRecoveryCandidate : null)
    ?? evaluatedCandidates.reduce((best, candidate) => candidate.match.coverage > best.match.coverage ? candidate : best);
  const { match, words: heardWords } = selectedCandidate;
  if (whisperRecognition) {
    appendReadingSpeechDebug(`Tablet ${selectedCandidate.source}: coverage=${Math.round(match.coverage * 100)}%, accepted=${match.accepted}.`);
  }
  if (!match.accepted) {
    appendReadingSpeechDebug(`Match rejected near word ${readingSpeechAnchor}; coverage=${Math.round(match.coverage * 100)}%.`);
    readingSpeechStatus.value = 'noise';
    readingSpeechMessage.value = 'I heard sound, but it did not match the nearby book text. Keep reading.';
    return;
  }
  const confirmedWordIndexes = whisperRecognition
    ? confirmTabletReadingWordIndexes(match.matchedWordIndexes, readingSpeechAnchor, heardWords.length, readingSpeechPositionLocked ? 2 : 3)
    : match.matchedWordIndexes;
  if (confirmedWordIndexes.length < minimumRecognizedWords) {
    appendReadingSpeechDebug(`Match rejected after removing forward outliers: fewer than ${minimumRecognizedWords} nearby words remain.`);
    readingSpeechStatus.value = 'noise';
    readingSpeechMessage.value = 'I heard sound, but it did not match the nearby book text. Keep reading.';
    return;
  }
  const confirmedLastWord = confirmedWordIndexes.at(-1)!;
  const trimmedMatches = match.matchedWordIndexes.length - confirmedWordIndexes.length;
  const recoveredWords = confirmedWordIndexes.filter((wordIndex) => !match.matchedWordIndexes.includes(wordIndex)).length;
  readingSpeechAnchor = whisperRecognition
    ? Math.max(readingSpeechAnchor, confirmedLastWord + 1)
    : match.anchorIndex;
  if (whisperRecognition) readingSpeechPositionLocked = true;
  appendReadingSpeechDebug(`Match accepted: ${confirmedWordIndexes.length}/${heardWords.length} words, coverage=${Math.round(match.coverage * 100)}%, indexes=${confirmedWordIndexes[0]}–${confirmedLastWord}, next=${readingSpeechAnchor}${recoveredWords ? `, recovered=${recoveredWords}` : ''}${trimmedMatches > 0 ? `, trimmed=${trimmedMatches}` : ''}.`);
  if (whisperRecognition) readingSpeechLocalTranscriptWindow = [];
  readingSpeechAcceptedWords.value += confirmedWordIndexes.length;
  readingSpeechSpokenWords.value += spokenCount;
  const nextSpoken = new Set(spokenReaderWordIndexes.value);
  confirmedWordIndexes.forEach((wordIndex) => nextSpoken.add(wordIndex));
  const furthestMatchedWord = confirmedLastWord;
  if (furthestMatchedWord > readingSpeechFurthestWordIndex) {
    readingSpeechFurthestWordIndex = furthestMatchedWord;
    void persistSpokenReadingProgress(furthestMatchedWord);
  }
  spokenReaderWordIndexes.value = nextSpoken;
  recordDailySpokenMatch(confirmedWordIndexes);
  readingSpeechStatus.value = 'listening';
  readingSpeechMessage.value = match.coverage >= 0.8
    ? 'Great match — keep reading.'
    : 'Following you. A few words were unclear or skipped.';
}
function getVisibleReaderWordAnchor() {
  const viewport = readerContent.value;
  if (!viewport) return readingSpeechAnchor;
  const viewportBounds = viewport.getBoundingClientRect();
  const visibleWord = Array.from(viewport.querySelectorAll<HTMLElement>('[data-reader-word-index]')).find((word) => {
    const bounds = word.getBoundingClientRect();
    return bounds.right > viewportBounds.left && bounds.left < viewportBounds.right && bounds.bottom > viewportBounds.top && bounds.top < viewportBounds.bottom;
  });
  const wordIndex = Number(visibleWord?.dataset.readerWordIndex);
  return Number.isInteger(wordIndex) ? wordIndex : readingSpeechAnchor;
}
async function startReadingSpeechMeter(stream: MediaStream) {
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) {
    appendReadingSpeechDebug('Audio meter unavailable: AudioContext missing.');
    return;
  }
  readingSpeechAudioContext = new AudioContextConstructor();
  await readingSpeechAudioContext.resume().catch(() => undefined);
  const analyser = readingSpeechAudioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.76;
  readingSpeechAudioContext.createMediaStreamSource(stream).connect(analyser);
  const samples = new Uint8Array(analyser.frequencyBinCount);
  const update = () => {
    analyser.getByteFrequencyData(samples);
    const average = samples.reduce((sum, value) => sum + value, 0) / Math.max(1, samples.length);
    readingSpeechLevel.value = Math.min(1, average / 72);
    const hasSignal = readingSpeechLevel.value >= 0.035;
    if (hasSignal !== readingSpeechLastSignalState) {
      readingSpeechLastSignalState = hasSignal;
      appendReadingSpeechDebug(hasSignal ? `Sound detected: level=${readingSpeechLevel.value.toFixed(2)}.` : 'Sound stopped.');
    }
    readingSpeechAnimationFrame = requestAnimationFrame(update);
  };
  update();
}
function stopReadingSpeech(status: ReadingSpeechStatus) {
  appendReadingSpeechDebug(`Stopping microphone: status=${status}.`);
  readingSpeechRecognition?.stop();
  readingSpeechRecognition = null;
  localReadingTranscriber?.stop();
  localReadingTranscriber = null;
  cloudReadingTranscriber?.stop();
  cloudReadingTranscriber = null;
  readingSpeechStream?.getTracks().forEach((track) => track.stop());
  readingSpeechStream = null;
  cancelAnimationFrame(readingSpeechAnimationFrame);
  readingSpeechAnimationFrame = 0;
  void readingSpeechAudioContext?.close();
  readingSpeechAudioContext = null;
  readingSpeechLevel.value = 0;
  readingSpeechWordsPerMinute.value = 0;
  readingSpeechLastSignalState = false;
  readingSpeechStatus.value = status;
  configurePlaybackAudioSession();
}

function resetReadingSpeechPace() {
  readingSpeechWordsPerMinute.value = 0;
  readingSpeechPaceWordCount = 0;
  readingSpeechPaceSampleAt = performance.now();
}

function smoothReadingSpeechPace(wordsPerMinute: number) {
  const boundedPace = Math.max(45, Math.min(240, wordsPerMinute));
  readingSpeechWordsPerMinute.value = readingSpeechWordsPerMinute.value > 0
    ? readingSpeechWordsPerMinute.value * 0.68 + boundedPace * 0.32
    : boundedPace;
}

function updateReadingSpeechPace(transcript: string) {
  const wordCount = tokenizeReadingSpeech(transcript).length;
  const now = performance.now();
  if (wordCount <= readingSpeechPaceWordCount) {
    readingSpeechPaceWordCount = wordCount;
    readingSpeechPaceSampleAt = now;
    return;
  }
  const addedWords = wordCount - readingSpeechPaceWordCount;
  const elapsedMs = now - readingSpeechPaceSampleAt;
  if (addedWords < 2 && elapsedMs < 900) return;
  smoothReadingSpeechPace(addedWords * 60_000 / Math.max(500, elapsedMs));
  readingSpeechPaceWordCount = wordCount;
  readingSpeechPaceSampleAt = now;
}

function updateReadingSpeechChunkPace(wordCount: number) {
  if (wordCount > 0) smoothReadingSpeechPace(wordCount * 15);
}

function startReadingSpeechDebug(engine: string) {
  readingSpeechDebugStartedAt = performance.now();
  readingSpeechDebugEntries.value = [];
  appendReadingSpeechDebug(`Start. Engine=${engine}; platform=${navigator.platform || 'unknown'}; standalone=${window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)}; MediaRecorder=${typeof MediaRecorder !== 'undefined'}; AudioContext=${typeof window.AudioContext !== 'undefined'}.`);
  appendReadingSpeechDebug(`Voice frame: viewport=${window.innerWidth}x${window.innerHeight}; fullscreen=${readingMode.value}; reducedMotion=${window.matchMedia('(prefers-reduced-motion: reduce)').matches}; animation=recording-pulse+voice-wave.`);
}

function appendReadingSpeechDebug(message: string) {
  const elapsed = readingSpeechDebugStartedAt ? ((performance.now() - readingSpeechDebugStartedAt) / 1_000).toFixed(1) : '0.0';
  readingSpeechDebugEntries.value = [...readingSpeechDebugEntries.value.slice(-119), `[+${elapsed}s] ${message}`];
}

async function copyReadingSpeechDebugLog() {
  const text = `Mentor AI microphone debug\n${readingSpeechDebugText.value}`;
  try {
    await navigator.clipboard.writeText(text);
    Notify.create({ type: 'positive', icon: 'content_copy', message: 'Microphone debug log copied.' });
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    Notify.create({ type: copied ? 'positive' : 'negative', message: copied ? 'Microphone debug log copied.' : 'Could not copy the debug log.' });
  }
}
function setReadingMode(value: boolean) {
  const progressRatio = getCurrentReaderProgressRatio();
  applyReadingMode(value);
  saveBookReaderSettings();
  void repaginateReader({ progressRatio });
  if (!value) stopReadingSpeech('idle');
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
const readerSidebarScaleKey = 'mentor-ai:personal-reader-sidebar-scale';
function readReaderSidebarScale() {
  if (typeof localStorage === 'undefined') return minReaderSidebarScale;
  const value = Number(localStorage.getItem(readerSidebarScaleKey));
  return Number.isInteger(value) ? Math.max(minReaderSidebarScale, Math.min(maxReaderSidebarScale, value)) : minReaderSidebarScale;
}
function changeReaderSidebarScale(change: -1 | 1) {
  const progressRatio = getCurrentReaderProgressRatio();
  readerSidebarScale.value = Math.max(minReaderSidebarScale, Math.min(maxReaderSidebarScale, readerSidebarScale.value + change));
  if (typeof localStorage !== 'undefined') localStorage.setItem(readerSidebarScaleKey, String(readerSidebarScale.value));
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
const dailyReadingProgressKey = 'mentor-ai:daily-reading-progress';
function readDailyReadingProgress(): DailyReadingProgress {
  const today = localReadingDate();
  if (typeof localStorage === 'undefined') return createDailyReadingProgress(today);
  try {
    const parsed = JSON.parse(localStorage.getItem(dailyReadingProgressKey) ?? 'null') as DailyReadingProgress | null;
    if (parsed?.date && parsed.books && typeof parsed.books === 'object') {
      const prepared = prepareDailyReadingProgress(parsed, today);
      localStorage.setItem(dailyReadingProgressKey, JSON.stringify(prepared));
      return prepared;
    }
  } catch {
    // A damaged daily counter safely starts again for the current day.
  }
  return createDailyReadingProgress(today);
}
function restoreDailySpokenWords(bookId: string) {
  dailyReadingProgress.value = prepareDailyReadingProgress(dailyReadingProgress.value);
  spokenReaderWordIndexes.value = new Set(spokenWordsForBook(dailyReadingProgress.value, bookId));
  readingSpeechAcceptedWords.value = 0;
  readingSpeechSpokenWords.value = 0;
}
async function restoreSpokenReadingProgress(bookId: string) {
  restoreDailySpokenWords(bookId);
  await syncAllContentProgress().catch(() => undefined);
  const progress = await loadContentProgress('reading', bookId);
  const furthestWordIndex = Math.max(-1, Math.floor(progress?.furthestPosition ?? 0) - 1);
  readingSpeechFurthestWordIndex = furthestWordIndex;
  if (furthestWordIndex < 0) return;
  // The furthest position is useful for resuming, but it cannot prove that
  // every preceding word was spoken. Exact voice-confirmed indexes are restored
  // separately by restoreDailySpokenWords and are the only highlighted words.
  readingSpeechAnchor = furthestWordIndex + 1;
}
async function persistSpokenReadingProgress(furthestWordIndex: number) {
  const book = selectedBook.value;
  if (!book) return;
  const wordCount = readerReferenceWords.value.length;
  await saveContentProgress({
    studentId: appStore.studentId,
    category: 'reading',
    contentId: book.id,
    position: furthestWordIndex + 1,
    furthestPosition: furthestWordIndex + 1,
    duration: wordCount,
    completed: wordCount > 0 && furthestWordIndex >= wordCount - 1,
    updatedAt: new Date().toISOString(),
  });
}
function recordDailySpokenMatch(wordIndexes: readonly number[]) {
  const book = selectedBook.value;
  if (!book || typeof localStorage === 'undefined') return;
  dailyReadingProgress.value = prepareDailyReadingProgress(dailyReadingProgress.value);
  dailyReadingProgress.value = recordDailySpokenWords(dailyReadingProgress.value, book.id, wordIndexes);
  localStorage.setItem(dailyReadingProgressKey, JSON.stringify(dailyReadingProgress.value));
}
function recordCompletedReaderPage(pageIndex: number) {
  const book = selectedBook.value;
  const paper = readerPaper.value;
  if (!book || !paper || readerPageStride.value <= 0 || typeof localStorage === 'undefined') return;
  const wordIndexes = Array.from(paper.querySelectorAll<HTMLElement>('[data-reader-word-index]'))
    .filter((word) => Math.floor((word.offsetLeft + 1) / readerPageStride.value) === pageIndex)
    .map((word) => Number(word.dataset.readerWordIndex))
    .filter((wordIndex) => Number.isInteger(wordIndex) && wordIndex >= 0);
  if (!wordIndexes.length) return;
  dailyReadingProgress.value = prepareDailyReadingProgress(dailyReadingProgress.value);
  dailyReadingProgress.value = recordDailyReadWords(dailyReadingProgress.value, book.id, wordIndexes);
  localStorage.setItem(dailyReadingProgressKey, JSON.stringify(dailyReadingProgress.value));
}
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
  readerPaginationRequestId += 1;
}
async function repaginateReader(position: BookReaderProgress = { progressRatio: getCurrentReaderProgressRatio(), furthestProgressRatio: 0 }) {
  const requestId = ++readerPaginationRequestId;
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  if (requestId !== readerPaginationRequestId) return;
  const viewport = readerContent.value;
  const paper = readerPaper.value;
  if (!viewport || !paper || viewport.clientWidth <= 0) return;
  const paperStyle = getComputedStyle(paper);
  const paperPaddingLeft = Number.parseFloat(paperStyle.paddingLeft);
  const paperPaddingRight = Number.parseFloat(paperStyle.paddingRight);
  const geometry = calculateReaderPaginationGeometry({
    viewportClientWidth: viewport.clientWidth,
    paperClientWidth: paper.clientWidth,
    paperPaddingLeft,
    paperPaddingRight,
  });
  const { columnGap, columnWidth, pageWidth } = geometry;
  paper.style.setProperty('--reader-column-width', `${columnWidth}px`);
  paper.style.setProperty('--reader-column-gap', `${columnGap}px`);
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  if (requestId !== readerPaginationRequestId) return;
  readerPageCount.value = calculateReaderPageCount({
    columnGap,
    pageWidth,
    paperPaddingLeft,
    paperPaddingRight,
    paperScrollWidth: paper.scrollWidth,
  });
  readerPageStride.value = pageWidth;
  viewport.style.setProperty('--reader-paper-scroll-width', `${paper.scrollWidth}px`);
  viewport.style.setProperty('--reader-end-gutter', `${columnGap}px`);
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
function goToSyncedSpokenPosition() {
  if (readingSpeechFurthestWordIndex < 0 || readerPageStride.value <= 0) return;
  const word = readerPaper.value?.querySelector<HTMLElement>(`[data-reader-word-index="${readingSpeechFurthestWordIndex}"]`);
  if (!word) return;
  const spokenPageIndex = Math.max(0, Math.min(readerPageCount.value - 1, Math.floor((word.offsetLeft + 1) / readerPageStride.value)));
  if (spokenPageIndex <= currentBookPageIndex.value) return;
  currentBookPageIndex.value = spokenPageIndex;
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
    localStorage.removeItem(readerMarkerKey(book.id));
    personalBooks.value = await listPersonalBooks();
    Notify.create({ type: 'positive', message: `${book.title} was removed from this device.` });
  } catch {
    Notify.create({ type: 'negative', message: 'Could not delete this book.' });
  }
}
function openStoryInSafari() {
  const story = selectedStory.value;
  if (!story) return;
  const url = new URL('/audio/stories', window.location.origin);
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
function handleVisibilityChange() {
  persistProgress();
  if (document.visibilityState === 'visible') handleBookSyncWakeup();
}
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
