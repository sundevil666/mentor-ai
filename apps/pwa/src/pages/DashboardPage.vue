<template>
  <q-page class="learning-page">
    <section class="learning-shell">
      <transition :name="learningTransitionName">
        <section v-if="!appStore.isHydrated" key="hydrating" class="learning-start">
          <p class="learning-start__eyebrow">Loading</p>
          <h1>Restoring your lesson</h1>
        </section>

        <section v-else-if="!appStore.session" key="choice" class="learning-start">
          <div v-if="remoteContinueOptions.length > 0" class="handoff-actions">
            <q-btn
              v-for="handoff in remoteContinueOptions"
              :key="handoff.id"
              color="primary"
              outline
              no-caps
              icon="devices"
              :label="handoff.label"
              @click="continueFromDevice(handoff.id)"
            >
              <q-tooltip>{{ handoff.detail }}</q-tooltip>
            </q-btn>
          </div>

          <template v-if="selectedLessonLibrary === 'home'">
          <article class="priority-lesson">
            <div class="priority-lesson__topline">
              <span><q-icon name="auto_awesome" /> {{ priorityLesson.phaseLabel }}</span>
              <strong>{{ currentSuggestion.availableMinutes }} min</strong>
            </div>
            <div class="priority-lesson__body">
              <div class="priority-lesson__icon">
                <q-icon :name="recommendedTraining.icon" size="34px" />
              </div>
              <div>
                <span class="priority-lesson__skill">Priority · {{ priorityLesson.skillLabel }}</span>
                <h2>{{ priorityLesson.title }}</h2>
                <p>{{ priorityLesson.reason }}</p>
              </div>
            </div>
            <div class="priority-lesson__signals">
              <span>{{ activityMeta }}</span>
              <span>{{ paceLabel }}</span>
              <span>{{ priorityLesson.evidenceCount }} answers observed</span>
            </div>
            <q-btn
              class="priority-lesson__button"
              color="primary"
              unelevated
              no-caps
              icon-right="arrow_forward"
              label="Do this lesson first"
              @click="startTraining(priorityLesson.trainingKey)"
            />
          </article>

          <q-expansion-item
            v-model="isLessonLibraryVisible"
            class="lesson-library-expander"
            dense-toggle
            icon="tune"
            label="Specific lesson"
            switch-toggle-side
          >
            <div class="lesson-library">
              <section
                v-for="section in lessonSections"
                :key="section.concept"
                class="lesson-library__section"
              >
                <div class="lesson-library__heading">
                  <q-icon :name="section.icon" size="20px" />
                  <span>{{ section.label }}</span>
                </div>
                <div class="lesson-library__grid">
                  <button
                    v-for="lesson in section.lessons"
                    :key="lesson.templateKey"
                    class="lesson-card"
                    type="button"
                    @click="startLessonChoice(section.concept, lesson.templateKey)"
                  >
                    <span class="lesson-card__title">
                      {{ lesson.title }}
                      <q-icon
                        v-if="lesson.preferredDevice"
                        :name="deviceRecommendation(lesson.preferredDevice).icon"
                        size="18px"
                        class="lesson-device-icon"
                        :aria-label="deviceRecommendation(lesson.preferredDevice).label"
                      >
                        <q-tooltip>{{ deviceRecommendation(lesson.preferredDevice).tooltip }}</q-tooltip>
                      </q-icon>
                    </span>
                    <strong>{{ lesson.focus }}</strong>
                  </button>
                </div>
              </section>
            </div>
          </q-expansion-item>
          </template>

          <section v-else class="training-library">
            <div class="training-library__heading">
              <div>
                <p class="learning-start__eyebrow">{{ activeTrainingLibrary.label }}</p>
                <h1>{{ activeTrainingLibrary.title }}</h1>
                <p>{{ activeTrainingLibrary.description }}</p>
              </div>
              <q-icon :name="activeTrainingLibrary.icon" size="42px" color="primary" />
            </div>

            <div class="training-library__list">
              <article
                v-for="lesson in activeTrainingLibrary.lessons"
                :key="lesson.templateKey"
                class="training-library-card"
              >
                <button type="button" class="training-library-card__body" @click="startLibraryLesson(lesson)">
                  <span class="training-library-card__title">{{ lesson.title }}</span>
                  <strong>{{ lesson.focus }}</strong>
                  <span>{{ lesson.minutes }} min</span>
                </button>
                <div class="training-library-card__offline">
                  <q-icon
                    :name="libraryDownloadIcon(lesson.templateKey)"
                    :color="libraryDownloadStatus[lesson.templateKey] === 'ready' ? 'positive' : 'grey-7'"
                    size="20px"
                  />
                  <span>{{ libraryDownloadLabel(lesson.templateKey) }}</span>
                  <q-btn
                    color="primary"
                    :icon="libraryDownloadStatus[lesson.templateKey] === 'ready' ? 'check' : 'download'"
                    :label="libraryDownloadStatus[lesson.templateKey] === 'ready' ? 'Downloaded' : 'Download'"
                    :loading="libraryDownloadStatus[lesson.templateKey] === 'downloading'"
                    :disable="libraryDownloadStatus[lesson.templateKey] === 'ready'"
                    dense
                    flat
                    no-caps
                    @click="downloadLibraryLesson(lesson)"
                  />
                </div>
              </article>
            </div>
          </section>
        </section>

        <section
          v-else-if="!appStore.isLessonComplete && currentExercise"
          key="exercise"
          class="lesson-stage"
        >
          <div class="lesson-nav">
            <q-btn
              color="primary"
              flat
              icon="arrow_back"
              round
              :aria-label="lessonBackLabel"
              @click="returnToLessonChoice()"
            >
              <q-tooltip>{{ lessonBackLabel }}</q-tooltip>
            </q-btn>
            <div class="lesson-nav__status">
              <span>{{ displayedLessonProgress }}% complete</span>
              <q-btn
                v-if="isListeningPlayer"
                color="primary"
                dense
                flat
                :icon="offlineAudioIcon"
                :label="offlineAudioStatus === 'downloading' ? `${offlineAudioProgress}%` : undefined"
                no-caps
                :disable="offlineAudioStatus === 'downloading'"
                aria-label="Offline audio"
                @click="prepareListeningOfflineAudio(true)"
              >
                <q-tooltip>{{ offlineAudioTooltip }}</q-tooltip>
              </q-btn>
              <q-btn
                v-if="isListeningPlayer"
                color="primary"
                dense
                flat
                :icon="isListeningPlaylistVisible ? 'playlist_remove' : 'playlist_play'"
                round
                :aria-label="isListeningPlaylistVisible ? 'Hide text list' : 'Show text list'"
                @click="toggleListeningPlaylist"
              >
                <q-tooltip>{{
                  isListeningPlaylistVisible ? 'Hide text list' : 'Show text list'
                }}</q-tooltip>
              </q-btn>
              <q-btn
                color="primary"
                dense
                flat
                icon="info_outline"
                round
                aria-label="Lesson details"
              >
                <q-tooltip>Lesson details</q-tooltip>
                <q-menu anchor="bottom right" self="top right">
                  <div class="lesson-info-popover">
                    <span>{{ appStore.session.lesson.title }}</span>
                    <strong>{{ selectedListeningItem?.title ?? currentExercise.prompt }}</strong>
                    <p>{{ currentExercise.microLesson }}</p>
                  </div>
                </q-menu>
              </q-btn>
            </div>
          </div>

          <div
            class="lesson-time-progress"
            role="group"
            :aria-label="`Lesson progress. ${lessonTotalTimeLabel}. ${lessonRemainingTimeLabel}.`"
          >
            <div class="lesson-time-progress__labels">
              <span>{{ lessonTotalTimeLabel }}</span>
              <span>{{ lessonRemainingTimeLabel }}</span>
            </div>
            <q-linear-progress
              :value="lessonProgressRatio"
              color="primary"
              track-color="grey-4"
              rounded
              size="8px"
            />
          </div>

          <transition :name="exerciseTransitionName">
            <div
              v-if="isDialogueTranslationExercise"
              :key="currentExercise.id"
              class="dialogue-drill"
            >
              <div>
                <p class="lesson-stage__eyebrow">
                  {{ appStore.session.lesson.title }}
                  <q-icon
                    v-if="appStore.session.lesson.preferredDevice"
                    :name="deviceRecommendation(appStore.session.lesson.preferredDevice).icon"
                    size="18px"
                    class="lesson-device-icon"
                  >
                    <q-tooltip>{{ deviceRecommendation(appStore.session.lesson.preferredDevice).tooltip }}</q-tooltip>
                  </q-icon>
                </p>
                <h1>{{ currentExercise.prompt }}</h1>
                <p>{{ currentExercise.microLesson }}</p>
              </div>

              <div class="dialogue-drill__prompt">
                <span>{{ currentExercise.phraseFocus ?? 'spoken pattern' }}</span>
                <strong>{{ currentExercise.nativePrompt }}</strong>
              </div>

              <div
                :class="[
                  'dialogue-drill__recorder',
                  {
                    'dialogue-drill__recorder--active': isRecognizingSpeech,
                    'dialogue-drill__recorder--captured': speechRecognitionCaptured,
                    'dialogue-drill__recorder--error': speechRecognitionError,
                  },
                ]"
                role="status"
                aria-live="polite"
              >
                <q-btn
                  :color="isRecognizingSpeech ? 'negative' : 'primary'"
                  :icon="isRecognizingSpeech ? 'stop_circle' : 'mic'"
                  :label="isRecognizingSpeech ? 'Stop recording' : speechRecognitionCaptured ? 'Record again' : 'Record answer'"
                  unelevated
                  no-caps
                  :disable="!speechRecognitionAvailable"
                  @click="recordDialogueAnswer"
                />
                <q-btn color="primary" flat icon="volume_up" round @click="playAudio">
                  <q-tooltip>Play native answer</q-tooltip>
                </q-btn>
                <span class="dialogue-drill__recorder-status">
                  <q-icon :name="speechStatusIcon" size="20px" />
                  <span>
                    <strong>{{ speechStatusTitle }}</strong>
                    <small>{{ speechSupportMessage }}</small>
                  </span>
                </span>
              </div>

              <q-input
                v-model="answer"
                label="Recognized text or typed answer"
                outlined
                @keyup.enter="submit"
              />

              <div v-if="currentExercise.audioText" class="dialogue-drill__native">
                <span>Native answer</span>
                <strong>{{ currentExercise.audioText }}</strong>
              </div>

              <div class="lesson-actions">
                <q-btn
                  color="primary"
                  label="Continue"
                  unelevated
                  :disable="answer.trim().length === 0"
                  @click="submit"
                />
              </div>
            </div>

            <div v-else-if="!isListeningPlayer" :key="currentExercise.id" class="exercise-standard">
              <div>
                <p class="lesson-stage__eyebrow">
                  {{ appStore.session.lesson.title }}
                  <q-icon
                    v-if="appStore.session.lesson.preferredDevice"
                    :name="deviceRecommendation(appStore.session.lesson.preferredDevice).icon"
                    size="18px"
                    class="lesson-device-icon"
                  >
                    <q-tooltip>{{ deviceRecommendation(appStore.session.lesson.preferredDevice).tooltip }}</q-tooltip>
                  </q-icon>
                </p>
                <h1>{{ currentExercise.prompt }}</h1>
                <p>{{ currentExercise.microLesson }}</p>
              </div>

              <div v-if="currentExercise.audioText" class="audio-row">
                <q-btn color="primary" flat icon="volume_up" round @click="playAudio">
                  <q-tooltip>Play audio</q-tooltip>
                </q-btn>
                <span>{{ currentExercise.audioText }}</span>
              </div>

              <q-option-group
                v-if="currentExercise.options"
                v-model="answer"
                class="exercise-options"
                :options="optionList"
                color="primary"
              />
              <q-input
                v-else
                v-model="answer"
                :label="inputLabel"
                outlined
                autofocus
                @keyup.enter="submit"
              />

              <div class="lesson-actions">
                <span>{{ currentExercise.successTip }}</span>
                <q-btn
                  color="primary"
                  label="Continue"
                  unelevated
                  :disable="answer.trim().length === 0"
                  @click="submit"
                />
              </div>
            </div>

            <div v-else :key="currentExercise.id" class="listening-player">
              <div
                :class="[
                  'listening-player__body',
                  { 'listening-player__body--playlist-hidden': !isListeningPlaylistVisible },
                ]"
              >
                <aside class="listening-player__playlist">
                  <button
                    v-for="sentence in listeningSentences"
                    :key="sentence.id"
                    :class="[
                      'listening-player__playlist-item',
                      {
                        'listening-player__playlist-item--active':
                          sentence.id === activeListeningSentenceItem?.id,
                      },
                    ]"
                    type="button"
                    @click="selectListeningSentence(sentence)"
                  >
                    <strong>{{ sentence.number }}</strong>
                    <span>{{ sentence.text }}</span>
                  </button>
                </aside>

                <div
                  ref="listeningTextElement"
                  :class="[
                    'listening-player__text',
                    {
                      'listening-player__text--translation-visible': isListeningTranslationVisible,
                    },
                  ]"
                  @scroll="handleListeningTextScroll"
                >
                  <q-btn
                    class="listening-player__continue-button"
                    color="primary"
                    label="Continue"
                    no-caps
                    unelevated
                    @click="completeListeningExercise"
                  />
                  <q-btn
                    class="listening-player__start-over-button"
                    color="primary"
                    flat
                    icon="restart_alt"
                    label="Start"
                    no-caps
                    @click="resetListeningToBeginning"
                  >
                    <q-tooltip>Go to the beginning</q-tooltip>
                  </q-btn>
                  <q-btn
                    class="listening-player__translate-button"
                    :color="isListeningTranslationVisible ? 'secondary' : 'primary'"
                    flat
                    icon="translate"
                    :label="isListeningTranslationVisible ? 'EN' : 'RU'"
                    no-caps
                    @click="toggleListeningTranslation"
                  >
                    <q-tooltip>{{
                      isListeningTranslationVisible ? 'Show English' : 'Перевести на русский'
                    }}</q-tooltip>
                  </q-btn>
                  <p class="listening-player__sentence listening-player__sentence--previous">
                    {{
                      isListeningTranslationVisible
                        ? translateListeningSentence(previousListeningSentenceItem?.text ?? '')
                        : (previousListeningSentenceItem?.text ?? '')
                    }}
                  </p>
                  <p
                    :class="[
                      'listening-player__sentence',
                      'listening-player__sentence--current',
                      {
                        'listening-player__sentence--compact':
                          (activeListeningSentenceItem?.text.length ?? 0) > 72,
                        'listening-player__sentence--dense':
                          (activeListeningSentenceItem?.text.length ?? 0) > 110,
                      },
                    ]"
                  >
                    <span
                      v-if="isListeningTranslationVisible"
                      class="listening-player__translated-current"
                    >
                      {{ translateListeningSentence(activeListeningSentenceItem?.text ?? '') }}
                    </span>
                    <span
                      v-for="token in listeningTokens.slice(
                        activeListeningSentenceItem?.startWordIndex ?? 0,
                        (activeListeningSentenceItem?.endWordIndex ?? -1) + 1,
                      )"
                      v-else
                      :key="token.index"
                      :data-token-index="token.index"
                      :class="[
                        'listening-player__token',
                        {
                          'listening-player__token--active':
                            token.index >= activeWordIndex && token.index <= activeWordEndIndex,
                          'listening-player__token--past': token.index < activeWordIndex,
                        },
                      ]"
                    >{{ token.word }}{{ token.trailing }}</span>
                  </p>
                  <p class="listening-player__sentence listening-player__sentence--next">
                    {{
                      isListeningTranslationVisible
                        ? translateListeningSentence(nextListeningSentenceItem?.text ?? '')
                        : (nextListeningSentenceItem?.text ?? '')
                    }}
                  </p>
                </div>
              </div>

              <div class="listening-player__controls">
                <q-btn
                  color="primary"
                  flat
                  icon="keyboard_double_arrow_left"
                  round
                  @click="jumpSentence(-1)"
                >
                  <q-tooltip>Previous sentence</q-tooltip>
                </q-btn>
                <q-btn
                  color="primary"
                  class="listening-player__play-button"
                  unelevated
                  :icon="
                    isListeningPaused
                      ? 'play_arrow'
                      : isListeningStarting || isListeningSpeaking
                        ? 'pause'
                        : 'play_arrow'
                  "
                  round
                  @click="toggleListeningPlayback"
                >
                  <q-tooltip>{{
                    isListeningPaused
                      ? 'Resume'
                      : isListeningStarting || isListeningSpeaking
                        ? 'Pause'
                        : 'Play'
                  }}</q-tooltip>
                </q-btn>
                <q-btn
                  :color="isListeningRepeatEnabled ? 'secondary' : 'primary'"
                  :flat="!isListeningRepeatEnabled"
                  :unelevated="isListeningRepeatEnabled"
                  icon="repeat"
                  round
                  @click="toggleListeningRepeat"
                >
                  <q-tooltip>{{
                    isListeningRepeatEnabled ? 'Repeat is on' : 'Repeat selected text'
                  }}</q-tooltip>
                </q-btn>
                <q-btn
                  color="primary"
                  flat
                  icon="keyboard_double_arrow_right"
                  round
                  @click="jumpSentence(1)"
                >
                  <q-tooltip>Next sentence</q-tooltip>
                </q-btn>
                <q-btn
                  class="listening-player__word-control"
                  color="primary"
                  flat
                  icon="skip_previous"
                  round
                  @click="jumpWord(-1)"
                >
                  <q-tooltip>Previous word</q-tooltip>
                </q-btn>
                <q-btn
                  class="listening-player__word-control"
                  color="primary"
                  flat
                  icon="skip_next"
                  round
                  @click="jumpWord(1)"
                >
                  <q-tooltip>Next word</q-tooltip>
                </q-btn>
              </div>
            </div>
          </transition>
        </section>

        <section v-else key="complete" class="lesson-complete">
          <p class="lesson-complete__eyebrow">Lesson complete</p>
          <h1>{{ appStore.latestRecommendation?.summary }}</h1>
          <p>{{ appStore.latestRecommendation?.reason }}</p>
          <p v-if="appStore.session?.observation">
            {{ appStore.session.observation.description }}
          </p>
          <q-btn
            color="primary"
            label="Improve now"
            unelevated
            @click="startWithMode(currentSuggestion.mode)"
          />
          <q-btn
            color="primary"
            outline
            icon="arrow_back"
            :label="lessonBackLabel"
            no-caps
            @click="returnToLessonChoice()"
          />
        </section>
      </transition>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import type { LearningConcept, LearningMode, PreferredLessonDevice } from '@mentor-ai/shared';
