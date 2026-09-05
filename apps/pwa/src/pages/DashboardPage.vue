<template>
  <q-page class="learning-page" :class="`category-theme--${selectedLessonLibrary}`">
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
          <section class="home-overview" aria-label="Learning progress">
            <article class="level-card">
              <div class="level-card__copy">
                <span>Your level</span>
                <strong>{{ levelProgress.currentLevel }} → {{ levelProgress.nextLevel }}</strong>
                <small>{{ levelProgress.progressPercent }}% · {{ levelProgress.paceLabel }}</small>
              </div>
              <q-circular-progress
                :value="levelProgress.progressPercent"
                size="82px"
                :thickness="0.13"
                color="primary"
                track-color="grey-3"
                show-value
              >{{ levelProgress.progressPercent }}%</q-circular-progress>
            </article>
            <div class="home-metrics">
              <article v-for="metric in homeMetrics" :key="metric.label" class="home-metric">
                <q-icon :name="metric.icon" size="22px" />
                <strong>{{ metric.value }}</strong>
                <span>{{ metric.label }}</span>
              </article>
            </div>
            <article class="focus-card">
              <q-icon name="track_changes" size="24px" />
              <div>
                <strong>Focus next: {{ weakestSkill.label }}</strong>
                <span>{{ weakestSkill.reason }}</span>
              </div>
            </article>
          </section>

          <article class="priority-link">
            <button type="button" class="priority-link__main" @click="startRecommendedHomeLesson">
              <q-icon :name="recommendedHomeLesson.mode === 'listening' ? 'headphones' : 'record_voice_over'" size="26px" />
              <span>
                <small>{{ recommendedPausedLesson ? 'Continue · ' + lessonSessionProgress(recommendedPausedLesson) + '%' : (isRecommendedLessonPinned ? 'Pinned lesson' : 'Do this first') + ' · ' + recommendedHomeLesson.minutes + ' min' }}</small>
                <strong>{{ recommendedHomeLesson.title }}</strong>
              </span>
              <q-icon name="arrow_forward" size="24px" />
            </button>
            <div class="priority-link__actions">
              <q-btn
                v-if="recommendedPausedLesson && wasLessonCompleted(recommendedPausedLesson)"
                color="primary"
                dense
                flat
                icon="done_all"
                label="Finish"
                no-caps
                @click="finishRepeatedLesson(recommendedPausedLesson.id)"
              />
              <q-btn dense flat no-caps color="primary" :icon="isRecommendedLessonPinned ? 'bookmark_remove' : 'push_pin'" :label="isRecommendedLessonPinned ? 'Unpin' : 'Pin'" @click="toggleRecommendedLessonPin" />
              <q-btn v-if="!isRecommendedLessonPinned" dense flat no-caps color="primary" icon="swap_horiz" label="Another" @click="suggestNextHomeLesson" />
            </div>
          </article>

          <article
            v-for="pausedLesson in inProgressLessons"
            :key="pausedLesson.id"
            class="priority-link priority-link--resume"
          >
            <button type="button" class="priority-link__main" @click="resumePausedLesson(pausedLesson.id)">
              <q-icon name="history" size="26px" />
              <span>
                <small>Continue where you stopped · {{ lessonSessionProgress(pausedLesson) }}%</small>
                <strong>{{ pausedLesson.lesson.title }}</strong>
              </span>
              <q-icon name="arrow_forward" size="24px" />
            </button>
            <div v-if="wasLessonCompleted(pausedLesson)" class="priority-link__actions">
              <q-btn
                color="primary"
                dense
                flat
                icon="done_all"
                label="Finish"
                no-caps
                @click="finishRepeatedLesson(pausedLesson.id)"
              />
            </div>
          </article>
          </template>

          <section v-else class="training-library">
            <div class="training-library__heading">
              <div>
                <p class="learning-start__eyebrow">{{ activeTrainingLibrary.label }}</p>
                <h1>{{ activeTrainingLibrary.title }}</h1>
              </div>
              <q-icon :name="activeTrainingLibrary.icon" size="42px" color="primary" />
            </div>

            <div class="training-library__list">
              <article
                v-for="lesson in activeTrainingLibrary.lessons"
                :key="lesson.templateKey"
                class="training-library-card"
                :class="`training-library-card--${lessonProgressState(lesson.templateKey)}`"
              >
                <button type="button" class="training-library-card__body" @click="startLibraryLesson(lesson)">
                  <span class="training-library-card__topline">
                    <span class="training-library-card__title">{{ lesson.title }}</span>
                    <span class="training-library-card__status">
                      <q-icon :name="lessonProgressIcon(lesson.templateKey)" />
                      {{ lessonProgressLabel(lesson.templateKey) }}
                    </span>
                  </span>
                  <strong v-if="lessonProgressState(lesson.templateKey) !== 'completed'">{{ lesson.focus }}</strong>
                  <span>{{ lesson.minutes }} min</span>
                </button>
                <ContentMentorFeedback category="lesson" :content-id="lesson.templateKey" hide-select-after-feedback />
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
              class="app-back-button"
              color="primary"
              flat
              icon="arrow_back"
              round
              :aria-label="lessonBackLabel"
              @click="handleLessonBack"
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
              :value="displayedTimeProgressRatio"
              color="primary"
              track-color="grey-4"
              rounded
              size="8px"
            />
          </div>

          <ContentMentorFeedback
            v-if="currentLessonFeedbackContentId"
            class="lesson-stage__feedback"
            category="lesson"
            :content-id="currentLessonFeedbackContentId"
          />

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

              <div v-if="currentExercise.audioText" class="dialogue-drill__native">
                <span>Native answer</span>
                <strong>
                  <template v-for="(segment, index) in dialogueExpectedSegments" :key="`${index}:${segment.text}`">
                    <mark v-if="segment.matched" class="dialogue-drill__matched-word">{{ segment.text }}</mark>
                    <template v-else>{{ segment.text }}</template>
                  </template>
                </strong>
              </div>

              <div
                :class="[
                  'dialogue-drill__recorder',
                  {
                    'dialogue-drill__recorder--active': isRecognizingSpeech,
                    'dialogue-drill__recorder--captured': dialogueAnswerStatus === 'correct',
                    'dialogue-drill__recorder--error': speechRecognitionError || dialogueAnswerStatus === 'incorrect',
                  },
                ]"
                role="status"
                aria-live="polite"
              >
                <q-btn
                  class="dialogue-drill__record-button"
                  :color="isRecognizingSpeech ? 'negative' : 'primary'"
                  :icon="isRecognizingSpeech ? 'stop_circle' : 'mic'"
                  :label="isRecognizingSpeech ? 'Stop' : speechRecognitionCaptured ? 'Again' : 'Record'"
                  unelevated
                  no-caps
                  :disable="!speechRecognitionAvailable"
                  @click="recordDialogueAnswer"
                />
                <q-btn class="dialogue-drill__play-button" color="primary" flat icon="volume_up" round @click="playAudio">
                  <q-tooltip>Play native answer</q-tooltip>
                </q-btn>
                <span class="dialogue-drill__recorder-status">
                  <q-icon :name="speechStatusIcon" size="20px" />
                  <span>
                    <strong>{{ speechStatusTitle }}</strong>
                    <small>{{ speechSupportMessage }}</small>
                  </span>
                </span>
                <div class="dialogue-drill__step-navigation">
                  <q-btn
                    v-if="exerciseNavigation.showPrevious"
                    color="primary"
                    flat
                    icon="arrow_back"
                    label="Previous"
                    no-caps
                    :disable="exerciseNavigation.previousDisabled"
                    @click="handleLessonBack"
                  />
                  <q-btn
                    class="dialogue-drill__continue"
                    color="primary"
                    :label="exerciseNavigation.nextLabel"
                    unelevated
                    :disable="exerciseNavigation.nextDisabled"
                    @click="submit"
                  />
                </div>
              </div>

              <q-input
                v-model="answer"
                :class="`dialogue-answer-field dialogue-answer--${dialogueAnswerStatus}`"
                :color="dialogueAnswerStatus === 'correct' ? 'positive' : undefined"
                :error="dialogueAnswerStatus === 'incorrect'"
                hide-bottom-space
                label="Recognized answer"
                outlined
                readonly
                tabindex="-1"
              >
                <template v-if="dialogueAnswerStatus !== 'idle'" #append>
                  <q-icon
                    :color="dialogueAnswerStatus === 'correct' ? 'positive' : 'negative'"
                    :name="dialogueAnswerStatus === 'correct' ? 'check_circle' : 'cancel'"
                  />
                </template>
              </q-input>

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
                  v-if="exerciseNavigation.showPrevious"
                  color="primary"
                  flat
                  icon="arrow_back"
                  label="Previous"
                  no-caps
                  :disable="exerciseNavigation.previousDisabled"
                  @click="handleLessonBack"
                />
                <q-btn
                  color="primary"
                  :label="exerciseNavigation.nextLabel"
                  unelevated
                  :disable="exerciseNavigation.nextDisabled"
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
                  <div class="listening-player__step-navigation">
                    <q-btn
                      v-if="exerciseNavigation.showPrevious"
                      color="primary"
                      flat
                      icon="arrow_back"
                      label="Previous"
                      no-caps
                      :disable="exerciseNavigation.previousDisabled"
                      @click="handleLessonBack"
                    />
                    <q-btn
                      color="primary"
                      :label="exerciseNavigation.nextLabel"
                      no-caps
                      unelevated
                      @click="completeListeningExercise"
                    />
                  </div>
                  <q-btn
                    v-if="!isRepeatedLesson"
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
                  color="blue-7"
                  class="app-play-button listening-player__play-button"
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
                <AudioPlaybackSpeedMenu
                  :model-value="listeningPlaybackRate"
                  :persistence-key="listeningProgressKey ? `listening:${listeningProgressKey}` : null"
                  @update:model-value="setListeningPlaybackRate"
                />
              </div>
            </div>
          </transition>
        </section>

        <section v-else key="complete" class="lesson-complete">
          <p class="lesson-complete__eyebrow">Lesson complete</p>
          <h1>Great job! You completed the lesson.</h1>
          <p>Your progress is saved. You can choose the next lesson now.</p>
          <q-btn
            color="primary"
            icon="check_circle"
            label="OK"
            no-caps
            unelevated
            @click="finishLessonAndReturnHome"
          />
        </section>
      </transition>
    </section>

    <q-dialog v-model="showLessonUpdateDialog" persistent>
      <q-card class="lesson-update-dialog">
        <q-card-section>
          <div class="text-h6">Lesson update available</div>
          <p class="q-mb-none q-mt-sm">
            {{ pendingLessonUpdate?.choice.title }} has newer text and audio. Update it before playback so the lesson and voice track match.
          </p>
        </q-card-section>
        <q-card-section v-if="lessonUpdateError" class="text-negative">
          {{ lessonUpdateError }}
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            color="primary"
            icon="system_update_alt"
            label="Update lesson"
            no-caps
            unelevated
            :loading="isLessonUpdateInstalling"
            @click="installPendingLessonUpdate"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import type { LearningActivityTotals, LearningContext, LearningMode, PreferredLessonDevice } from '@mentor-ai/shared';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { synchronizeDashboardLessonRoute } from 'src/services/navigation-category';
