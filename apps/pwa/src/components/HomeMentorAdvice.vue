<template>
  <section
    class="mentor-advice"
    aria-label="Советы ментора"
  >
    <div class="mentor-advice__heading">
      <q-icon
        name="tips_and_updates"
        size="28px"
      /><div><h1>Советы ментора</h1><p>Общая картина за 30 дней · нажми на совет, чтобы отметить прочитанным</p></div>
    </div>
    <q-tabs
      v-model="tab"
      dense
      no-caps
      align="justify"
      active-color="primary"
    >
      <q-tab
        name="new"
        :label="`Новые · ${unread.length}`"
      />
      <q-tab
        name="read"
        :label="`Прочитанные · ${read.length}`"
      />
    </q-tabs>
    <div
      class="mentor-advice__list"
      tabindex="0"
      role="region"
      :aria-label="tab === 'new' ? 'Новые советы' : 'Прочитанные советы'"
    >
      <p
        v-if="loading"
        class="mentor-advice__empty"
      >
        Собираю общую картину…
      </p>
      <p
        v-else-if="error"
        class="mentor-advice__empty"
      >
        Не удалось загрузить занятия. <button
          type="button"
          @click="refresh"
        >
          Повторить
        </button>
      </p>
      <template v-else>
        <button
          v-for="note in tab === 'new' ? unread : read"
          :key="note.id"
          type="button"
          class="mentor-advice__card"
          :class="{ 'mentor-advice__card--read': note.read }"
          :disabled="note.read"
          @click="openAdvice(note)"
        >
          <q-icon
            :name="note.read ? 'done' : note.tone === 'positive' ? 'thumb_up' : 'lightbulb_outline'"
            :color="note.tone === 'positive' ? 'positive' : 'primary'"
            size="22px"
          />
          <span><strong>{{ note.title }}</strong><span>{{ note.text }}</span></span>
        </button>
        <p
          v-if="!(tab === 'new' ? unread : read).length"
          class="mentor-advice__empty"
        >
          {{ tab === 'read' ? 'Здесь появятся прочитанные советы.' : notes.length ? 'Все советы прочитаны. Новые появятся, когда изменится картина занятий.' : 'Пока мало данных для обратной связи. Позанимайся, почитай или послушай — здесь появятся советы.' }}
        </p>
      </template>
    </div>
    <p
      v-if="saveError"
      role="status"
      class="mentor-advice__empty"
    >
      Не удалось сохранить отметку на устройстве.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { StatisticsSnapshot } from '@mentor-ai/shared';
import { listBookReadingAnalytics } from 'src/services/book-reading-analytics';
import { loadLearningActivityHistory } from 'src/services/learning-activity';
import { loadAllContentEngagement } from 'src/services/content-engagement';
import { loadMovieLearningReports, refreshMovieLearningReportsFromCloud } from 'src/services/movie-learning-reports';
import { buildHomeMentorAdvice, type MentorAdvice } from 'src/services/home-mentor-advice';

const props = defineProps<{ statistics: StatisticsSnapshot[]; studentId: string }>();
const router = useRouter();
type SavedAdvice = MentorAdvice & { read: boolean };
const notes = ref<SavedAdvice[]>([]);
const tab = ref('new');
const loading = ref(true);
const error = ref(false);
const saveError = ref(false);
const unread = computed(() => notes.value.filter(note => !note.read));
const read = computed(() => notes.value.filter(note => note.read));
let disposed = false;
let run = 0;
function storageKey() { return `mentor-ai:home-advice:${props.studentId}`; }
function persist() {
  try { localStorage.setItem(storageKey(), JSON.stringify(notes.value)); saveError.value = false; }
  catch { saveError.value = true; }
}
function markRead(id: string) {
  notes.value = notes.value.map(note => note.id === id ? { ...note, read: true } : note);
  persist();
}
function openAdvice(note: SavedAdvice) {
  markRead(note.id);
  if (note.id.startsWith('vocabulary:')) void router.push({ name: 'dashboard', query: { training: 'vocabulary' } });
}
async function refresh() {
  const currentRun = ++run;
  const key = storageKey();
  try {
    const [activity, engagement, movies, books] = await Promise.all([loadLearningActivityHistory(), loadAllContentEngagement(), loadMovieLearningReports(), listBookReadingAnalytics(props.studentId)]);
    if (disposed || currentRun !== run || key !== storageKey()) return;
    let saved: SavedAdvice[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
      if (Array.isArray(parsed)) saved = parsed.filter((item): item is SavedAdvice => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.text === 'string' && typeof item.read === 'boolean' && ['positive', 'focus'].includes(item.tone)).slice(0, 40);
    } catch { /* A damaged cache must not prevent fresh advice. */ }
    const account = props.studentId;
    const belongs = (item: { studentId: string }) => item.studentId === account;
    const advice = buildHomeMentorAdvice({ statistics: props.statistics.filter(belongs), activity: activity.filter(belongs), engagement: engagement.filter(belongs), movies: movies.filter(belongs), books: books.map(book => book.snapshot) });
    const previous = new Map(saved.map(note => [note.id, note]));
    notes.value = [...advice.map(note => ({ ...note, read: previous.get(note.id)?.read ?? false })), ...saved.filter(note => note.read && !advice.some(current => current.id === note.id))].slice(0, 40);
    error.value = false;
    persist();
  } catch { if (currentRun === run) error.value = true; }
  finally { if (currentRun === run) loading.value = false; }
}
const events = ['mentor-learning-activity-updated', 'mentor-content-engagement', 'mentor-movie-reports-updated', 'mentor-ai:book-reading-analytics-changed', 'focus', 'storage'];
onMounted(() => {
  void refresh();
  for (const event of events) window.addEventListener(event, refresh);
  if (navigator.onLine) {
    // Render device data first; a failed network refresh keeps offline advice usable.
    void Promise.allSettled([loadLearningActivityHistory(true), refreshMovieLearningReportsFromCloud()])
      .then(() => { if (!disposed) void refresh(); });
  }
});
onUnmounted(() => { disposed = true; for (const event of events) window.removeEventListener(event, refresh); });
watch(() => [props.statistics, props.studentId], refresh);
</script>

<style scoped>
.mentor-advice { width: 100%; min-width: 0; border: 1px solid rgba(124, 58, 237, .25); border-radius: 22px; padding: 16px; background: rgba(124, 58, 237, .04); }
.mentor-advice__heading { display: flex; align-items: center; gap: 12px; }
.mentor-advice h1 { font-size: 1.5rem; line-height: 1.3; margin: 0; }
.mentor-advice__heading p { font-size: .95rem; line-height: 1.5; opacity: .75; margin: 5px 0 12px; }
.mentor-advice__list { height: 290px; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 8px; padding: 8px 2px; }
.mentor-advice__card { display: flex; align-items: flex-start; gap: 12px; padding: 13px; width: 100%; border: 1px solid rgba(124, 58, 237, .2); border-radius: 14px; text-align: left; background: transparent; color: inherit; cursor: pointer; font: inherit; }
.mentor-advice__card > span { display: grid; gap: 4px; min-width: 0; overflow-wrap: anywhere; }
.mentor-advice__card span span { font-size: 1rem; line-height: 1.55; }
.mentor-advice__card--read { cursor: default; opacity: .8; }
.mentor-advice__card:focus-visible { outline: 2px solid var(--q-primary); outline-offset: 1px; }
.mentor-advice__empty { font-size: .95rem; line-height: 1.5; padding: 12px; margin: 0; }
</style>