import { getPreferredLessonDevice } from '@mentor-ai/shared';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  createPriorityLesson,
  createCurrentActivitySuggestion,
  createLearningContext,
  findTrainingMode,
  formatActivityMeta,
  formatPaceLabel,
  type TrainingKey,
} from 'src/services/learning-context';
import {
  isSpeechBatchCached,
  isSpeechSynthesisAvailable,
  pauseSpeech,
  preloadSpeechBatch,
  resumeSpeech,
  setActiveSpeechRepeat,
  speakWithPreferredVoice,
  stopSpeech,
} from 'src/services/speech-synthesis';
import {
  isSpeechRecognitionAvailable,
  recognizeSpeechOnce,
  stopSpeechRecognition,
} from 'src/services/speech-recognition';
import {
  readListeningProgressPreference,
  saveListeningProgressPreference,
} from 'src/services/user-preferences';
import { useAppStore } from 'src/stores/app-store';
import { markOfflineLessonOpened, registerOfflineSpeechLesson } from 'src/services/offline-library';

type LessonChoice = {
  templateKey: string;
  title: string;
  focus: string;
  preferredDevice?: PreferredLessonDevice;
};
type LessonSection = {
  concept: LearningConcept;
  label: string;
  icon: string;
  lessons: LessonChoice[];
};
type ListeningToken = {
  index: number;
  word: string;
  trailing: string;
  start: number;
  end: number;
};
type ListeningPlaylistItem = {
  id: string;
  title: string;
  text: string;
};
type ListeningSentenceItem = {
  id: string;
  itemId: string;
  number: number;
  text: string;
  startWordIndex: number;
  endWordIndex: number;
};
type TrainingLibraryKey = 'home' | 'listening' | 'speaking';
type LessonReturnDestination = TrainingLibraryKey | 'specific-lessons';
type TrainingLibraryLesson = LessonChoice & { mode: 'listening' | 'speaking'; minutes: number };