import {
  chooseRecommendedTraining,
  createCurrentActivitySuggestion,
  createLearningContext,
} from 'src/services/learning-context';
import {
  calculateLessonProgressRatio,
  calculatePlaybackProgress,
  calculateRemainingSeconds,
  estimateAudioTotalSeconds,
  formatRemainingClockTime,
} from 'src/services/lesson-time-progress';
import {
  hasActiveSpeechPlayback,
  isSpeechBatchCached,
  isSpeechSynthesisAvailable,
  pauseSpeech,
  preloadSpeechBatch,
  preserveDialogueSpeakerLabels,
  resumeSpeech,
  setActiveSpeechPlaybackRate,
  setActiveSpeechRepeat,
  speakWithPreferredVoice,
  stopSpeech,
} from 'src/services/speech-synthesis';
import AudioPlaybackSpeedMenu from 'src/components/AudioPlaybackSpeedMenu.vue';
import {
  type ContinuousSpeechRecognition,
  isSpeechRecognitionAvailable,
  recognizeSpeechOnce,
  startContinuousSpeechRecognition,
  stopSpeechRecognition,
} from 'src/services/speech-recognition';
import {
  prepareLocalSpeechTranscriber,
  startLocalReadingTranscriber,
  type LocalReadingTranscriber,
} from 'src/services/local-reading-transcriber';
import {
  chooseBestDialogueTranscript,
  getDialogueExpectedSegments,
  isConfidentDialogueAnswer,
} from 'src/services/dialogue-speech';
import {
  readListeningProgressPreference,
  saveListeningProgressPreference,
} from 'src/services/user-preferences';
import { useAppStore } from 'src/stores/app-store';
import {
  calculateLessonSessionProgress,
  canFinishRepeatedLesson,
  getLessonExerciseNavigation,
} from 'src/services/home-lesson-progress';
import {
  getSpeechTextsContentVersion,
  isOfflineSpeechLessonUpdateAvailable,
  markOfflineLessonOpened,
  readOfflineLessons,
  registerOfflineSpeechLesson,
  replaceOfflineSpeechLesson,
} from 'src/services/offline-library';
import { fetchCurrentLesson } from 'src/services/api-client';
import { loadLearningActivityTotals } from 'src/services/learning-activity';
import { calculateLevelJourney } from 'src/services/level-journey';
import ContentMentorFeedback from 'src/components/ContentMentorFeedback.vue';
import {
  loadContentEngagementSummaries,
  recordContentEngagement,
  syncContentEngagement,
  type ContentEngagementSummary,
} from 'src/services/content-engagement';

