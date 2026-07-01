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
        <q-badge
          class="network-status-badge"
          :color="appStore.isOnline ? 'teal-8' : 'negative'"
        >
          {{ appStore.isOnline ? 'Online' : 'Offline' }}
        </q-badge>
        <span>Model v{{ appStore.studentModel.version }}</span>
      </div>

      <transition
        :name="learningTransitionName"
      >
        <section
          v-if="!appStore.isHydrated"
          key="hydrating"
          class="learning-start"
        >
          <p class="learning-start__eyebrow">
            Loading
          </p>
          <h1>Restoring your lesson</h1>
        </section>

        <section
          v-else-if="!appStore.session"
          key="choice"
          class="learning-start"
        >
          <div
            v-if="remoteContinueOptions.length > 0"
            class="handoff-actions"
          >
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

          <p class="learning-start__eyebrow">
            Activity check
          </p>
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

          <div class="training-mode-strip">
            <q-btn
              v-for="mode in primaryTrainingModes"
              :key="mode.key"
              class="training-mode-button"
              color="primary"
              outline
              no-caps
              :icon="mode.icon"
              :label="mode.label"
              @click="startTraining(mode.key)"
            >
              <q-tooltip>{{ mode.reason }}</q-tooltip>
            </q-btn>
          </div>

          <div class="concept-choice">
            <q-btn
              v-for="concept in conceptChoices"
              :key="concept.value"
              color="primary"
              outline
              no-caps
              :icon="concept.icon"
              :label="concept.label"
              @click="startConcept(concept.value)"
            >
              <q-tooltip>{{ concept.reason }}</q-tooltip>
            </q-btn>
          </div>

          <div class="lesson-library">
            <section
              v-for="section in lessonSections"
              :key="section.concept"
              class="lesson-library__section"
            >
              <div class="lesson-library__heading">
                <q-icon
                  :name="section.icon"
                  size="20px"
                />
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
                  <span>{{ lesson.title }}</span>
                  <strong>{{ lesson.focus }}</strong>
                </button>
              </div>
            </section>
          </div>
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

          <transition
            :name="exerciseTransitionName"
          >
            <div
              v-if="!isListeningPlayer"
              :key="currentExercise.id"
              class="exercise-standard"
            >
              <div>
                <p class="lesson-stage__eyebrow">
                  {{ appStore.session.lesson.title }}
                </p>
                <h1>{{ currentExercise.prompt }}</h1>
                <p>{{ currentExercise.microLesson }}</p>
              </div>

              <div
                v-if="currentExercise.audioText"
                class="audio-row"
              >
                <q-btn
                  color="primary"
                  flat
                  icon="volume_up"
                  round
                  @click="playAudio"
                >
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

            <div
              v-else
              :key="currentExercise.id"
              class="listening-player"
            >
              <div class="listening-player__header">
                <div>
                  <p class="lesson-stage__eyebrow">
                    {{ appStore.session.lesson.title }}
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
                  <q-tooltip>{{ isListeningPlaylistVisible ? 'Hide text list' : 'Show text list' }}</q-tooltip>
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
                      { 'listening-player__playlist-item--active': item.id === selectedListeningItem?.id },
                    ]"
                    type="button"
                    @click="selectListeningItem(item.id)"
                  >
                    <span>{{ item.title }}</span>
                  </button>
                </aside>

                <div
                  ref="listeningTextElement"
                  class="listening-player__text"
                  @scroll="handleListeningTextScroll"
                >
                  <span
                    v-for="token in listeningTokens"
                    :key="token.index"
                    :data-token-index="token.index"
                    :class="[
                      'listening-player__token',
                      {
                        'listening-player__token--active': token.index >= activeWordIndex && token.index <= activeWordEndIndex,
                        'listening-player__token--past': token.index < activeWordIndex,
                      },
                    ]"
                  >{{ token.word }}{{ token.trailing }}</span>
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
                  :icon="isListeningPaused ? 'play_arrow' : isListeningSpeaking ? 'pause' : 'play_arrow'"
                  round
                  @click="toggleListeningPlayback"
                >
                  <q-tooltip>{{ isListeningPaused ? 'Resume' : isListeningSpeaking ? 'Pause' : 'Play' }}</q-tooltip>
                </q-btn>
                <q-btn
                  :color="isListeningRepeatEnabled ? 'secondary' : 'primary'"
                  :flat="!isListeningRepeatEnabled"
                  :unelevated="isListeningRepeatEnabled"
                  icon="repeat"
                  round
                  @click="toggleListeningRepeat"
                >
                  <q-tooltip>{{ isListeningRepeatEnabled ? 'Repeat is on' : 'Repeat selected text' }}</q-tooltip>
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
                  color="primary"
                  flat
                  icon="skip_previous"
                  round
                  @click="jumpWord(-1)"
                >
                  <q-tooltip>Previous word</q-tooltip>
                </q-btn>
                <q-btn
                  color="primary"
                  flat
                  icon="skip_next"
                  round
                  @click="jumpWord(1)"
                >
                  <q-tooltip>Next word</q-tooltip>
                </q-btn>
                <span>{{ listeningProgressLabel }}</span>
              </div>
            </div>
          </transition>
        </section>

        <section
          v-else
          key="complete"
          class="lesson-complete"
        >
          <p class="lesson-complete__eyebrow">
            Lesson complete
          </p>
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
  </q-page>