const appStore = useAppStore();
const route = useRoute();
const answer = ref('');
const activeWordIndex = ref(0);
const activeWordEndIndex = ref(0);
const isListeningSpeaking = ref(false);
const isListeningStarting = ref(false);
const isListeningPaused = ref(false);
const isListeningRepeatEnabled = ref(false);
const isListeningTranslationVisible = ref(false);
const isListeningPlaylistVisible = ref(false);
const isLessonLibraryVisible = ref(false);
const selectedLessonLibrary = ref<TrainingLibraryKey>('home');
const lessonReturnDestination = ref<LessonReturnDestination>('home');
const libraryDownloadStatus = ref<Record<string, 'idle' | 'checking' | 'downloading' | 'ready' | 'error'>>({});
const offlineAudioStatus = ref<'idle' | 'downloading' | 'ready' | 'error'>('idle');
const offlineAudioProgress = ref(0);
const isRecognizingSpeech = ref(false);
const speechRecognitionError = ref('');
const speechRecognitionCaptured = ref(false);
const selectedListeningItemId = ref<string | null>(null);
const activeSpeechRunId = ref(0);
const learningTransitionName = ref('learning-slide-forward');
const exerciseTransitionName = ref('exercise-slide-forward');
const listeningTextElement = ref<HTMLElement | null>(null);
const isListeningAutoScrollPaused = ref(false);
let listeningAutoScrollPauseTimer: number | undefined;
let isProgrammaticListeningScroll = false;
let programmaticListeningScrollUntil = 0;
let offlineAudioDownloadRunId = 0;

