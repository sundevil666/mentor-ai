<template>
  <q-page class="learning-page">
    <section class="learning-shell">
      <div class="learning-status">
        <q-badge
          class="network-status-badge"
          :color="syncColor"
          :outline="appStore.isOnline && appStore.pendingSyncCount === 0"
        >
          {{ syncLabel }}
        </q-badge>
        <q-badge class="network-status-badge" :color="appStore.isOnline ? 'teal-8' : 'negative'">
          {{ appStore.isOnline ? 'Online' : 'Offline' }}
        </q-badge>
        <span>Model v{{ appStore.studentModel.version }}</span>
        <span class="level-trend">
          <q-icon :name="levelTrend.icon" size="18px" />
          {{ levelTrend.level }} · {{ levelTrend.daysLabel }}
          <q-tooltip>{{ levelTrend.tooltip }}</q-tooltip>
        </span>
      </div>

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

          <p class="learning-start__eyebrow">Activity check</p>
          <h1>{{ activityHeadline }}</h1>
          <p>{{ currentSuggestion.reason }}</p>

          <div class="activity-signal">
            <span>{{ activityMeta }}</span>
            <strong>{{ paceLabel }}</strong>
          </div>

          <div class="recommended-action">
            <q-btn
              class="recommended-action__button"
              color="primary"
              unelevated
              no-caps
              :icon="recommendedTraining.icon"
              :label="recommendedTraining.label"
              @click="startTraining(recommendedTraining.key)"
            >
              <q-tooltip>{{ recommendedTraining.reason }}</q-tooltip>
            </q-btn>
            <span>{{ recommendedTraining.reason }}</span>
          </div>

          <q-expansion-item
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
        </section>

        <section
          v-else-if="!appStore.isLessonComplete && currentExercise"
          key="exercise"
          class="lesson-stage"
        >
          <div class="lesson-nav">
            <q-btn
              color="primary"
              outline
              icon="arrow_back"
              no-caps
              label="Back to choice"
              @click="returnToLessonChoice"
            />
            <span>{{ appStore.lessonProgress }}% complete</span>
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

              <div class="dialogue-drill__recorder">
                <q-btn
                  color="primary"
                  :icon="isRecognizingSpeech ? 'graphic_eq' : 'mic'"
                  :label="isRecognizingSpeech ? 'Listening...' : 'Record answer'"
                  unelevated
                  no-caps
                  :disable="!speechRecognitionAvailable || isRecognizingSpeech"
                  @click="recordDialogueAnswer"
                />
                <q-btn color="primary" flat icon="volume_up" round @click="playAudio">
                  <q-tooltip>Play native answer</q-tooltip>
                </q-btn>
                <span>{{ speechSupportMessage }}</span>
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
              <div class="listening-player__header">
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
                  <h1>{{ selectedListeningItem?.title ?? listeningTitle }}</h1>
                  <p>{{ currentExercise.microLesson }}</p>
                </div>
                <q-btn
                  color="primary"
                  flat
                  :icon="isListeningPlaylistVisible ? 'playlist_remove' : 'playlist_play'"
                  round
                  @click="toggleListeningPlaylist"
                >
                  <q-tooltip>{{
                    isListeningPlaylistVisible ? 'Hide text list' : 'Show text list'
                  }}</q-tooltip>
                </q-btn>
              </div>

              <div
                :class="[
                  'listening-player__body',
                  { 'listening-player__body--playlist-hidden': !isListeningPlaylistVisible },
                ]"
              >
                <aside class="listening-player__playlist">
                  <button
                    v-for="item in listeningPlaylist"
                    :key="item.id"
                    :class="[
                      'listening-player__playlist-item',
                      {
                        'listening-player__playlist-item--active':
                          item.id === selectedListeningItem?.id,
                      },
                    ]"
                    type="button"
                    @click="selectListeningItem(item.id)"
                  >
                    <span>{{ item.title }}</span>
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
                  <span
                    v-for="token in listeningTokens"
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
                    >{{ token.word }}{{ token.trailing }}</span
                  >
                </div>
              </div>

              <div
                v-if="isListeningTranslationVisible"
                class="listening-player__translation"
                aria-live="polite"
              >
                <span>{{ activeListeningSentenceTranslation }}</span>
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
                    isListeningPaused ? 'play_arrow' : isListeningSpeaking ? 'pause' : 'play_arrow'
                  "
                  round
                  @click="toggleListeningPlayback"
                >
                  <q-tooltip>{{
                    isListeningPaused ? 'Resume' : isListeningSpeaking ? 'Pause' : 'Play'
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
                  :color="isListeningTranslationVisible ? 'secondary' : 'primary'"
                  :flat="!isListeningTranslationVisible"
                  :unelevated="isListeningTranslationVisible"
                  icon="translate"
                  round
                  @click="toggleListeningTranslation"
                >
                  <q-tooltip>{{
                    isListeningTranslationVisible ? 'Hide translation' : 'Translate sentence'
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
                <q-btn color="primary" flat icon="skip_previous" round @click="jumpWord(-1)">
                  <q-tooltip>Previous word</q-tooltip>
                </q-btn>
                <q-btn color="primary" flat icon="skip_next" round @click="jumpWord(1)">
                  <q-tooltip>Next word</q-tooltip>
                </q-btn>
                <span>{{ listeningProgressLabel }}</span>
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
            label="Back to choice"
            no-caps
            @click="returnToLessonChoice"
          />
        </section>
      </transition>
    </section>

    <nav class="mobile-start-dock" aria-label="Start lesson">
      <button
        v-for="item in quickStartItems"
        :key="item.key"
        class="mobile-start-dock__button"
        type="button"
        @click="item.start"
      >
        <q-icon :name="item.icon" size="24px" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </q-page>
</template>

<script setup lang="ts">
import type {
  ConceptLevel,
  LearningConcept,
  LearningMode,
  PreferredLessonDevice,
  StudentModel,
} from '@mentor-ai/shared';
import { getPreferredLessonDevice } from '@mentor-ai/shared';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  chooseRecommendedTraining,
  createCurrentActivitySuggestion,
  createLearningContext,
  findTrainingMode,
  formatActivityMeta,
  formatPaceLabel,
  type TrainingKey,
} from 'src/services/learning-context';
import {
  isSpeechSynthesisAvailable,
  pauseSpeech,
  resumeSpeech,
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
type QuickStartItem = {
  key: string;
  label: string;
  icon: string;
  start: () => void;
};

const appStore = useAppStore();
const answer = ref('');
const activeWordIndex = ref(0);
const activeWordEndIndex = ref(0);
const isListeningSpeaking = ref(false);
const isListeningPaused = ref(false);
const isListeningRepeatEnabled = ref(false);
const isListeningTranslationVisible = ref(false);
const isListeningPlaylistVisible = ref(false);
const isRecognizingSpeech = ref(false);
const speechRecognitionError = ref('');
const selectedListeningItemId = ref<string | null>(null);
const activeSpeechRunId = ref(0);
const learningTransitionName = ref('learning-slide-forward');
const exerciseTransitionName = ref('exercise-slide-forward');
const listeningTextElement = ref<HTMLElement | null>(null);
const isListeningAutoScrollPaused = ref(false);
let listeningAutoScrollPauseTimer: number | undefined;
let isProgrammaticListeningScroll = false;
let programmaticListeningScrollUntil = 0;

const currentExercise = computed(() => appStore.currentExercise);
const isListeningPlayer = computed(() => {
  if (!appStore.session || !currentExercise.value) {
    return false;
  }

  return (
    currentExercise.value.type === 'listening-text' ||
    (appStore.session.context.mode === 'listening' &&
      currentExercise.value.targetSkill === 'listening' &&
      Boolean(currentExercise.value.audioText))
  );
});
const isDialogueTranslationExercise = computed(
  () => currentExercise.value?.type === 'dialogue-translation',
);
const speechRecognitionAvailable = computed(() => isSpeechRecognitionAvailable());
const speechSupportMessage = computed(() => {
  if (speechRecognitionError.value) {
    return speechRecognitionError.value;
  }

  if (!speechRecognitionAvailable.value) {
    return 'Voice recognition is not available on this device. Type the answer here instead.';
  }

  return 'Desktop Chrome/Edge can record and turn your answer into text.';
});
const levelTrend = computed(() => createLevelTrend(appStore.studentModel));
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
const listeningProgressKey = computed(() => {
  const session = appStore.session;
  const item = selectedListeningItem.value;

  if (!session || !item || !isListeningPlayer.value) {
    return null;
  }

  return `${session.lesson.id}:${item.id}`;
});
const sentenceStartWordIndexes = computed(() => getSentenceStartWordIndexes(listeningTokens.value));
const activeListeningSentence = computed(() =>
  getListeningSentenceAtWord(activeWordIndex.value, listeningTokens.value),
);
const activeListeningSentenceTranslation = computed(() =>
  translateListeningSentence(activeListeningSentence.value),
);
const listeningTitle = computed(() =>
  currentExercise.value?.type === 'listening-text'
    ? 'Listen and read'
    : (currentExercise.value?.prompt ?? 'Listen'),
);
const listeningProgressLabel = computed(() => {
  if (listeningTokens.value.length === 0) {
    return 'Ready to listen';
  }

  return `Word ${Math.min(activeWordIndex.value + 1, listeningTokens.value.length)} / ${listeningTokens.value.length}`;
});
const optionList = computed(
  () => currentExercise.value?.options?.map((option) => ({ label: option, value: option })) ?? [],
);
const inputLabel = computed(() =>
  currentExercise.value?.type === 'repeat-speaking' ? 'What did you say?' : 'Your answer',
);
const syncLabel = computed(() =>
  appStore.pendingSyncCount > 0 ? `${appStore.pendingSyncCount} pending` : 'Offline ready',
);
const syncColor = computed(() => {
  if (appStore.pendingSyncCount > 0) {
    return appStore.isOnline ? 'amber-8' : 'deep-orange-7';
  }

  return appStore.isOnline ? 'teal-8' : 'grey-7';
});
const currentSuggestion = computed(() =>
  createCurrentActivitySuggestion(appStore.preferredWorkShift, appStore.activitySnapshots, new Date(), appStore.myShiftActivity),
);
const activityHeadline = computed(() => {
  return `Best now: ${recommendedTraining.value.shortLabel}`;
});
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
    label: 'Learning',
    icon: 'school',
    lessons: [
      {
        templateKey: 'daily-guided',
        title: 'Daily guided English',
        focus: 'Grammar, listening, speaking, recall',
      },
      {
        templateKey: 'work-speaking',
        title: 'Speaking confidence at work',
        focus: 'Low-pressure speech and question order',
        preferredDevice: getPreferredLessonDevice('work-speaking'),
      },
      {
        templateKey: 'weekly-weak-spots-dialogue',
        title: 'Weekly weak spots dialogue',
        focus: 'Question order, prepositions, requests, natural chunks',
        preferredDevice: getPreferredLessonDevice('weekly-weak-spots-dialogue'),
      },
      {
        templateKey: 'morning-questions-listening',
        title: 'Morning questions',
        focus: 'Question words, time meaning, word order',
        preferredDevice: getPreferredLessonDevice('morning-questions-listening'),
      },
    ],
  },
  {
    concept: 'reading',
    label: 'Reading',
    icon: 'menu_book',
    lessons: [
      {
        templateKey: 'message-reading',
        title: 'Short work message',
        focus: 'Comprehension, changed detail, useful words',
      },
      {
        templateKey: 'routine-reading',
        title: 'Evening routine',
        focus: 'Sequence, time meaning, action words',
      },
      {
        templateKey: 'cafe-reading',
        title: 'Afternoon cafe',
        focus: 'Main idea, place words, short reading',
      },
    ],
  },
  {
    concept: 'vocabulary',
    label: 'Vocabulary Growth',
    icon: 'psychology',
    lessons: [
      {
        templateKey: 'work-vocabulary',
        title: 'Work words',
        focus: 'Recognition, recall, sentence use',
      },
      {
        templateKey: 'travel-vocabulary',
        title: 'Travel words',
        focus: 'Meaning, active recall, context',
      },
      {
        templateKey: 'greetings-vocabulary',
        title: 'Greetings',
        focus: 'Recognition, polite recall, phrase use',
      },
    ],
  },
];

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
  const key = chooseRecommendedTraining(currentSuggestion.value, appStore.studentModel);
  const training = findTrainingMode(key);

  return {
    ...training,
    label: `Start ${training.shortLabel}`,
    reason: `${training.reason} ${currentSuggestion.value.reason}`,
  };
});
const quickStartItems = computed<QuickStartItem[]>(() => [
  {
    key: 'listening',
    label: 'Listen',
    icon: 'headphones',
    start: () => {
      void startTraining('listening');
    },
  },
  {
    key: 'speaking',
    label: 'Speak',
    icon: 'record_voice_over',
    start: () => {
      void startTraining('speaking');
    },
  },
  {
    key: 'vocabulary',
    label: 'Words',
    icon: 'psychology',
    start: () => {
      void startTraining('vocabulary');
    },
  },
  {
    key: 'reading',
    label: 'Read',
    icon: 'menu_book',
    start: () => {
      void startConcept('reading');
    },
  },
]);
onMounted(async () => {
  if (!appStore.isHydrated) {
    await appStore.hydrate();
  }

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('beforeunload', handlePageExit);
  window.addEventListener('pagehide', handlePageExit);
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  stopListeningAudio();
  stopSpeechRecognition();
  resetListeningAutoScroll();
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  window.removeEventListener('beforeunload', handlePageExit);
  window.removeEventListener('pagehide', handlePageExit);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

watch(
  () => currentExercise.value?.id,
  () => {
    answer.value = '';
    speechRecognitionError.value = '';
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
    return;
  }

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

watch([activeWordIndex, activeWordEndIndex], () => {
  saveListeningPlaybackProgress();
  void scrollActiveListeningPhraseIntoView();
});

async function startWithMode(mode: LearningMode) {
  answer.value = '';
  setForwardTransition();
  await appStore.startLesson(createLearningContext(currentSuggestion.value, { mode }));
}

async function startConcept(concept: LearningConcept) {
  answer.value = '';
  setForwardTransition();
  await appStore.startLesson(
    createLearningContext(currentSuggestion.value, {
      selectedConcept: concept,
      manualConceptChoice: true,
    }),
  );
}

async function startLessonChoice(concept: LearningConcept, lessonTemplateKey: string) {
  answer.value = '';
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

async function recordDialogueAnswer() {
  if (!speechRecognitionAvailable.value || isRecognizingSpeech.value) {
    return;
  }

  speechRecognitionError.value = '';
  isRecognizingSpeech.value = true;

  try {
    const result = await recognizeSpeechOnce('en-US');
    answer.value = result.transcript;
  } catch (error) {
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
    await speakWithPreferredVoice(text);
  }

  await appStore.replayAudio();
}

async function toggleListeningPlayback() {
  if (!isSpeechSynthesisAvailable()) {
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

function selectListeningItem(itemId: string) {
  if (itemId === selectedListeningItemId.value) {
    return;
  }

  selectedListeningItemId.value = itemId;
  restoreListeningPlayback();
}

function toggleListeningRepeat() {
  isListeningRepeatEnabled.value = !isListeningRepeatEnabled.value;
}

function toggleListeningTranslation() {
  isListeningTranslationVisible.value = !isListeningTranslationVisible.value;
  void scrollActiveListeningPhraseIntoView();
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
  isListeningSpeaking.value = true;
  isListeningPaused.value = false;
  stopSpeech();
  void speakListeningPhrase(safeWordIndex, runId);
  await appStore.replayAudio();
}

async function speakListeningPhrase(wordIndex: number, runId: number) {
  const tokens = listeningTokens.value;

  if (tokens.length === 0 || runId !== activeSpeechRunId.value || !isSpeechSynthesisAvailable()) {
    return;
  }

  const phrase = createListeningPhrase(wordIndex, tokens);
  const token = tokens[phrase.startIndex];

  if (!token) {
    finishListeningPlayback(runId);
    return;
  }

  activeWordIndex.value = phrase.startIndex;
  activeWordEndIndex.value = phrase.endIndex;
  await speakWithPreferredVoice(phrase.text, {
    onEnd: () => {
      if (runId !== activeSpeechRunId.value) {
        return;
      }

      const nextWordIndex = phrase.endIndex + 1;

      if (nextWordIndex >= 0 && nextWordIndex < tokens.length && !isListeningPaused.value) {
        window.setTimeout(() => void speakListeningPhrase(nextWordIndex, runId), getPhrasePauseMs(phrase));
        return;
      }

      if (isListeningPaused.value) {
        activeWordIndex.value = nextWordIndex < tokens.length ? nextWordIndex : phrase.startIndex;
        activeWordEndIndex.value = activeWordIndex.value;
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
    window.setTimeout(() => void speakListeningPhrase(0, runId), 220);
    return;
  }

  isListeningSpeaking.value = false;
  isListeningPaused.value = false;
}

function stopListeningAudio(saveProgress = true) {
  if (saveProgress) {
    saveListeningPlaybackProgress();
  }

  activeSpeechRunId.value += 1;

  stopSpeech();

  isListeningSpeaking.value = false;
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

async function returnToLessonChoice() {
  answer.value = '';
  stopListeningAudio();
  setBackTransition();
  await appStore.returnToLessonChoice();
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

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    stopListeningAudio();
  }
}

function handlePageExit() {
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

function getListeningSentenceAtWord(wordIndex: number, tokens: ListeningToken[]): string {
  if (tokens.length === 0) {
    return '';
  }

  const safeWordIndex = clampIndex(wordIndex, 0, tokens.length - 1);
  let startIndex = safeWordIndex;
  let endIndex = safeWordIndex;

  while (startIndex > 0 && !endsSentence(tokens[startIndex - 1])) {
    startIndex -= 1;
  }

  while (endIndex < tokens.length - 1 && !endsSentence(tokens[endIndex])) {
    endIndex += 1;
  }

  return tokens
    .slice(startIndex, endIndex + 1)
    .map((token) => `${token.word}${token.trailing}`)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function translateListeningSentence(sentence: string): string {
  const normalizedSentence = normalizeListeningSentence(sentence);
  const translation = listeningSentenceTranslations[normalizedSentence];

  return translation ?? sentence;
}

function createLevelTrend(studentModel: StudentModel) {
  const learningState = studentModel.conceptLevels.learning;
  const decision = studentModel.teacherDecision.levelDecision;
  const practicedAt = learningState.lastPracticedAt ?? studentModel.teacherDecision.createdAt;
  const daysInProcess = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(practicedAt)) / 86_400_000),
  );

  return {
    level: conceptLevelToCefr(learningState.level),
    icon:
      decision === 'increase'
        ? 'arrow_upward'
        : decision === 'decrease'
          ? 'arrow_downward'
          : 'arrow_forward',
    daysLabel: `${daysInProcess}d`,
    tooltip: `${studentModel.teacherDecision.reason} Days in this level process: ${daysInProcess}.`,
  };
}

function conceptLevelToCefr(level: ConceptLevel): string {
  switch (level) {
    case 'foundation':
      return 'A1';
    case 'developing':
      return 'A2';
    case 'confident':
      return 'B1';
  }
}

function normalizeListeningSentence(sentence: string): string {
  return sentence.replace(/\s+/g, ' ').trim().toLowerCase();
}

function clampIndex(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createListeningPhrase(
  wordIndex: number,
  tokens: ListeningToken[],
): { startIndex: number; endIndex: number; text: string } {
  const startIndex = clampIndex(wordIndex, 0, Math.max(tokens.length - 1, 0));
  let endIndex = startIndex;

  while (endIndex < tokens.length - 1 && !endsSentence(tokens[endIndex])) {
    endIndex += 1;
  }

  const phraseText = tokens
    .slice(startIndex, endIndex + 1)
    .map((token) => `${token.word}${token.trailing}`)
    .join('')
    .trim();

  return {
    startIndex,
    endIndex,
    text: phraseText,
  };
}

function endsSentence(token: ListeningToken): boolean {
  return /\n/.test(token.trailing) || /[.!?]["')\]]*$/.test(token.word);
}

function getPhrasePauseMs(phrase: { endIndex: number }): number {
  const token = listeningTokens.value[phrase.endIndex];

  if (!token) {
    return 0;
  }

  if (/\n/.test(token.trailing)) {
    return 320;
  }

  if (/[.!?]["')\]]*$/.test(token.word)) {
    return 180;
  }

  return 120;
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
