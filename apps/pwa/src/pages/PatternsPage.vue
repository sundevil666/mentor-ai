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
        <q-btn
          class="pattern-listen-all"
          color="primary"
          :icon="isLessonPlaying ? 'stop' : 'headphones'"
          :label="isLessonPlaying ? 'Stop audio lesson' : 'Listen to the full lesson'"
          no-caps
          :loading="audioLoading"
          @click="toggleFullLesson"
        />
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
import { computed, onBeforeUnmount, ref } from 'vue';
import { createPatternAudioScript, patternLibrary, type PhrasePatternExample } from 'src/services/pattern-library';
import { speakWithPreferredVoice, stopSpeech } from 'src/services/speech-synthesis';

const pattern = patternLibrary[0]!;
const progressKey = `mentor-ai:pattern-progress:${pattern.id}`;
const completedIds = ref(readCompletedIds());
const revealedIds = ref(new Set<string>());
const playingId = ref<string | null>(null);
const isLessonPlaying = ref(false);
const audioLoading = ref(false);
const completedCount = computed(() => completedIds.value.size);
const progress = computed(() => completedCount.value / pattern.examples.length);

onBeforeUnmount(stopSpeech);

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
  stopSpeech(); isLessonPlaying.value = false; playingId.value = example.id;
  const started = await speakWithPreferredVoice(example.phrase, { mediaTitle: pattern.title, onEnd: () => { playingId.value = null; }, onError: showAudioError });
  if (!started) playingId.value = null;
}

async function toggleFullLesson() {
  if (isLessonPlaying.value || audioLoading.value) { stopSpeech(); isLessonPlaying.value = false; audioLoading.value = false; return; }
  stopSpeech(); playingId.value = null; audioLoading.value = true;
  const started = await speakWithPreferredVoice(createPatternAudioScript(pattern), { mediaTitle: `Pattern: ${pattern.title}`, onEnd: () => { isLessonPlaying.value = false; }, onError: showAudioError });
  audioLoading.value = false; isLessonPlaying.value = started;
}

function showAudioError() {
  playingId.value = null; isLessonPlaying.value = false; audioLoading.value = false;
  Notify.create({ type: 'negative', icon: 'volume_off', message: 'Could not play this phrase', caption: 'Check the connection and try again.' });
}
</script>