const currentExercise = computed(() => appStore.currentExercise);
const lessonEstimatedMinutes = computed(() =>
  Math.max(1, Math.round(appStore.session?.lesson.estimatedMinutes ?? 1)),
);
const currentExerciseProgress = computed(() => {
  if (!isListeningPlayer.value || listeningTokens.value.length <= 1) {
    return 0;
  }

  return clampIndex(activeWordIndex.value, 0, listeningTokens.value.length - 1)
    / (listeningTokens.value.length - 1);
});
const lessonProgressRatio = computed(() => {
  const session = appStore.session;

  if (!session || session.lesson.exercises.length === 0) {
    return 0;
  }

  if (session.completedAt) {
    return 1;
  }

  return Math.min(
    1,
    (session.currentExerciseIndex + currentExerciseProgress.value)
      / session.lesson.exercises.length,
  );
});
const displayedLessonProgress = computed(() => Math.round(lessonProgressRatio.value * 100));
const lessonRemainingSeconds = computed(() =>
  Math.max(0, Math.round(lessonEstimatedMinutes.value * 60 * (1 - lessonProgressRatio.value))),
);
const lessonTotalTimeLabel = computed(() => formatClockTime(lessonEstimatedMinutes.value * 60));
const lessonRemainingTimeLabel = computed(() => formatClockTime(lessonRemainingSeconds.value));
const isListeningPlayer = computed(() => {
  if (!appStore.session || !currentExercise.value) {
    return false;
  }

  return currentExercise.value.type === 'listening-text';
});
const isDialogueTranslationExercise = computed(
  () => currentExercise.value?.type === 'dialogue-translation',
);
const speechRecognitionAvailable = computed(() => isSpeechRecognitionAvailable());
const speechSupportMessage = computed(() => {
  if (isRecognizingSpeech.value) {
    return 'Speak now. Tap Stop recording when you finish.';
  }

  if (speechRecognitionError.value) {
    return speechRecognitionError.value;
  }

  if (speechRecognitionCaptured.value) {
    return 'Your words are shown in the answer field below. You can edit or record again.';
  }

  if (!speechRecognitionAvailable.value) {
    return 'Voice recognition is not available on this device. Type the answer here instead.';
  }

  return 'Tap Record answer, then speak. Recording stops automatically after a pause.';
});
const speechStatusTitle = computed(() => {
  if (isRecognizingSpeech.value) return 'Recording now';
  if (speechRecognitionError.value) return 'Recording failed';
  if (speechRecognitionCaptured.value) return 'Answer recorded';
  if (!speechRecognitionAvailable.value) return 'Voice recording unavailable';
  return 'Ready to record';
});
const speechStatusIcon = computed(() => {
  if (isRecognizingSpeech.value) return 'graphic_eq';
  if (speechRecognitionError.value) return 'error_outline';
  if (speechRecognitionCaptured.value) return 'check_circle';
  if (!speechRecognitionAvailable.value) return 'mic_off';
  return 'mic_none';
});
const listeningPlaylist = computed<ListeningPlaylistItem[]>(() => {
  const lesson = appStore.session?.lesson;

  if (!lesson) {
    return [];
  }

  return lesson.exercises
    .map((exercise, index) => {
      const text = (
        exercise.audioText ?? (exercise.type === 'listening-text' ? exercise.prompt : '')
      ).trim();

      if (!text) {
        return null;
      }

      return {
        id: exercise.id,
        title: exercise.prompt || `Text ${index + 1}`,
        text,
      };
    })
    .filter((item): item is ListeningPlaylistItem => item !== null);
});
const selectedListeningItem = computed(() => {
  const playlist = listeningPlaylist.value;

  return playlist.find((item) => item.id === selectedListeningItemId.value) ?? playlist[0] ?? null;
});
const listeningText = computed(
  () =>
    selectedListeningItem.value?.text ??
    currentExercise.value?.audioText ??
    currentExercise.value?.prompt ??
    '',
);
const listeningTokens = computed(() => tokenizeListeningText(listeningText.value));
const listeningSentences = computed<ListeningSentenceItem[]>(() => {
  const item = selectedListeningItem.value;
  const tokens = listeningTokens.value;

  if (!item) {
    return [];
  }

  const starts = getSentenceStartWordIndexes(tokens);

  return starts.map((startWordIndex, sentenceIndex) => {
    const endWordIndex = (starts[sentenceIndex + 1] ?? tokens.length) - 1;

    return {
      id: `${item.id}:${startWordIndex}`,
      itemId: item.id,
      number: sentenceIndex + 1,
      text: tokens
        .slice(startWordIndex, endWordIndex + 1)
        .map((token) => `${token.word}${token.trailing}`)
        .join('')
        .replace(/\s+/g, ' ')
        .trim(),
      startWordIndex,
      endWordIndex,
    };
  });
});
const listeningProgressKey = computed(() => {
  const session = appStore.session;
  const item = selectedListeningItem.value;

  if (!session || !item || !isListeningPlayer.value) {
    return null;
  }

  return `${session.lesson.id}:${item.id}`;
});
const offlineAudioIcon = computed(() => {
  if (offlineAudioStatus.value === 'ready') return 'offline_pin';
  if (offlineAudioStatus.value === 'error') return 'cloud_download';
  if (offlineAudioStatus.value === 'downloading') return 'downloading';
  return 'download_for_offline';
});
const offlineAudioTooltip = computed(() => {
  if (offlineAudioStatus.value === 'ready') return 'This lesson is ready offline';
  if (offlineAudioStatus.value === 'error') return 'Offline audio is incomplete. Tap to retry.';
  if (offlineAudioStatus.value === 'downloading') {
    return `Preparing offline audio: ${offlineAudioProgress.value}%`;
  }
  return 'Download this lesson for offline listening';
});
const sentenceStartWordIndexes = computed(() => getSentenceStartWordIndexes(listeningTokens.value));
const activeListeningSentenceIndex = computed(() => {
  const itemId = selectedListeningItem.value?.id;
  const exactIndex = listeningSentences.value.findIndex(
    (sentence) =>
      sentence.itemId === itemId &&
      activeWordIndex.value >= sentence.startWordIndex &&
      activeWordIndex.value <= sentence.endWordIndex,
  );

  return exactIndex >= 0 ? exactIndex : 0;
});
const activeListeningSentenceItem = computed(
  () => listeningSentences.value[activeListeningSentenceIndex.value] ?? null,
);
const previousListeningSentenceItem = computed(
  () => listeningSentences.value[activeListeningSentenceIndex.value - 1] ?? null,
);
const nextListeningSentenceItem = computed(
  () => listeningSentences.value[activeListeningSentenceIndex.value + 1] ?? null,
);
const optionList = computed(
  () => currentExercise.value?.options?.map((option) => ({ label: option, value: option })) ?? [],
);
const inputLabel = computed(() =>
  currentExercise.value?.type === 'repeat-speaking' ? 'What did you say?' : 'Your answer',
);
const currentSuggestion = computed(() =>
  createCurrentActivitySuggestion(appStore.preferredWorkShift, appStore.activitySnapshots, new Date(), appStore.myShiftActivity),
);
const paceLabel = computed(() => formatPaceLabel(currentSuggestion.value));
const activityMeta = computed(() => formatActivityMeta(currentSuggestion.value));
const remoteContinueOptions = computed(() =>
  appStore.remoteSessionHandoffs.map((handoff) => ({
    id: handoff.id,
    label: `Continue from ${handoff.sourceDevice}`,
    detail: `${handoff.lesson.title} · ${Math.min(handoff.currentExerciseIndex + 1, handoff.lesson.exercises.length)}/${handoff.lesson.exercises.length}`,
  })),
);
const lessonSections: LessonSection[] = [
  {
    concept: 'learning',
    label: 'Real practice',
    icon: 'school',
    lessons: [
      {
        templateKey: 'weekly-weak-spots-dialogue',
        title: 'Work conversation',
        focus: 'Five complete spoken phrases for a real workday',
        preferredDevice: getPreferredLessonDevice('weekly-weak-spots-dialogue'),
      },
      {
        templateKey: 'commute-listening',
        title: 'Commute listening',
        focus: 'A complete ten-minute listening session',
        preferredDevice: getPreferredLessonDevice('commute-listening'),
      },
    ],
  },
];
const trainingLibraries: Record<'listening' | 'speaking', {
  label: string;
  title: string;
  description: string;
  icon: string;
  lessons: TrainingLibraryLesson[];
}> = {
  listening: {
    label: 'Listen',
    title: 'Listening lessons',
    description: 'Choose a lesson to begin, or download its audio before you go offline.',
    icon: 'headphones',
    lessons: [
      { templateKey: 'commute-listening', title: 'Commute listening', focus: 'A complete listening session for the journey', mode: 'listening', minutes: 10 },
      { templateKey: 'shop-listening', title: 'At a small shop', focus: 'Follow a short dialogue and understand a real request', mode: 'listening', minutes: 7 },
    ],
  },
  speaking: {
    label: 'Speak',
    title: 'Speaking lessons',
    description: 'Choose a speaking practice, or download its voice examples for offline use.',
    icon: 'record_voice_over',
    lessons: [
      { templateKey: 'weekly-weak-spots-dialogue', title: 'Work conversation', focus: 'Say five complete phrases for a real workday', mode: 'speaking', minutes: 9 },
      { templateKey: 'polite-speaking', title: 'Polite requests', focus: 'Keep a conversation going when you need help', mode: 'speaking', minutes: 7 },
    ],
  },
};
const activeTrainingLibrary = computed(() =>
  selectedLessonLibrary.value === 'speaking' ? trainingLibraries.speaking : trainingLibraries.listening,
);
const lessonBackLabel = computed(() => {
  if (lessonReturnDestination.value === 'listening') return 'Back to Listening lessons';
  if (lessonReturnDestination.value === 'speaking') return 'Back to Speaking lessons';
  if (lessonReturnDestination.value === 'specific-lessons') return 'Back to Specific lessons';
  return 'Back to Home';
});