</template>

<script setup lang="ts">
import type { LearningConcept, LearningMode } from '@mentor-ai/shared';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  chooseRecommendedTraining,
  createCurrentActivitySuggestion,
  createLearningContext,
  findTrainingMode,
  formatActivityMeta,
  formatPaceLabel,
  primaryTrainingModes,
  type TrainingKey,
} from 'src/services/learning-context';
import { createPreferredSpeechUtterance, speakWithPreferredVoice, waitForSpeechVoices } from 'src/services/speech-synthesis';
import { readListeningProgressPreference, saveListeningProgressPreference } from 'src/services/user-preferences';
import { useAppStore } from 'src/stores/app-store';

type LessonChoice = {
  templateKey: string;
  title: string;
  focus: string;
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

const appStore = useAppStore();
const answer = ref('');
const activeWordIndex = ref(0);
const activeWordEndIndex = ref(0);
const isListeningSpeaking = ref(false);
const isListeningPaused = ref(false);
const isListeningRepeatEnabled = ref(false);
const isListeningPlaylistVisible = ref(false);
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
const listeningPlaylist = computed<ListeningPlaylistItem[]>(() => {
  const lesson = appStore.session?.lesson;

  if (!lesson) {
    return [];
  }

  return lesson.exercises
    .map((exercise, index) => {
      const text = (exercise.audioText ?? (exercise.type === 'listening-text' ? exercise.prompt : '')).trim();

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
const listeningText = computed(() => selectedListeningItem.value?.text ?? currentExercise.value?.audioText ?? currentExercise.value?.prompt ?? '');
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
const listeningTitle = computed(() =>
  currentExercise.value?.type === 'listening-text' ? 'Listen and read' : currentExercise.value?.prompt ?? 'Listen',
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
const inputLabel = computed(() => (currentExercise.value?.type === 'repeat-speaking' ? 'What did you say?' : 'Your answer'));
const syncLabel = computed(() => (appStore.pendingSyncCount > 0 ? `${appStore.pendingSyncCount} pending` : 'Offline ready'));
const syncColor = computed(() => {
  if (appStore.pendingSyncCount > 0) {
    return appStore.isOnline ? 'amber-8' : 'deep-orange-7';
  }

  return appStore.isOnline ? 'teal-8' : 'grey-7';
});
const currentSuggestion = computed(() =>
  createCurrentActivitySuggestion(appStore.preferredWorkShift, appStore.activitySnapshots),
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
const conceptChoices: Array<{ value: LearningConcept; label: string; icon: string; reason: string }> = [
  {
    value: 'learning',
    label: 'Learning',
    icon: 'school',
    reason: 'Grammar, listening, speaking, correction, and review together.',
  },
  {
    value: 'reading',
    label: 'Reading',
    icon: 'menu_book',
    reason: 'A short text with comprehension and unknown-word evidence.',
  },
  {
    value: 'vocabulary',
    label: 'Vocabulary Growth',
    icon: 'psychology',
    reason: 'Recall, recognition, and words in context.',
  },
];
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
    ],
  },
];
const recommendedTraining = computed(() => {
  const key = chooseRecommendedTraining(currentSuggestion.value, appStore.studentModel);
  const training = findTrainingMode(key);

  return {
    ...training,
    label: `Start ${training.shortLabel}`,
    reason: `${training.reason} ${currentSuggestion.value.reason}`,
  };
});
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
    if (isListeningPlayer.value) {
      selectedListeningItemId.value = currentExercise.value?.id ?? listeningPlaylist.value[0]?.id ?? null;
      restoreListeningPlayback();
      return;
    }

    resetListeningPlayback();
  },
);

watch(isListeningPlayer, (isActiveListeningPlayer) => {
  if (isActiveListeningPlayer) {
    selectedListeningItemId.value = currentExercise.value?.id ?? listeningPlaylist.value[0]?.id ?? null;
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
  await appStore.startLesson(createLearningContext(currentSuggestion.value, {
    selectedConcept: concept,
    manualConceptChoice: true,
  }));
}

async function startLessonChoice(concept: LearningConcept, lessonTemplateKey: string) {
  answer.value = '';
  setForwardTransition();
  await appStore.startLesson(createLearningContext(currentSuggestion.value, {
    selectedConcept: concept,
    manualConceptChoice: true,
    lessonTemplateKey,
  }));
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

async function playAudio() {
  const text = currentExercise.value?.audioText;

  if (text && 'speechSynthesis' in window) {
    speakWithPreferredVoice(text);
  }

  await appStore.replayAudio();
}

async function toggleListeningPlayback() {
  if (!('speechSynthesis' in window)) {
    return;
  }

  if (isListeningSpeaking.value && !isListeningPaused.value) {
    window.speechSynthesis.pause();
    isListeningPaused.value = true;
    return;
  }

  if (isListeningSpeaking.value && isListeningPaused.value) {
    isListeningPaused.value = false;

    if (window.speechSynthesis.paused || window.speechSynthesis.speaking) {
      window.speechSynthesis.resume();
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

  const currentSentenceIndex = Math.max(0, findLastNumberIndex(sentenceStarts, activeWordIndex.value));
  const nextSentenceIndex = clampIndex(currentSentenceIndex + direction, 0, sentenceStarts.length - 1);

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

function toggleListeningPlaylist() {
  isListeningPlaylistVisible.value = !isListeningPlaylistVisible.value;
}

async function startListeningAtWord(wordIndex: number) {
  const tokens = listeningTokens.value;

  if (tokens.length === 0 || !('speechSynthesis' in window)) {
    return;
  }

  await waitForSpeechVoices();
  const safeWordIndex = clampIndex(wordIndex, 0, tokens.length - 1);
  const runId = activeSpeechRunId.value + 1;

  activeSpeechRunId.value = runId;
  activeWordIndex.value = safeWordIndex;
  activeWordEndIndex.value = safeWordIndex;
  isListeningSpeaking.value = true;
  isListeningPaused.value = false;
  window.speechSynthesis.cancel();
  speakListeningPhrase(safeWordIndex, runId);
  await appStore.replayAudio();
}

function speakListeningPhrase(wordIndex: number, runId: number) {
  const tokens = listeningTokens.value;

  if (tokens.length === 0 || runId !== activeSpeechRunId.value || !('speechSynthesis' in window)) {
    return;
  }

  const phrase = createListeningPhrase(wordIndex, tokens);
  const token = tokens[phrase.startIndex];

  if (!token) {
    finishListeningPlayback(runId);
    return;
  }

  const utterance = createPreferredSpeechUtterance(phrase.text);

  activeWordIndex.value = phrase.startIndex;
  activeWordEndIndex.value = phrase.endIndex;
  utterance.onend = () => {
    if (runId !== activeSpeechRunId.value) {
      return;
    }

    const nextWordIndex = phrase.endIndex + 1;

    if (nextWordIndex >= 0 && nextWordIndex < tokens.length && !isListeningPaused.value) {
      window.setTimeout(() => speakListeningPhrase(nextWordIndex, runId), getPhrasePauseMs(phrase));
      return;
    }

    if (isListeningPaused.value) {
      activeWordIndex.value = nextWordIndex < tokens.length ? nextWordIndex : phrase.startIndex;
      activeWordEndIndex.value = activeWordIndex.value;
      return;
    }

    finishListeningPlayback(runId, false);
  };
  utterance.onerror = () => {
    if (runId !== activeSpeechRunId.value) {
      return;
    }

    finishListeningPlayback(runId);
  };

  window.speechSynthesis.speak(utterance);
}

function finishListeningPlayback(runId: number, allowRepeat = true) {
  if (runId !== activeSpeechRunId.value) {
    return;
  }

  if (allowRepeat && isListeningRepeatEnabled.value && listeningTokens.value.length > 0 && 'speechSynthesis' in window) {
    activeWordIndex.value = 0;
    activeWordEndIndex.value = 0;
    window.setTimeout(() => speakListeningPhrase(0, runId), 220);
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

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  isListeningSpeaking.value = false;
  isListeningPaused.value = false;
}

function resetListeningPlayback() {
  stopListeningAudio();
  activeWordIndex.value = 0;
  activeWordEndIndex.value = 0;
  resetListeningAutoScroll();
}

function restoreListeningPlayback() {
  stopListeningAudio(false);
  resetListeningAutoScroll();

  const progressKey = listeningProgressKey.value;
  const maxIndex = Math.max(listeningTokens.value.length - 1, 0);
  const savedWordIndex = progressKey ? readListeningProgressPreference(progressKey)?.wordIndex : undefined;
  const safeWordIndex = clampIndex(savedWordIndex ?? 0, 0, maxIndex);

  activeWordIndex.value = safeWordIndex;
  activeWordEndIndex.value = safeWordIndex;
}

function saveListeningPlaybackProgress() {
  const progressKey = listeningProgressKey.value;

  if (!progressKey || listeningTokens.value.length === 0) {
    return;
  }

  saveListeningProgressPreference(progressKey, clampIndex(activeWordIndex.value, 0, listeningTokens.value.length - 1));
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

  const activeToken = container.querySelector<HTMLElement>(`[data-token-index="${activeWordIndex.value}"]`);

  if (!activeToken) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const tokenRect = activeToken.getBoundingClientRect();
  const tokenTop = tokenRect.top - containerRect.top;
  const tokenBottom = tokenRect.bottom - containerRect.top;
  const comfortTop = container.clientHeight * 0.22;
  const comfortBottom = container.clientHeight * 0.58;

  if (tokenTop >= comfortTop && tokenBottom <= comfortBottom) {
    return;
  }

  const targetScrollTop = clampIndex(
    Math.round(container.scrollTop + tokenTop - container.clientHeight * 0.36),
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

function clampIndex(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createListeningPhrase(wordIndex: number, tokens: ListeningToken[]): { startIndex: number; endIndex: number; text: string } {
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
</script>