type LessonChoice = {
  templateKey: string;
  title: string;
  focus: string;
  preferredDevice?: PreferredLessonDevice;
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
type HomeLesson = TrainingLibraryLesson & { skillLabel: string };
type PendingLessonUpdate = {
  choice: TrainingLibraryLesson;
  context: LearningContext;
  speechTexts: string[];
};

const appStore = useAppStore();
const route = useRoute();
const router = useRouter();
const answer = ref('');
const activeWordIndex = ref(0);
const activeWordEndIndex = ref(0);
const activeExercisePlaybackProgress = ref(0);
const activeAudioTotalSeconds = ref(0);
const isListeningSpeaking = ref(false);
const isListeningStarting = ref(false);
const isListeningPaused = ref(false);
const isListeningRepeatEnabled = ref(false);
const isListeningTranslationVisible = ref(false);
const isListeningPlaylistVisible = ref(false);
const isLessonLibraryVisible = ref(false);
const pinnedHomeLessonKey = ref(readHomePreference('mentor-ai:home-pinned-lesson'));
const skippedHomeLessonKey = ref(readHomePreference('mentor-ai:home-skipped-lesson'));
const selectedLessonLibrary = ref<TrainingLibraryKey>('home');
const lessonReturnDestination = ref<LessonReturnDestination>('home');
const activeEngagementContentId = ref<string | null>(null);
const currentLessonFeedbackContentId = computed(() => (
  appStore.session?.lesson.lessonTemplateKey
  ?? activeEngagementContentId.value
  ?? appStore.session?.lesson.id
  ?? null
));
const lessonEngagementSummaries = ref(new Map<string, ContentEngagementSummary>());
const libraryDownloadStatus = ref<Record<string, 'idle' | 'checking' | 'downloading' | 'ready' | 'error'>>({});
const showLessonUpdateDialog = ref(false);
const isLessonUpdateInstalling = ref(false);
const lessonUpdateError = ref('');
const pendingLessonUpdate = ref<PendingLessonUpdate | null>(null);
const offlineAudioStatus = ref<'idle' | 'downloading' | 'ready' | 'error'>('idle');
const offlineAudioProgress = ref(0);
const isRecognizingSpeech = ref(false);
const speechRecognitionError = ref('');
const speechRecognitionProgress = ref('');
const dialogueAnswerStatus = ref<'idle' | 'correct' | 'incorrect'>('idle');
let dialogueRecognitionRunId = 0;
let dialogueSpeechStream: MediaStream | null = null;
let dialogueLocalTranscriber: LocalReadingTranscriber | null = null;
let dialogueLiveRecognition: ContinuousSpeechRecognition | null = null;
let dialogueSpeechAudioContext: AudioContext | null = null;
let dialogueSilenceTimer = 0;
let dialogueRecordingTimeout = 0;
const speechRecognitionCaptured = ref(false);
const selectedListeningItemId = ref<string | null>(null);
const activeSpeechRunId = ref(0);
const learningTransitionName = ref('learning-slide-forward');
const exerciseTransitionName = ref('exercise-slide-forward');
const listeningTextElement = ref<HTMLElement | null>(null);
const isListeningAutoScrollPaused = ref(false);
const listeningPlaybackRate = ref(1);
let listeningAutoScrollPauseTimer: number | undefined;
let isProgrammaticListeningScroll = false;
let programmaticListeningScrollUntil = 0;
let offlineAudioDownloadRunId = 0;
let measuredListeningDurationSeconds = 0;
let measuredListeningTokenCount = 0;
let measuredListeningSegments = new Set<number>();

const currentExercise = computed(() => appStore.currentExercise);
const lessonEstimatedMinutes = computed(() =>
  Math.max(1, Math.round(appStore.session?.lesson.estimatedMinutes ?? 1)),
);
const currentExerciseProgress = computed(() => {
  if (isListeningPlayer.value && listeningTokens.value.length > 1) {
    return clampIndex(activeWordIndex.value, 0, listeningTokens.value.length - 1)
      / (listeningTokens.value.length - 1);
  }

  return activeExercisePlaybackProgress.value;
});
const lessonProgressRatio = computed(() => {
  const session = appStore.session;

  if (!session || session.lesson.exercises.length === 0) {
    return 0;
  }

  if (session.completedAt) {
    return 1;
  }

  return calculateLessonProgressRatio(
    session.currentExerciseIndex,
    currentExerciseProgress.value,
    session.lesson.exercises.length,
    Boolean(session.completedAt),
  );
});
const displayedLessonProgress = computed(() => Math.round(lessonProgressRatio.value * 100));
const hasCurrentExerciseAudio = computed(() => Boolean(currentExercise.value?.audioText?.trim()));
const estimatedCurrentAudioSeconds = computed(() => {
  const wordCount = isListeningPlayer.value
    ? listeningTokens.value.length
    : currentExercise.value?.audioText?.trim().split(/\s+/).filter(Boolean).length ?? 0;

  return estimateAudioTotalSeconds(wordCount);
});
const displayedTimeProgressRatio = computed(() =>
  hasCurrentExerciseAudio.value ? currentExerciseProgress.value : lessonProgressRatio.value,
);
const displayedTotalSeconds = computed(() =>
  hasCurrentExerciseAudio.value
    ? activeAudioTotalSeconds.value || estimatedCurrentAudioSeconds.value
    : lessonEstimatedMinutes.value * 60,
);
const lessonRemainingSeconds = computed(() => calculateRemainingSeconds(
  displayedTotalSeconds.value,
  displayedTimeProgressRatio.value,
));
const lessonTotalTimeLabel = computed(() => formatClockTime(displayedTotalSeconds.value));
const lessonRemainingTimeLabel = computed(() => formatRemainingClockTime(lessonRemainingSeconds.value));
const isListeningPlayer = computed(() => {
  if (!appStore.session || !currentExercise.value) {
    return false;
  }

  return currentExercise.value.type === 'listening-text';
});
const isDialogueTranslationExercise = computed(
  () => currentExercise.value?.type === 'dialogue-translation',
);
const dialogueExpectedSegments = computed(() => getDialogueExpectedSegments(
  speechRecognitionCaptured.value ? answer.value : '',
  currentExercise.value?.audioText ?? '',
));
const isRepeatedLesson = computed(() => canFinishRepeatedLesson(
  appStore.session?.lesson.lessonTemplateKey,
  lessonCompletionCounts.value,
));
const exerciseNavigation = computed(() => getLessonExerciseNavigation(
  isRepeatedLesson.value,
  appStore.session?.currentExerciseIndex ?? 0,
  isListeningPlayer.value
    || (isDialogueTranslationExercise.value
      ? dialogueAnswerStatus.value === 'correct'
      : answer.value.trim().length > 0),
));
const localSpeechRecognitionAvailable = computed(() => (
  typeof navigator !== 'undefined'
  && typeof navigator.mediaDevices?.getUserMedia === 'function'
  && typeof MediaRecorder !== 'undefined'
));
const speechRecognitionAvailable = computed(() => (
  localSpeechRecognitionAvailable.value || isSpeechRecognitionAvailable()
));
const speechSupportMessage = computed(() => {
  if (isRecognizingSpeech.value) {
    return speechRecognitionProgress.value || 'Speak now. Tap Stop recording when you finish.';
  }

  if (speechRecognitionError.value) {
    return speechRecognitionError.value;
  }

  if (speechRecognitionCaptured.value) {
    return dialogueAnswerStatus.value === 'correct'
      ? 'Your answer matches the native phrase.'
      : 'The recognized answer does not match yet. Tap Record again to retry.';
  }

  if (!speechRecognitionAvailable.value) {
    return 'Voice recognition is not available on this device.';
  }

  return 'Tap Record answer, speak, then tap Stop recording.';
});
const speechStatusTitle = computed(() => {
  if (isRecognizingSpeech.value) return 'Recording now';
  if (speechRecognitionError.value) return 'Recording failed';
  if (dialogueAnswerStatus.value === 'correct') return 'Correct answer';
  if (dialogueAnswerStatus.value === 'incorrect') return 'Try again';
  if (!speechRecognitionAvailable.value) return 'Voice recording unavailable';
  return 'Ready to record';
});
const speechStatusIcon = computed(() => {
  if (isRecognizingSpeech.value) return 'graphic_eq';
  if (speechRecognitionError.value) return 'error_outline';
  if (dialogueAnswerStatus.value === 'correct') return 'check_circle';
  if (dialogueAnswerStatus.value === 'incorrect') return 'cancel';
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
  () => preserveDialogueSpeakerLabels(
    selectedListeningItem.value?.text ??
      currentExercise.value?.audioText ??
      currentExercise.value?.prompt ??
      '',
  ),
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
const remoteContinueOptions = computed(() =>
  appStore.remoteSessionHandoffs.map((handoff) => ({
    id: handoff.id,
    label: `Continue from ${handoff.sourceDevice}`,
    detail: `${handoff.lesson.title} · ${Math.min(handoff.currentExerciseIndex + 1, handoff.lesson.exercises.length)}/${handoff.lesson.exercises.length}`,
  })),
);
const trainingLibraries: Record<'listening' | 'speaking', {
  label: string;
  title: string;
  icon: string;
  lessons: TrainingLibraryLesson[];
}> = {
  listening: {
    label: 'Listen',
    title: 'Listening lessons',
    icon: 'headphones',
    lessons: [
      { templateKey: 'commute-listening', title: 'Commute listening', focus: 'A complete listening session for the journey', mode: 'listening', minutes: 10 },
      { templateKey: 'shop-listening', title: 'At a small shop', focus: 'Follow a short dialogue and understand a real request', mode: 'listening', minutes: 7 },
    ],
  },
  speaking: {
    label: 'Speak',
    title: 'Speaking lessons',
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
const allHomeLessons = computed<HomeLesson[]>(() => [
  ...trainingLibraries.listening.lessons.map((lesson) => ({ ...lesson, skillLabel: 'Listening' })),
  ...trainingLibraries.speaking.lessons.map((lesson) => ({ ...lesson, skillLabel: 'Speaking' })),
]);
const lessonCompletionCounts = computed(() => {
  const counts = new Map<string, number>();
  for (const snapshot of appStore.statisticsSnapshots) {
    const key = snapshot.lessonTemplateKey;
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
});
type LessonProgressState = 'new' | 'started' | 'completed';
function lessonProgressState(templateKey: string): LessonProgressState {
  const summary = lessonEngagementSummaries.value.get(templateKey);
  if ((lessonCompletionCounts.value.get(templateKey) ?? 0) > 0 || (summary?.fullPlays ?? 0) > 0 || (summary?.finishes ?? 0) > 0) {
    return 'completed';
  }
  if ((summary?.starts ?? 0) > 0 || appStore.pausedSessions.some((session) => session.lesson.lessonTemplateKey === templateKey)) {
    return 'started';
  }
  return 'new';
}
function lessonProgressLabel(templateKey: string) {
  const state = lessonProgressState(templateKey);
  if (state === 'completed') return 'Completed';
  if (state === 'started') return 'In progress';
  return 'Not started';
}
function lessonProgressIcon(templateKey: string) {
  const state = lessonProgressState(templateKey);
  if (state === 'completed') return 'check_circle';
  if (state === 'started') return 'pending';
  return 'radio_button_unchecked';
}

async function refreshLessonProgressStates() {
  lessonEngagementSummaries.value = await loadContentEngagementSummaries('lesson');
}

function handleLessonEngagementChange() {
  void refreshLessonProgressStates();
}
const weakestSkill = computed(() => {
  const skills = [
    { key: 'listening', label: 'listening', value: appStore.studentModel.listening.score.value },
    { key: 'speaking', label: 'speaking', value: appStore.studentModel.speaking.score.value },
    { key: 'vocabulary', label: 'vocabulary', value: appStore.studentModel.vocabulary.score.value },
    { key: 'grammar', label: 'grammar', value: appStore.studentModel.grammar.score.value },
  ];
  const weakest = skills.sort((left, right) => left.value - right.value)[0] ?? skills[0]!;
  return {
    ...weakest,
    reason: `This is currently your lowest skill at ${Math.round(weakest.value * 100)}%.`,
  };
});
const homeLessonQueue = computed(() => {
  const priorityMode = chooseRecommendedTraining(currentSuggestion.value, appStore.studentModel) === 'listening'
    ? 'listening'
    : 'speaking';
  return [...allHomeLessons.value].sort((left, right) => {
    const leftSkipped = left.templateKey === skippedHomeLessonKey.value ? 1 : 0;
    const rightSkipped = right.templateKey === skippedHomeLessonKey.value ? 1 : 0;
    if (leftSkipped !== rightSkipped) return leftSkipped - rightSkipped;
    const leftMode = left.mode === priorityMode ? 0 : 1;
    const rightMode = right.mode === priorityMode ? 0 : 1;
    if (leftMode !== rightMode) return leftMode - rightMode;
    return (lessonCompletionCounts.value.get(left.templateKey) ?? 0)
      - (lessonCompletionCounts.value.get(right.templateKey) ?? 0);
  });
});
const recommendedHomeLesson = computed(() =>
  allHomeLessons.value.find((lesson) => lesson.templateKey === pinnedHomeLessonKey.value)
    ?? homeLessonQueue.value[0]!,
);
const recommendedPausedLesson = computed(() => appStore.pausedSessions.find(
  (session) => session.lesson.lessonTemplateKey === recommendedHomeLesson.value.templateKey,
));
const inProgressLessons = computed(() => [...appStore.pausedSessions]
  .filter((session) => session.id !== recommendedPausedLesson.value?.id)
  .sort((left, right) => right.startedAt.localeCompare(left.startedAt)));
function lessonSessionProgress(session: typeof appStore.pausedSessions[number]) {
  return calculateLessonSessionProgress(session.currentExerciseIndex, session.lesson.exercises.length);
}
function wasLessonCompleted(session: typeof appStore.pausedSessions[number]) {
  return canFinishRepeatedLesson(session.lesson.lessonTemplateKey, lessonCompletionCounts.value);
}
const isRecommendedLessonPinned = computed(() =>
  pinnedHomeLessonKey.value === recommendedHomeLesson.value.templateKey,
);
const levelActivity = ref<LearningActivityTotals>({ listeningSeconds: 0, readingSeconds: 0, speakingSeconds: 0, totalSeconds: 0, updatedAt: null });
const levelProgress = computed(() => calculateLevelJourney(appStore.studentModel, levelActivity.value, appStore.statisticsSnapshots));
const homeMetrics = computed(() => {
  const totals = appStore.statisticsSnapshots.reduce((summary, snapshot) => ({
    listeningSeconds: summary.listeningSeconds + (snapshot.listeningSeconds ?? 0),
    activeSeconds: summary.activeSeconds + (snapshot.activeSeconds ?? 0),
    spokenWords: summary.spokenWords + (snapshot.spokenWords ?? 0),
  }), { listeningSeconds: 0, activeSeconds: 0, spokenWords: 0 });
  const synchronizedListeningSeconds = Math.max(totals.listeningSeconds, levelActivity.value.listeningSeconds);
  const synchronizedActiveSeconds = Math.max(totals.activeSeconds, levelActivity.value.totalSeconds);
  return [
    { icon: 'headphones', value: formatHours(synchronizedListeningSeconds), label: 'listened' },
    { icon: 'record_voice_over', value: totals.spokenWords.toLocaleString(), label: 'words spoken' },
    { icon: 'timer', value: formatDuration(synchronizedActiveSeconds), label: 'active practice' },
    { icon: 'task_alt', value: String(appStore.completedLessonsCount), label: 'lessons done' },
  ];
});
const lessonBackLabel = computed(() => {
  if ((appStore.session?.currentExerciseIndex ?? 0) > 0) return 'Back to previous step';
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
async function openTrainingLibrary(library: 'listening' | 'speaking') {
  if (appStore.session) await returnToLessonChoice();
  selectedLessonLibrary.value = library;
  await refreshLibraryDownloadStatuses(trainingLibraries[library].lessons);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function startLibraryLesson(lesson: TrainingLibraryLesson) {
  const context = createLearningContext(currentSuggestion.value, {
    mode: lesson.mode,
    selectedConcept: 'learning',
    manualConceptChoice: true,
    lessonTemplateKey: lesson.templateKey,
  });
  if (navigator.onLine) {
    try {
      const freshLesson = await fetchCurrentLesson(context, true);
      const speechTexts = getLessonOfflineSpeechTexts(freshLesson.exercises);
      const saved = readOfflineLessons().find((item) => item.id === lesson.templateKey && item.category === lesson.mode);
      if (isOfflineSpeechLessonUpdateAvailable(saved, speechTexts)) {
        pendingLessonUpdate.value = { choice: lesson, context, speechTexts };
        lessonUpdateError.value = '';
        showLessonUpdateDialog.value = true;
        return;
      }
    } catch {
      // Opening the previously downloaded lesson remains possible if the update check is unavailable.
    }
  }
  await beginLibraryLesson(lesson, context);
}

async function beginLibraryLesson(lesson: TrainingLibraryLesson, context: LearningContext) {
  recordLessonStart(lesson.templateKey);
  markOfflineLessonOpened(lesson.templateKey, lesson.mode);
  lessonReturnDestination.value = selectedLessonLibrary.value;
  answer.value = '';
  setForwardTransition();
  await appStore.startLesson(context);
  await syncActiveLessonNavigation();
}

async function installPendingLessonUpdate() {
  const pending = pendingLessonUpdate.value;
  if (!pending || isLessonUpdateInstalling.value) return;
  isLessonUpdateInstalling.value = true;
  lessonUpdateError.value = '';
  try {
    const result = await preloadSpeechBatch(pending.speechTexts);
    if (result.failed > 0) throw new Error('The new audio could not be downloaded. Check the connection and try again.');
    await replaceOfflineSpeechLesson({
      id: pending.choice.templateKey,
      category: pending.choice.mode,
      title: pending.choice.title,
      speechTexts: pending.speechTexts,
    });
    libraryDownloadStatus.value[pending.choice.templateKey] = 'ready';
    showLessonUpdateDialog.value = false;
    pendingLessonUpdate.value = null;
    await beginLibraryLesson(pending.choice, pending.context);
  } catch (error) {
    lessonUpdateError.value = error instanceof Error ? error.message : 'The lesson could not be updated.';
  } finally {
    isLessonUpdateInstalling.value = false;
  }
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
  await refreshLessonProgressStates();
  await refreshLevelActivity();
  void syncContentEngagement()
    .then(refreshLessonProgressStates)
    .catch(() => undefined);

  if (!appStore.session && (route.query.training === 'listening' || route.query.training === 'speaking')) {
    await openTrainingLibrary(route.query.training);
  }

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('beforeunload', handlePageExit);
  window.addEventListener('pagehide', handlePageExit);
  window.addEventListener('mentor-ai:prepare-app-update', handlePrepareAppUpdate);
  window.addEventListener('mentor-content-engagement', handleLessonEngagementChange);
  window.addEventListener('mentor-learning-activity-updated', refreshLevelActivity);
});

onUnmounted(() => {
  stopListeningAudio();
  stopDialogueSpeechRecording();
  resetListeningAutoScroll();
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  window.removeEventListener('beforeunload', handlePageExit);
  window.removeEventListener('pagehide', handlePageExit);
  window.removeEventListener('mentor-ai:prepare-app-update', handlePrepareAppUpdate);
  window.removeEventListener('mentor-content-engagement', handleLessonEngagementChange);
  window.removeEventListener('mentor-learning-activity-updated', refreshLevelActivity);
});

async function refreshLevelActivity() { levelActivity.value = await loadLearningActivityTotals(); }

watch(
  () => route.query.training,
  (training) => {
    if (training === 'listening' || training === 'speaking') {
      if (appStore.session?.context.mode === training) {
        selectedLessonLibrary.value = training;
        return;
      }

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
  () => appStore.session?.completedAt,
  (completedAt) => {
    const contentId = activeEngagementContentId.value;
    if (!completedAt || !contentId) return;
    activeEngagementContentId.value = null;
    void recordContentEngagement({ studentId: appStore.studentId, category: 'lesson', contentId, type: 'finished' });
    void recordContentEngagement({ studentId: appStore.studentId, category: 'lesson', contentId, type: 'full-play' });
  },
);

watch(
  () => currentExercise.value?.id,
  () => {
    isListeningPlaylistVisible.value = false;
    void nextTick(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    answer.value = '';
    dialogueAnswerStatus.value = 'idle';
    dialogueRecognitionRunId += 1;
    speechRecognitionError.value = '';
    speechRecognitionCaptured.value = false;
    stopDialogueSpeechRecording();
    if (isListeningPlayer.value) {
      selectedListeningItemId.value =
        currentExercise.value?.id ?? listeningPlaylist.value[0]?.id ?? null;
      restoreListeningPlayback();
      return;
    }

    if (isDialogueTranslationExercise.value && localSpeechRecognitionAvailable.value) {
      prepareLocalSpeechTranscriber();
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

watch(currentExercise, () => {
  activeExercisePlaybackProgress.value = 0;
  resetActiveAudioTiming();
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
  await syncActiveLessonNavigation();
}

async function startHomeLesson(lesson: HomeLesson) {
  lessonReturnDestination.value = 'home';
  await startLibraryLesson(lesson);
}

async function startRecommendedHomeLesson() {
  if (recommendedPausedLesson.value) {
    await resumePausedLesson(recommendedPausedLesson.value.id);
    return;
  }
  await startHomeLesson(recommendedHomeLesson.value);
}

async function resumePausedLesson(sessionId: string) {
  setForwardTransition();
  await appStore.resumePausedLesson(sessionId);
  await syncActiveLessonNavigation();
}

async function finishRepeatedLesson(sessionId: string) {
  await appStore.dismissPausedLesson(sessionId);
}

function toggleRecommendedLessonPin() {
  pinnedHomeLessonKey.value = isRecommendedLessonPinned.value
    ? null
    : recommendedHomeLesson.value.templateKey;
  saveHomePreference('mentor-ai:home-pinned-lesson', pinnedHomeLessonKey.value);
}

function suggestNextHomeLesson() {
  skippedHomeLessonKey.value = recommendedHomeLesson.value.templateKey;
  saveHomePreference('mentor-ai:home-skipped-lesson', skippedHomeLessonKey.value);
}

function recordLessonStart(contentId: string) {
  activeEngagementContentId.value = contentId;
  void recordContentEngagement({
    studentId: appStore.studentId,
    category: 'lesson',
    contentId,
    type: 'started',
  });
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
  await syncActiveLessonNavigation();
}

async function syncActiveLessonNavigation() {
  const training = await synchronizeDashboardLessonRoute(
    appStore.session?.context.mode,
    route.query.training,
    async (nextTraining) => {
      await router.replace({
        name: 'dashboard',
        query: { ...route.query, training: nextTraining },
      });
    },
  );

  if (training) selectedLessonLibrary.value = training;
}

async function submit() {
  if (answer.value.trim().length === 0) {
    if (!isRepeatedLesson.value) return;
    answer.value = currentExercise.value?.expectedResponse?.trim() ?? 'completed';
  }

  const submittedAnswer = isDialogueTranslationExercise.value && dialogueAnswerStatus.value === 'correct'
    ? currentExercise.value?.expectedResponse?.trim() ?? answer.value
    : answer.value;
  setForwardTransition();
  await appStore.submitCurrentExercise(submittedAnswer);
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
    stopDialogueSpeechRecording();
    return;
  }

  speechRecognitionError.value = '';
  speechRecognitionCaptured.value = false;
  answer.value = '';
  dialogueAnswerStatus.value = 'idle';
  isRecognizingSpeech.value = true;
  speechRecognitionProgress.value = '';
  const recognitionRunId = ++dialogueRecognitionRunId;

  try {
    if (localSpeechRecognitionAvailable.value) {
      dialogueSpeechStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startDialogueLiveTranscript(recognitionRunId);
      dialogueLocalTranscriber = startLocalReadingTranscriber(dialogueSpeechStream, {
        onTranscript: (transcript) => {
          applyDialogueTranscript(transcript, recognitionRunId);
        },
        onReady: () => {
          if (dialogueSpeechStream) monitorDialogueSpeech(dialogueSpeechStream);
          speechRecognitionProgress.value = 'Speak now. Recording stops after a pause.';
        },
        onProgress: (message) => { speechRecognitionProgress.value = `${message}. Keep this screen open.`; },
        onError: (message) => {
          speechRecognitionError.value = message;
          stopDialogueSpeechRecording();
        },
        chunkDurationMs: 5_000,
      });
      speechRecognitionProgress.value = 'Preparing offline speech recognition…';
      return;
    }

    const result = await recognizeSpeechOnce('en-US', undefined, (transcript) => {
      if (recognitionRunId !== dialogueRecognitionRunId) return;
      answer.value = transcript;
    });
    applyDialogueTranscript(result.transcript, recognitionRunId);
  } catch (error) {
    speechRecognitionCaptured.value = false;
    speechRecognitionError.value =
      error instanceof Error
        ? error.message
        : 'Speech recognition failed. Tap Record answer to try again.';
  } finally {
    if (!dialogueLocalTranscriber) isRecognizingSpeech.value = false;
  }
}

function startDialogueLiveTranscript(recognitionRunId: number) {
  if (!isSpeechRecognitionAvailable()) return;
  const finalParts: string[] = [];
  dialogueLiveRecognition = startContinuousSpeechRecognition({
    lang: 'en-US',
    onInterim: (transcript) => {
      if (recognitionRunId !== dialogueRecognitionRunId) return;
      answer.value = [...finalParts, transcript].filter(Boolean).join(' ').trim();
    },
    onFinal: (transcript) => {
      if (recognitionRunId !== dialogueRecognitionRunId) return;
      finalParts.push(transcript);
      answer.value = finalParts.join(' ').trim();
    },
    onError: () => {
      // Browser recognition is only a low-latency preview. Local Whisper still
      // produces and validates the final answer when the network service fails.
      dialogueLiveRecognition?.stop();
      dialogueLiveRecognition = null;
    },
  });
}

function applyDialogueTranscript(transcript: string, recognitionRunId: number) {
  if (recognitionRunId !== dialogueRecognitionRunId || !transcript.trim()) return;
  const expected = currentExercise.value?.audioText ?? '';
  const bestTranscript = chooseBestDialogueTranscript(answer.value, transcript, expected);
  const matchesExpected = isConfidentDialogueAnswer(bestTranscript, expected);
  answer.value = bestTranscript;
  speechRecognitionCaptured.value = true;
  dialogueAnswerStatus.value = matchesExpected ? 'correct' : 'incorrect';
  if (matchesExpected) stopDialogueSpeechRecording();
}

function stopDialogueSpeechRecording() {
  dialogueLiveRecognition?.stop();
  dialogueLiveRecognition = null;
  dialogueLocalTranscriber?.stop();
  dialogueLocalTranscriber = null;
  dialogueSpeechStream?.getTracks().forEach((track) => track.stop());
  dialogueSpeechStream = null;
  window.clearInterval(dialogueSilenceTimer);
  window.clearTimeout(dialogueRecordingTimeout);
  dialogueSilenceTimer = 0;
  dialogueRecordingTimeout = 0;
  if (dialogueSpeechAudioContext) void dialogueSpeechAudioContext.close().catch(() => undefined);
  dialogueSpeechAudioContext = null;
  stopSpeechRecognition();
  speechRecognitionProgress.value = '';
  isRecognizingSpeech.value = false;
}

function monitorDialogueSpeech(stream: MediaStream) {
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  context.createMediaStreamSource(stream).connect(analyser);
  dialogueSpeechAudioContext = context;
  const samples = new Float32Array(analyser.fftSize);
  let speechStarted = false;
  let quietSince = 0;

  dialogueSilenceTimer = window.setInterval(() => {
    if (!isRecognizingSpeech.value) return;
    analyser.getFloatTimeDomainData(samples);
    let sumSquares = 0;
    for (const sample of samples) sumSquares += sample * sample;
    const rms = Math.sqrt(sumSquares / samples.length);
    const now = performance.now();
    if (rms >= 0.012) {
      speechStarted = true;
      quietSince = 0;
      return;
    }
    if (!speechStarted) return;
    quietSince ||= now;
    if (now - quietSince >= 1_000) stopDialogueSpeechRecording();
  }, 100);

  dialogueRecordingTimeout = window.setTimeout(() => stopDialogueSpeechRecording(), 15_000);
}

async function playAudio() {
  const text = currentExercise.value?.audioText;
  const exerciseId = currentExercise.value?.id;

  if (text && isSpeechSynthesisAvailable()) {
    activeExercisePlaybackProgress.value = 0;
    await speakWithPreferredVoice(text, {
      voice: currentExercise.value?.audioVoice ?? 'mia',
      onTimeUpdate: (currentTime, duration) => {
        if (
          currentExercise.value?.id !== exerciseId
          || !Number.isFinite(duration)
          || duration <= 0
        ) {
          return;
        }

        activeAudioTotalSeconds.value = duration;
        activeExercisePlaybackProgress.value = calculatePlaybackProgress(currentTime, duration);
      },
      onEnd: () => {
        if (currentExercise.value?.id === exerciseId) {
          activeExercisePlaybackProgress.value = 1;
        }
      },
    });
  }

  await appStore.replayAudio();
}

async function toggleListeningPlayback() {
  if (!isSpeechSynthesisAvailable()) {
    return;
  }

  if (!isListeningSpeaking.value && await requireCurrentLessonUpdateBeforePlayback()) {
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

async function requireCurrentLessonUpdateBeforePlayback() {
  const session = appStore.session;
  const templateKey = session?.lesson.lessonTemplateKey;
  const mode = session?.context.mode;
  if (!session || !templateKey || !navigator.onLine || (mode !== 'listening' && mode !== 'speaking')) return false;

  try {
    const freshLesson = await fetchCurrentLesson(session.context, true);
    const currentTexts = getLessonOfflineSpeechTexts(session.lesson.exercises);
    const freshTexts = getLessonOfflineSpeechTexts(freshLesson.exercises);
    if (getSpeechTextsContentVersion(currentTexts) === getSpeechTextsContentVersion(freshTexts)) return false;

    const choice = trainingLibraries[mode].lessons.find((lesson) => lesson.templateKey === templateKey) ?? {
      templateKey,
      title: freshLesson.title,
      focus: freshLesson.title,
      mode,
      minutes: freshLesson.estimatedMinutes,
    };
    stopListeningAudio();
    pendingLessonUpdate.value = { choice, context: session.context, speechTexts: freshTexts };
    lessonUpdateError.value = '';
    showLessonUpdateDialog.value = true;
    return true;
  } catch {
    return false;
  }
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
  const wasPlaying = hasActiveSpeechPlayback()
    || isListeningSpeaking.value
    || isListeningStarting.value;
  isListeningRepeatEnabled.value = repeat;

  if (!repeat) {
    setActiveSpeechRepeat(false);
  } else if (wasPlaying) {
    // Never loop the current sentence fragment: near the end this can be only
    // the final word. Rebuild and loop the complete selected text instead.
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

  resetActiveAudioTiming();
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
    playbackRate: listeningPlaybackRate.value,
    repeat: isListeningRepeatEnabled.value,
    onTimeUpdate: (currentTime, duration) => {
      if (runId !== activeSpeechRunId.value || !Number.isFinite(duration) || duration <= 0) {
        return;
      }

      if (!measuredListeningSegments.has(wordIndex)) {
        measuredListeningSegments.add(wordIndex);
        measuredListeningDurationSeconds += duration;
        measuredListeningTokenCount += playbackTokens.length;
      }

      if (measuredListeningTokenCount > 0) {
        activeAudioTotalSeconds.value = estimateAudioTotalSeconds(
          tokens.length,
          measuredListeningDurationSeconds,
          measuredListeningTokenCount,
        );
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

      activeWordIndex.value = tokens.length - 1;
      activeWordEndIndex.value = tokens.length - 1;
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

function setListeningPlaybackRate(rate: number) {
  listeningPlaybackRate.value = rate;
  setActiveSpeechPlaybackRate(rate);
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
  resetActiveAudioTiming();
  activeWordIndex.value = 0;
  activeWordEndIndex.value = 0;
  isListeningTranslationVisible.value = false;
  resetListeningAutoScroll();
}

function resetActiveAudioTiming() {
  activeAudioTotalSeconds.value = 0;
  measuredListeningDurationSeconds = 0;
  measuredListeningTokenCount = 0;
  measuredListeningSegments = new Set<number>();
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

async function finishLessonAndReturnHome() {
  await returnToLessonChoice('home');
  if (route.path !== '/' || route.query.training !== 'home') {
    await router.push({ path: '/', query: { training: 'home' } });
  }
}

async function handleLessonBack() {
  if ((appStore.session?.currentExerciseIndex ?? 0) <= 0) {
    await returnToLessonChoice();
    return;
  }

  answer.value = '';
  speechRecognitionCaptured.value = false;
  speechRecognitionError.value = '';
  if (isRecognizingSpeech.value) {
    stopDialogueSpeechRecording();
  }
  stopListeningAudio();
  setBackTransition();
  await appStore.returnToPreviousExercise();
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

function handlePrepareAppUpdate() {
  saveListeningPlaybackProgress();
  stopListeningAudio(false);
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

function formatHours(totalSeconds: number): string {
  return `${(totalSeconds / 3600).toFixed(1)} h`;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 3600) return `${Math.round(totalSeconds / 60)} min`;
  return `${(totalSeconds / 3600).toFixed(1)} h`;
}

function readHomePreference(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

function saveHomePreference(key: string, value: string | null) {
  if (typeof localStorage === 'undefined') return;
  if (value) localStorage.setItem(key, value);
  else localStorage.removeItem(key);
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
  [normalizeListeningSentence('Tom: Could you send me the address again, please?')]:
    'Том: Можешь отправить мне адрес ещё раз, пожалуйста?',
  [normalizeListeningSentence('Mia: Sure.')]: 'Мия: Конечно.',
  [normalizeListeningSentence('Mia: I also ran into Pavel near the station this morning.')]:
    'Мия: Я ещё случайно встретила Павла возле станции сегодня утром.',
  [normalizeListeningSentence('Tom: Nice.')]: 'Том: Отлично.',
  [normalizeListeningSentence('Tom: I want to ask him about the new schedule later.')]:
    'Том: Я хочу позже спросить его о новом расписании.',
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