function deviceRecommendation(device: PreferredLessonDevice) {
  return device === 'mac'
    ? {
        icon: 'laptop_mac',
        label: 'Mac preferred',
        tooltip: 'Mac is preferred for more reliable voice recognition and detailed answers.',
      }
    : {
        icon: 'phone_iphone',
        label: 'iPhone preferred',
        tooltip: 'iPhone is preferred for convenient listening on the move.',
      };
}
const recommendedTraining = computed(() => {
  const key = priorityLesson.value.trainingKey;
  const training = findTrainingMode(key);

  return {
    ...training,
    label: `Start ${training.shortLabel}`,
    reason: `${training.reason} ${currentSuggestion.value.reason}`,
  };
});
const priorityLesson = computed(() => createPriorityLesson(appStore.studentModel));
async function openTrainingLibrary(library: 'listening' | 'speaking') {
  if (appStore.session) await returnToLessonChoice();
  selectedLessonLibrary.value = library;
  await refreshLibraryDownloadStatuses(trainingLibraries[library].lessons);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function startLibraryLesson(lesson: TrainingLibraryLesson) {
  markOfflineLessonOpened(lesson.templateKey, lesson.mode);
  lessonReturnDestination.value = selectedLessonLibrary.value;
  answer.value = '';
  setForwardTransition();
  await appStore.startLesson(createLearningContext(currentSuggestion.value, {
    mode: lesson.mode,
    selectedConcept: 'learning',
    manualConceptChoice: true,
    lessonTemplateKey: lesson.templateKey,
  }));
}

async function downloadLibraryLesson(lesson: TrainingLibraryLesson) {
  libraryDownloadStatus.value[lesson.templateKey] = 'downloading';
  try {
    const generatedLesson = await appStore.loadLesson(createLearningContext(currentSuggestion.value, {
      mode: lesson.mode,
      selectedConcept: 'learning',
      manualConceptChoice: true,
      lessonTemplateKey: lesson.templateKey,
    }), new Date().toISOString());
    const texts = getLessonOfflineSpeechTexts(generatedLesson.exercises);
    const result = await preloadSpeechBatch(texts);
    libraryDownloadStatus.value[lesson.templateKey] = result.failed === 0 ? 'ready' : 'error';
    if (result.failed === 0) {
      registerOfflineSpeechLesson({ id: lesson.templateKey, category: lesson.mode, title: lesson.title, speechTexts: texts });
    }
  } catch {
    libraryDownloadStatus.value[lesson.templateKey] = 'error';
  }
}

async function refreshLibraryDownloadStatuses(lessons: TrainingLibraryLesson[]) {
  await Promise.all(lessons.map(async (lesson) => {
    libraryDownloadStatus.value[lesson.templateKey] = 'checking';
    try {
      const generatedLesson = await appStore.loadLesson(createLearningContext(currentSuggestion.value, {
        mode: lesson.mode,
        selectedConcept: 'learning',
        manualConceptChoice: true,
        lessonTemplateKey: lesson.templateKey,
      }), new Date().toISOString());
      const texts = getLessonOfflineSpeechTexts(generatedLesson.exercises);
      const ready = await isSpeechBatchCached(texts);
      libraryDownloadStatus.value[lesson.templateKey] = ready ? 'ready' : 'idle';
      if (ready) {
        registerOfflineSpeechLesson({ id: lesson.templateKey, category: lesson.mode, title: lesson.title, speechTexts: texts });
      }
    } catch {
      libraryDownloadStatus.value[lesson.templateKey] = 'idle';
    }
  }));
}

function getLessonOfflineSpeechTexts(exercises: Array<{ audioText?: string }>) {
  return exercises.flatMap((exercise) => {
    const text = exercise.audioText?.trim();
    if (!text) return [];
    const tokens = tokenizeListeningText(text);
    const starts = getSentenceStartWordIndexes(tokens);
    return starts.map((start, index) => tokens.slice(start, (starts[index + 1] ?? tokens.length))
      .map((token) => `${token.word}${token.trailing}`).join('').replace(/\s+/g, ' ').trim());
  });
}

function libraryDownloadLabel(templateKey: string) {
  const status = libraryDownloadStatus.value[templateKey];
  if (status === 'ready') return 'Available offline';
  if (status === 'checking') return 'Checking offline availability…';
  if (status === 'downloading') return 'Downloading for offline use…';
  if (status === 'error') return 'Download incomplete — try again';
  return 'Internet required';
}

function libraryDownloadIcon(templateKey: string) {
  const status = libraryDownloadStatus.value[templateKey];
  if (status === 'ready') return 'offline_pin';
  if (status === 'downloading' || status === 'checking') return 'downloading';
  if (status === 'error') return 'cloud_off';
  return 'cloud_queue';
}
onMounted(async () => {
  if (!appStore.isHydrated) {
    await appStore.hydrate();
  }

  if (!appStore.session && (route.query.training === 'listening' || route.query.training === 'speaking')) {
    await openTrainingLibrary(route.query.training);
  }

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('beforeunload', handlePageExit);
  window.addEventListener('pagehide', handlePageExit);
});

onUnmounted(() => {
  stopListeningAudio();
  stopSpeechRecognition();
  resetListeningAutoScroll();
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  window.removeEventListener('beforeunload', handlePageExit);
  window.removeEventListener('pagehide', handlePageExit);
});

watch(
  () => route.query.training,
  (training) => {
    if (training === 'listening' || training === 'speaking') {
      void openTrainingLibrary(training);
      return;
    }

    selectedLessonLibrary.value = 'home';
    if (appStore.session) {
      void returnToLessonChoice('home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
);

watch(
  () => currentExercise.value?.id,
  () => {
    isListeningPlaylistVisible.value = false;
    void nextTick(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    answer.value = '';
    speechRecognitionError.value = '';
    speechRecognitionCaptured.value = false;
    stopSpeechRecognition();
    isRecognizingSpeech.value = false;
    if (isListeningPlayer.value) {
      selectedListeningItemId.value =
        currentExercise.value?.id ?? listeningPlaylist.value[0]?.id ?? null;
      restoreListeningPlayback();
      return;
    }

    resetListeningPlayback();
  },
);

watch(isListeningPlayer, (isActiveListeningPlayer) => {
  if (isActiveListeningPlayer) {
    selectedListeningItemId.value =
      currentExercise.value?.id ?? listeningPlaylist.value[0]?.id ?? null;
    restoreListeningPlayback();
    void nextTick(() => prepareListeningOfflineAudio());
    return;
  }

  offlineAudioDownloadRunId += 1;
  offlineAudioStatus.value = 'idle';
  offlineAudioProgress.value = 0;
  resetListeningPlayback();
});

watch(listeningPlaylist, (playlist) => {
  if (!isListeningPlayer.value || playlist.length === 0) {
    selectedListeningItemId.value = null;
    return;
  }

  if (!playlist.some((item) => item.id === selectedListeningItemId.value)) {
    selectedListeningItemId.value = currentExercise.value?.id ?? playlist[0]?.id ?? null;
  }
});

watch(
  listeningText,
  () => {
    offlineAudioStatus.value = 'idle';
    offlineAudioProgress.value = 0;
    void prepareListeningOfflineAudio();
  },
  { immediate: true },
);

watch([activeWordIndex, activeWordEndIndex], () => {
  saveListeningPlaybackProgress();
  void scrollActiveListeningPhraseIntoView();
});

async function startWithMode(mode: LearningMode) {
  lessonReturnDestination.value = selectedLessonLibrary.value;
  answer.value = '';
  isLessonLibraryVisible.value = false;
  setForwardTransition();
  await appStore.startLesson(createLearningContext(currentSuggestion.value, { mode }));
}

async function startConcept(concept: LearningConcept) {
  lessonReturnDestination.value = selectedLessonLibrary.value;
  answer.value = '';
  isLessonLibraryVisible.value = false;
  setForwardTransition();
  await appStore.startLesson(
    createLearningContext(currentSuggestion.value, {
      selectedConcept: concept,
      manualConceptChoice: true,
    }),
  );
}

async function startLessonChoice(concept: LearningConcept, lessonTemplateKey: string) {
  lessonReturnDestination.value = 'specific-lessons';
  answer.value = '';
  isLessonLibraryVisible.value = false;
  setForwardTransition();
  await appStore.startLesson(
    createLearningContext(currentSuggestion.value, {
      selectedConcept: concept,
      manualConceptChoice: true,
      lessonTemplateKey,
    }),
  );
}

async function startTraining(training: TrainingKey) {
  if (training === 'vocabulary') {
    await startConcept('vocabulary');
    return;
  }

  await startWithMode(training);
}

async function continueFromDevice(handoffId: string) {
  const handoff = appStore.remoteSessionHandoffs.find((item) => item.id === handoffId);

  if (!handoff) {
    return;
  }

  answer.value = '';
  isLessonLibraryVisible.value = false;
  setForwardTransition();
  await appStore.continueSessionHandoff(handoff);
}

async function submit() {
  if (answer.value.trim().length === 0) {
    return;
  }

  setForwardTransition();
  await appStore.submitCurrentExercise(answer.value);
}

async function completeListeningExercise() {
  answer.value = 'listened';
  stopListeningAudio();
  await submit();
}

async function recordDialogueAnswer() {
  if (!speechRecognitionAvailable.value) {
    return;
  }

  if (isRecognizingSpeech.value) {
    stopSpeechRecognition();
    return;
  }

  speechRecognitionError.value = '';
  speechRecognitionCaptured.value = false;
  answer.value = '';
  isRecognizingSpeech.value = true;

  try {
    const result = await recognizeSpeechOnce('en-US', undefined, (transcript) => {
      answer.value = transcript;
    });
    answer.value = result.transcript;
    speechRecognitionCaptured.value = true;
  } catch (error) {
    speechRecognitionCaptured.value = false;
    speechRecognitionError.value =
      error instanceof Error
        ? error.message
        : 'Speech recognition failed. Type the answer here instead.';
  } finally {
    isRecognizingSpeech.value = false;
  }
}

async function playAudio() {
  const text = currentExercise.value?.audioText;

  if (text && isSpeechSynthesisAvailable()) {
    await speakWithPreferredVoice(text, { voice: currentExercise.value?.audioVoice ?? 'mia' });
  }

  await appStore.replayAudio();
}

async function toggleListeningPlayback() {
  if (!isSpeechSynthesisAvailable()) {
    return;
  }

  if (isListeningStarting.value) {
    activeSpeechRunId.value += 1;
    stopSpeech();
    isListeningStarting.value = false;
    isListeningSpeaking.value = true;
    isListeningPaused.value = true;
    return;
  }

  if (isListeningSpeaking.value && !isListeningPaused.value) {
    await pauseSpeech();
    isListeningPaused.value = true;
    return;
  }

  if (isListeningSpeaking.value && isListeningPaused.value) {
    isListeningPaused.value = false;

    if (await resumeSpeech()) {
      return;
    }

    speakListeningPhrase(activeWordIndex.value, activeSpeechRunId.value);
    return;
  }

  await startListeningAtWord(activeWordIndex.value);
}

async function jumpWord(direction: -1 | 1) {
  const maxIndex = Math.max(listeningTokens.value.length - 1, 0);
  await startListeningAtWord(clampIndex(activeWordIndex.value + direction, 0, maxIndex));
}

async function resetListeningToBeginning() {
  stopListeningAudio();
  activeWordIndex.value = 0;
  activeWordEndIndex.value = 0;
  await scrollActiveListeningPhraseIntoView();
}

async function jumpSentence(direction: -1 | 1) {
  const sentenceStarts = sentenceStartWordIndexes.value;

  if (sentenceStarts.length === 0) {
    await jumpWord(direction);
    return;
  }

  const currentSentenceIndex = Math.max(
    0,
    findLastNumberIndex(sentenceStarts, activeWordIndex.value),
  );
  const nextSentenceIndex = clampIndex(
    currentSentenceIndex + direction,
    0,
    sentenceStarts.length - 1,
  );

  await startListeningAtWord(sentenceStarts[nextSentenceIndex] ?? 0);
}

async function selectListeningSentence(sentence: ListeningSentenceItem) {
  stopListeningAudio();

  if (sentence.itemId !== selectedListeningItemId.value) {
    selectedListeningItemId.value = sentence.itemId;
    await nextTick();
  }

  activeWordIndex.value = sentence.startWordIndex;
  activeWordEndIndex.value = sentence.startWordIndex;
  await scrollActiveListeningPhraseIntoView();
}

async function prepareListeningOfflineAudio(force = false) {
  if (!isListeningPlayer.value || offlineAudioStatus.value === 'downloading') {
    return;
  }

  if (!force && offlineAudioStatus.value === 'ready') {
    return;
  }

  const texts = listeningSentences.value.map((sentence) => sentence.text);

  if (texts.length === 0) {
    return;
  }

  const runId = offlineAudioDownloadRunId + 1;
  offlineAudioDownloadRunId = runId;
  offlineAudioStatus.value = 'downloading';
  offlineAudioProgress.value = 0;

  const result = await preloadSpeechBatch(texts, (completed, total) => {
    if (runId !== offlineAudioDownloadRunId) {
      return;
    }

    offlineAudioProgress.value = Math.round((completed / total) * 100);
  });

  if (runId !== offlineAudioDownloadRunId) {
    return;
  }

  offlineAudioProgress.value = 100;
  offlineAudioStatus.value = result.failed === 0 ? 'ready' : 'error';
}

function toggleListeningRepeat() {
  const repeat = !isListeningRepeatEnabled.value;
  isListeningRepeatEnabled.value = repeat;
  setActiveSpeechRepeat(repeat);

  // If playback is already active, rebuild it as one native looping media
  // stream while this button press still carries mobile user activation.
  if (repeat && (isListeningSpeaking.value || isListeningStarting.value)) {
    void startListeningAtWord(0);
  }
}

function toggleListeningTranslation() {
  isListeningTranslationVisible.value = !isListeningTranslationVisible.value;
}

function toggleListeningPlaylist() {
  isListeningPlaylistVisible.value = !isListeningPlaylistVisible.value;
}

async function startListeningAtWord(wordIndex: number) {
  const tokens = listeningTokens.value;

  if (tokens.length === 0 || !isSpeechSynthesisAvailable()) {
    return;
  }

  const safeWordIndex = clampIndex(wordIndex, 0, tokens.length - 1);
  const runId = activeSpeechRunId.value + 1;

  activeSpeechRunId.value = runId;
  activeWordIndex.value = safeWordIndex;
  activeWordEndIndex.value = safeWordIndex;
  isListeningPaused.value = false;
  isListeningStarting.value = true;
  isListeningSpeaking.value = false;
  stopSpeech();
  void speakListeningPhrase(safeWordIndex, runId);
  await appStore.replayAudio();
}

async function speakListeningPhrase(wordIndex: number, runId: number) {
  const tokens = listeningTokens.value;

  if (tokens.length === 0 || runId !== activeSpeechRunId.value || !isSpeechSynthesisAvailable()) {
    return;
  }

  const token = tokens[wordIndex];

  if (!token) {
    finishListeningPlayback(runId);
    return;
  }

  const nextSentenceStart = isListeningRepeatEnabled.value
    ? undefined
    : sentenceStartWordIndexes.value.find((start) => start > wordIndex);
  const sentenceEndWordIndex = nextSentenceStart ?? tokens.length;
  const playbackTokens = tokens.slice(wordIndex, sentenceEndWordIndex);
  const playbackText = playbackTokens.map((item) => `${item.word}${item.trailing}`).join('');
  activeWordIndex.value = wordIndex;
  activeWordEndIndex.value = wordIndex;
  const started = await speakWithPreferredVoice(playbackText, {
    mediaTitle: selectedListeningItem.value?.title ?? 'English listening practice',
    repeat: isListeningRepeatEnabled.value,
    onTimeUpdate: (currentTime, duration) => {
      if (runId !== activeSpeechRunId.value || !Number.isFinite(duration) || duration <= 0) {
        return;
      }

      const progressIndex = Math.min(
        playbackTokens.length - 1,
        Math.floor((currentTime / duration) * playbackTokens.length),
      );
      activeWordIndex.value = wordIndex + progressIndex;
      activeWordEndIndex.value = activeWordIndex.value;
    },
    onEnd: () => {
      if (runId !== activeSpeechRunId.value) {
        return;
      }

      const nextWordIndex = wordIndex + playbackTokens.length;

      if (nextWordIndex < tokens.length) {
        void speakListeningPhrase(nextWordIndex, runId);
        return;
      }

      finishListeningPlayback(runId, false);
    },
    onError: () => {
      if (runId === activeSpeechRunId.value) {
        finishListeningPlayback(runId);
      }
    },
  });

  if (runId !== activeSpeechRunId.value) {
    return;
  }

  if (started) {
    isListeningStarting.value = false;
    isListeningSpeaking.value = true;
    return;
  }

  finishListeningPlayback(runId);
}

function finishListeningPlayback(runId: number, allowRepeat = true) {
  if (runId !== activeSpeechRunId.value) {
    return;
  }

  if (
    allowRepeat &&
    isListeningRepeatEnabled.value &&
    listeningTokens.value.length > 0 &&
    isSpeechSynthesisAvailable()
  ) {
    activeWordIndex.value = 0;
    activeWordEndIndex.value = 0;
    void speakListeningPhrase(0, runId);
    return;
  }

  isListeningSpeaking.value = false;
  isListeningStarting.value = false;
  isListeningPaused.value = false;
}

function stopListeningAudio(saveProgress = true) {
  if (saveProgress) {
    saveListeningPlaybackProgress();
  }

  activeSpeechRunId.value += 1;

  stopSpeech();

  isListeningSpeaking.value = false;
  isListeningStarting.value = false;
  isListeningPaused.value = false;
}

function resetListeningPlayback() {
  stopListeningAudio();
  activeWordIndex.value = 0;
  activeWordEndIndex.value = 0;
  isListeningTranslationVisible.value = false;
  resetListeningAutoScroll();
}

function restoreListeningPlayback() {
  stopListeningAudio(false);
  resetListeningAutoScroll();

  const progressKey = listeningProgressKey.value;
  const maxIndex = Math.max(listeningTokens.value.length - 1, 0);
  const savedWordIndex = progressKey
    ? readListeningProgressPreference(progressKey)?.wordIndex
    : undefined;
  const safeWordIndex = clampIndex(savedWordIndex ?? 0, 0, maxIndex);

  activeWordIndex.value = safeWordIndex;
  activeWordEndIndex.value = safeWordIndex;
}

function saveListeningPlaybackProgress() {
  const progressKey = listeningProgressKey.value;

  if (!progressKey || listeningTokens.value.length === 0) {
    return;
  }

  saveListeningProgressPreference(
    progressKey,
    clampIndex(activeWordIndex.value, 0, listeningTokens.value.length - 1),
  );
}

function handleListeningTextScroll() {
  if (isProgrammaticListeningScroll || Date.now() < programmaticListeningScrollUntil) {
    return;
  }

  pauseListeningAutoScroll();
}

function pauseListeningAutoScroll() {
  isListeningAutoScrollPaused.value = true;

  if (listeningAutoScrollPauseTimer !== undefined) {
    window.clearTimeout(listeningAutoScrollPauseTimer);
  }

  listeningAutoScrollPauseTimer = window.setTimeout(() => {
    isListeningAutoScrollPaused.value = false;
    listeningAutoScrollPauseTimer = undefined;
  }, 4000);
}

function resetListeningAutoScroll() {
  isListeningAutoScrollPaused.value = false;
  isProgrammaticListeningScroll = false;
  programmaticListeningScrollUntil = 0;

  if (listeningAutoScrollPauseTimer !== undefined) {
    window.clearTimeout(listeningAutoScrollPauseTimer);
    listeningAutoScrollPauseTimer = undefined;
  }

  window.requestAnimationFrame(() => {
    if (listeningTextElement.value) {
      listeningTextElement.value.scrollTop = 0;
    }
  });
}

async function scrollActiveListeningPhraseIntoView() {
  if (isListeningAutoScrollPaused.value) {
    return;
  }

  await nextTick();

  const container = listeningTextElement.value;

  if (!container || listeningTokens.value.length === 0) {
    return;
  }

  const activeToken = container.querySelector<HTMLElement>(
    `[data-token-index="${activeWordIndex.value}"]`,
  );

  if (!activeToken) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const tokenRect = activeToken.getBoundingClientRect();
  const tokenTop = tokenRect.top - containerRect.top;
  const tokenCenter = tokenTop + tokenRect.height / 2;

  const targetScrollTop = clampIndex(
    Math.round(container.scrollTop + tokenCenter - container.clientHeight * 0.5),
    0,
    Math.max(container.scrollHeight - container.clientHeight, 0),
  );

  if (Math.abs(container.scrollTop - targetScrollTop) < 8) {
    return;
  }

  isProgrammaticListeningScroll = true;
  programmaticListeningScrollUntil = Date.now() + 900;
  container.scrollTo({
    top: targetScrollTop,
    behavior: 'smooth',
  });
  window.setTimeout(() => {
    isProgrammaticListeningScroll = false;
  }, 900);
}

async function returnToLessonChoice(destination?: LessonReturnDestination) {
  const returnDestination = destination ?? lessonReturnDestination.value;
  answer.value = '';
  isListeningPlaylistVisible.value = false;
  isLessonLibraryVisible.value = false;
  offlineAudioDownloadRunId += 1;
  offlineAudioStatus.value = 'idle';
  offlineAudioProgress.value = 0;
  stopListeningAudio();
  setBackTransition();
  await appStore.returnToLessonChoice();
  selectedLessonLibrary.value = returnDestination === 'specific-lessons' ? 'home' : returnDestination;
  isLessonLibraryVisible.value = returnDestination === 'specific-lessons';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setForwardTransition() {
  learningTransitionName.value = 'learning-slide-forward';
  exerciseTransitionName.value = 'exercise-slide-forward';
}

function setBackTransition() {
  learningTransitionName.value = 'learning-slide-back';
  exerciseTransitionName.value = 'exercise-slide-back';
}

function handleOnline() {
  appStore.setNetworkStatus(true);
}

function handleOffline() {
  appStore.setNetworkStatus(false);
}

function handlePageExit() {
  void appStore.persistSession();
  stopListeningAudio();
}

function tokenizeListeningText(text: string): ListeningToken[] {
  const tokens: ListeningToken[] = [];
  let index = 0;

  for (const match of text.matchAll(/\S+/g)) {
    const word = match[0];
    const start = match.index ?? 0;
    const end = start + word.length;
    const nextWordOffset = text.slice(end).search(/\S/);
    const trailingEnd = nextWordOffset === -1 ? text.length : end + nextWordOffset;

    tokens.push({
      index,
      word,
      trailing: text.slice(end, trailingEnd),
      start,
      end,
    });
    index += 1;
  }

  return tokens;
}

function getSentenceStartWordIndexes(tokens: ListeningToken[]): number[] {
  if (tokens.length === 0) {
    return [];
  }

  const starts = [0];

  for (const token of tokens) {
    if (/[.!?]["')\]]*$/.test(token.word)) {
      const nextToken = tokens[token.index + 1];

      if (nextToken) {
        starts.push(nextToken.index);
      }
    }
  }

  return Array.from(new Set(starts));
}

function translateListeningSentence(sentence: string): string {
  const normalizedSentence = normalizeListeningSentence(sentence);
  const translation = listeningSentenceTranslations[normalizedSentence];

  return translation ?? sentence;
}

function normalizeListeningSentence(sentence: string): string {
  return sentence.replace(/\s+/g, ' ').trim().toLowerCase();
}

function clampIndex(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatClockTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function findLastNumberIndex(values: number[], maxValue: number): number {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if ((values[index] ?? 0) <= maxValue) {
      return index;
    }
  }

  return -1;
}

const listeningSentenceTranslations: Record<string, string> = {
  [normalizeListeningSentence('Mia: What time do you start work today?')]:
    'Мия: Во сколько ты сегодня начинаешь работу?',
  [normalizeListeningSentence('Tom: I start at seven, but I need to leave home at six.')]:
    'Том: Я начинаю в семь, но мне нужно выйти из дома в шесть.',
  [normalizeListeningSentence('Mia: Are you going by bus or by car?')]:
    'Мия: Ты едешь на автобусе или на машине?',
  [normalizeListeningSentence('Tom: By bus.')]: 'Том: На автобусе.',
  [normalizeListeningSentence('Could you send me the address again, please?')]:
    'Можешь отправить мне адрес ещё раз, пожалуйста?',
  [normalizeListeningSentence('Mia: Sure.')]: 'Мия: Конечно.',
  [normalizeListeningSentence('I also ran into Pavel near the station this morning.')]:
    'Я ещё случайно встретила Павла возле станции сегодня утром.',
  [normalizeListeningSentence('Tom: Nice.')]: 'Том: Отлично.',
  [normalizeListeningSentence('I want to ask him about the new schedule later.')]:
    'Я хочу позже спросить его о новом расписании.',
  [normalizeListeningSentence(
    'This morning I am going to work, and I want to use my travel time for English.',
  )]: 'Сегодня утром я еду на работу и хочу использовать время в дороге для английского.',
  [normalizeListeningSentence('I leave home with my bag, my phone, and my headphones.')]:
    'Я выхожу из дома с сумкой, телефоном и наушниками.',
  [normalizeListeningSentence('The street is quiet, but the bus stop is already a little busy.')]:
    'На улице тихо, но на автобусной остановке уже немного людно.',
  [normalizeListeningSentence(
    'I check the time and I see that I have ten minutes before the bus arrives.',
  )]: 'Я смотрю на время и вижу, что до прихода автобуса у меня есть десять минут.',
  [normalizeListeningSentence(
    'I decide to listen to a simple English story and read the text at the same time.',
  )]: 'Я решаю послушать простую английскую историю и одновременно читать текст.',
  [normalizeListeningSentence('When I hear a new word, I do not stop immediately.')]:
    'Когда я слышу новое слово, я не останавливаюсь сразу.',
  [normalizeListeningSentence(
    'First, I listen to the whole sentence and try to understand the main idea.',
  )]: 'Сначала я слушаю все предложение и пытаюсь понять главную мысль.',
  [normalizeListeningSentence('Then I replay the sentence and look at the word again.')]:
    'Потом я повторно включаю предложение и снова смотрю на слово.',
  [normalizeListeningSentence('This helps me connect the sound, the spelling, and the meaning.')]:
    'Это помогает мне связать звучание, написание и значение.',
  [normalizeListeningSentence('On the bus, I sit near the window and lower the volume a little.')]:
    'В автобусе я сажусь у окна и немного уменьшаю громкость.',
  [normalizeListeningSentence(
    'I can hear the voice clearly, but I can also hear the world around me.',
  )]: 'Я хорошо слышу голос, но также слышу мир вокруг себя.',
  [normalizeListeningSentence(
    'The speaker talks about a normal day, simple plans, and small choices.',
  )]: 'Диктор говорит об обычном дне, простых планах и маленьких выборах.',
  [normalizeListeningSentence(
    'I hear phrases like I will take the bus, I need a coffee, and I will start work soon.',
  )]: 'Я слышу фразы вроде: я поеду на автобусе, мне нужен кофе, и я скоро начну работать.',
  [normalizeListeningSentence('These phrases are useful because I can say them in my own life.')]:
    'Эти фразы полезны, потому что я могу сказать их в своей жизни.',
  [normalizeListeningSentence(
    'I repeat some words quietly in my head, but I do not need to speak loudly.',
  )]: 'Я тихо повторяю некоторые слова про себя, но мне не нужно говорить громко.',
  [normalizeListeningSentence('The goal is not to understand every word perfectly.')]:
    'Цель не в том, чтобы идеально понять каждое слово.',
  [normalizeListeningSentence(
    'The goal is to stay with the text, catch the rhythm, and understand more each time.',
  )]: 'Цель в том, чтобы оставаться с текстом, улавливать ритм и каждый раз понимать больше.',
  [normalizeListeningSentence('After two minutes, the story feels easier.')]:
    'Через две минуты история кажется легче.',
  [normalizeListeningSentence(
    'I notice the same words again and again: morning, bus, work, listen, today, and later.',
  )]: 'Я снова и снова замечаю одни и те же слова: morning, bus, work, listen, today и later.',
  [normalizeListeningSentence(
    'Repeated words become friendly because my ears meet them many times.',
  )]: 'Повторяющиеся слова становятся знакомыми, потому что мои уши встречают их много раз.',
  [normalizeListeningSentence(
    'When the bus turns onto the main road, I move to the next paragraph.',
  )]: 'Когда автобус поворачивает на главную дорогу, я перехожу к следующему абзацу.',
  [normalizeListeningSentence('The text talks about a person planning a small English routine.')]:
    'В тексте говорится о человеке, который планирует маленькую привычку для английского.',
  [normalizeListeningSentence(
    'The person listens for ten minutes in the morning and reads for five minutes in the evening.',
  )]: 'Этот человек слушает десять минут утром и читает пять минут вечером.',
  [normalizeListeningSentence('This routine is small, but it is easy to repeat.')]:
    'Эта привычка маленькая, но ее легко повторять.',
  [normalizeListeningSentence(
    'A small routine every day is stronger than a hard lesson once a month.',
  )]: 'Небольшая ежедневная привычка сильнее, чем тяжелый урок раз в месяц.',
  [normalizeListeningSentence('I like this idea because I am often tired after work.')]:
    'Мне нравится эта идея, потому что после работы я часто устаю.',
  [normalizeListeningSentence('If I only have a little energy, I can still listen and read.')]:
    'Если у меня мало энергии, я все равно могу слушать и читать.',
  [normalizeListeningSentence(
    'If I have more energy, I can repeat sentences and answer questions.',
  )]: 'Если у меня больше энергии, я могу повторять предложения и отвечать на вопросы.',
  [normalizeListeningSentence(
    'The voice says that progress can feel slow, but listening grows quietly.',
  )]: 'Голос говорит, что прогресс может казаться медленным, но навык слушания растет незаметно.',
  [normalizeListeningSentence(
    'One day a phrase is difficult, and later the same phrase feels normal.',
  )]: 'В один день фраза трудная, а позже та же фраза кажется обычной.',
  [normalizeListeningSentence('I look at the highlighted words and follow them with my eyes.')]:
    'Я смотрю на выделенные слова и слежу за ними глазами.',
  [normalizeListeningSentence('When the highlight moves, I know exactly where the voice is.')]:
    'Когда выделение двигается, я точно знаю, где сейчас голос.',
  [normalizeListeningSentence('If I lose my place, I go back one sentence and listen again.')]:
    'Если я теряю место, я возвращаюсь на одно предложение назад и слушаю снова.',
  [normalizeListeningSentence('If one word is unclear, I go back one word and hear it again.')]:
    'Если одно слово непонятно, я возвращаюсь на одно слово назад и слушаю его снова.',
  [normalizeListeningSentence('This makes listening active, but still calm.')]:
    'Это делает слушание активным, но все еще спокойным.',
  [normalizeListeningSentence(
    'Near the end of the ride, I understand the story better than at the beginning.',
  )]: 'Ближе к концу поездки я понимаю историю лучше, чем в начале.',
  [normalizeListeningSentence(
    'I can remember the main idea: use small moments, listen often, and read while listening.',
  )]:
    'Я могу запомнить главную мысль: использовать короткие моменты, часто слушать и читать во время слушания.',
  [normalizeListeningSentence('I do not need perfect grammar in my head while I listen.')]:
    'Пока я слушаю, мне не нужна идеальная грамматика в голове.',
  [normalizeListeningSentence('I need attention, patience, and a simple text that I can finish.')]:
    'Мне нужны внимание, терпение и простой текст, который я могу закончить.',
  [normalizeListeningSentence('When I arrive at work, I stop the audio and save my progress.')]:
    'Когда я прихожу на работу, я останавливаю аудио и сохраняю прогресс.',
  [normalizeListeningSentence('Later, I can return to the same text and it will feel easier.')]:
    'Позже я могу вернуться к тому же тексту, и он будет казаться легче.',
  [normalizeListeningSentence(
    'The same listening text can teach me new sounds on the first day and confidence on the second day.',
  )]:
    'Один и тот же текст для слушания может в первый день учить новым звукам, а во второй давать уверенность.',
  [normalizeListeningSentence(
    'Every replay is useful evidence because it shows what my ears are training.',
  )]: 'Каждое повторное прослушивание полезно, потому что показывает, что тренируют мои уши.',
  [normalizeListeningSentence('Today I listened, read, and stayed with English for ten minutes.')]:
    'Сегодня я слушал, читал и оставался с английским десять минут.',
  [normalizeListeningSentence('That is real practice, and it counts.')]:
    'Это настоящая практика, и она засчитывается.',
};
</script>
