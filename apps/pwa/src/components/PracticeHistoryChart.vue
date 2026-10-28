<template>
  <section
    class="history-panel"
    aria-labelledby="history-title"
  >
    <div class="history-heading">
      <div>
        <h2 id="history-title">
          Practice over time
        </h2><p>Explore your activity and recorded lesson results.</p>
      </div>
      <q-btn
        flat
        dense
        round
        icon="refresh"
        :loading="loading"
        aria-label="Refresh practice history"
        @click="$emit('refresh')"
      />
    </div>
    <div class="history-controls">
      <q-select
        v-model="grouping"
        outlined
        dense
        emit-value
        map-options
        label="Group by"
        :options="groups"
      />
      <q-select
        v-model="period"
        outlined
        dense
        emit-value
        map-options
        label="Period"
        :options="periods"
      />
      <q-select
        v-model="metric"
        outlined
        dense
        emit-value
        map-options
        label="Show"
        :options="metrics"
      />
    </div>
    <div
      v-if="period === 'custom'"
      class="history-dates"
    >
      <q-input
        v-model="customStart"
        outlined
        dense
        type="date"
        label="From"
        :max="customEnd"
      />
      <q-input
        v-model="customEnd"
        outlined
        dense
        type="date"
        label="To"
        :min="customStart"
        :max="today"
      />
    </div>
    <p
      v-if="invalidRange"
      role="alert"
    >
      Choose a valid date range of up to 10 years.
    </p>
    <template v-else>
      <div class="history-summary">
        <span><strong>{{ Math.round(totalMinutes) }}</strong> measured min</span>
        <span><strong>{{ totalLessons }}</strong> lessons</span>
        <span><strong>{{ totalMovies }}</strong> movies</span>
        <span><strong>{{ totalExercises }}</strong> exercises</span>
        <span><strong>{{ accuracy === null ? '—' : `${Math.round(accuracy * 100)}%` }}</strong> lesson accuracy</span>
      </div>
      <p class="history-range">
        {{ dateLabel(range.start) }} – {{ dateLabel(range.end) }} · {{ unit }}{{ metric === 'time' ? ' · Movies (right axis)' : '' }}
      </p>
      <div class="history-explorer">
        <aside
          class="history-inspector"
          :style="{ '--series-color': activeSeries?.color }"
        >
          <q-select
            v-model="activeKind"
            outlined
            dense
            emit-value
            map-options
            label="Practice"
            :options="visibleSeries.map((series) => ({ label: series.label, value: series.kind }))"
          />
          <div
            class="history-current"
            aria-live="polite"
          >
            <strong>{{ activeSeries?.label }}</strong>
            <span>{{ selectedBucket ? bucketPeriod(selected) : 'Hover over a line or touch a point' }}</span>
            <b>{{ selectedBucket ? formatValue(value(selected, activeKind), activeKind) : '—' }}</b>
          </div>
          <dl class="history-extremes">
            <div><dt>Minimum</dt><dd>{{ formatValue(extremes.min, activeKind) }}</dd></div>
            <div><dt>Maximum</dt><dd>{{ formatValue(extremes.max, activeKind) }}</dd></div>
          </dl>
          <q-input
            :model-value="goal"
            type="number"
            min="0"
            :max="metric === 'accuracy' ? 100 : undefined"
            outlined
            dense
            :label="`Goal (${activeUnit} / ${grouping})`"
            @update:model-value="updateGoal"
          />
          <p class="history-note">
            {{ goalNote }} Editable; saved here. Min/max cover this range{{ metric === 'accuracy' ? '; periods without lessons are excluded' : ', including zero-activity periods' }}.
          </p>
        </aside>
        <div
          ref="plotElement"
          class="history-plot"
        >
          <div
            v-if="selectedBucket && activeSeries"
            class="history-tooltip"
            :style="{ borderColor: activeSeries.color }"
            role="status"
          >
            <strong :style="{ color: activeSeries.color }">{{ activeSeries.label }}</strong>
            <span>{{ bucketPeriod(selected) }}</span>
            <b>{{ formatValue(value(selected, activeKind), activeKind) }}</b>
          </div>
          <svg
            :viewBox="`0 0 ${chartWidth} 280`"
            role="img"
            :aria-label="`${unit} by ${grouping}, ${range.start} to ${range.end}`"
          >
            <g
              v-for="tick in [0, 1, 2, 3, 4]"
              :key="tick"
            >
              <line
                x1="48"
                :x2="chartWidth - 38"
                :y1="230 - tick * 50"
                :y2="230 - tick * 50"
                class="history-grid"
              />
              <text
                x="40"
                :y="234 - tick * 50"
                text-anchor="end"
              >{{ Math.round(maxValue * tick / 4 * 10) / 10 }}</text>
            </g>
            <g v-if="metric === 'time' && !hidden.includes('movies')">
              <text
                v-for="tick in [0, 1, 2, 3, 4]"
                :key="tick"
                :x="chartWidth - 30"
                :y="234 - tick * 50"
                :style="{ fill: movieSeries.color }"
              >{{ movieMax * tick / 4 }}</text>
            </g>
            <line
              v-if="goal !== null && activeSeries"
              x1="48"
              :x2="chartWidth - 38"
              :y1="goalY"
              :y2="goalY"
              :stroke="activeSeries.color"
              stroke-dasharray="6 5"
              opacity="0.8"
            />
            <text
              v-if="goal !== null"
              x="50"
              :y="Math.max(16, goalY - 7)"
              :style="{ fill: activeSeries?.color }"
            >Goal · {{ formatValue(goal, activeKind) }}</text>
            <g
              v-for="series in visibleSeries"
              :key="series.kind"
            >
              <path
                :d="points(series.kind)"
                fill="none"
                :stroke="series.color"
                :stroke-width="activeKind === series.kind ? 3.5 : 2"
                :opacity="activeKind === series.kind ? 1 : 0.55"
                stroke-linejoin="round"
              />
              <template
                v-for="(_, index) in history.buckets"
                :key="index"
              >
                <circle
                  v-if="value(index, series.kind) !== null && (value(index, series.kind) ?? 0) > 0"
                  :cx="x(index)"
                  :cy="230 - (value(index, series.kind) ?? 0) / seriesMax(series.kind) * 200"
                  :opacity="activeKind === series.kind ? 1 : 0.55"
                  r="3"
                  :fill="series.color"
                />
              </template>
            </g>
            <g
              v-for="(bucket, index) in history.buckets"
              :key="bucket.key"
            >
              <text
                v-if="index === 0 || index === history.buckets.length - 1 || (chartWidth > 500 && history.buckets.length > 4 && index === Math.floor(history.buckets.length / 2))"
                :x="x(index)"
                y="258"
                :text-anchor="index === 0 ? 'start' : index === history.buckets.length - 1 ? 'end' : 'middle'"
              >{{ chartDateLabel(bucket.key) }}</text>
            </g>
            <g
              v-for="series in interactionSeries"
              :key="`hit:${series.kind}`"
            >
              <path
                :d="points(series.kind)"
                fill="none"
                stroke="transparent"
                stroke-width="18"
                pointer-events="stroke"
                :aria-label="series.label"
                @pointermove="inspectLine($event, series.kind)"
                @click="inspectLine($event, series.kind)"
              />

            </g>
            <g
              v-for="series in interactionSeries"
              :key="`point-hit:${series.kind}`"
            >
              <template
                v-for="(_, index) in history.buckets"
                :key="index"
              >
                <circle
                  v-if="value(index, series.kind) !== null && (value(index, series.kind) ?? 0) > 0"
                  :cx="x(index)"
                  :cy="230 - (value(index, series.kind) ?? 0) / seriesMax(series.kind) * 200"
                  r="9"
                  fill="transparent"
                  tabindex="0"
                  :aria-label="`${series.label}: ${bucketPeriod(index)}, ${formatValue(value(index, series.kind), series.kind)}`"
                  @pointerenter="inspectPoint(series.kind, index)"
                  @focus="inspectPoint(series.kind, index)"
                  @click="inspectPoint(series.kind, index)"
                />
              </template>
            </g>
            <line
              v-if="selectedBucket"
              :x1="x(selected)"
              :x2="x(selected)"
              y1="30"
              y2="230"
              class="history-cursor"
            />
          </svg>
        </div>
      </div>
      <div
        class="history-legend"
        aria-label="Visible practices"
      >
        <button
          v-for="series in seriesOptions"
          :key="series.kind"
          type="button"
          :aria-pressed="!hidden.includes(series.kind)"
          :class="{ muted: hidden.includes(series.kind) }"
          @mouseenter="selectSeries(series.kind)"
          @focus="selectSeries(series.kind)"
          @click="toggle(series.kind)"
        >
          <i :style="{ background: series.color }" />{{ series.label }}
        </button>
      </div>
      <p
        class="history-detail"
        aria-live="polite"
      >
        {{ selectedBucket ? `${activeSeries?.label} · ${bucketPeriod(selected)} · ${formatValue(value(selected, activeKind), activeKind)}` : 'Hover over a line to identify it. Touch a point for its result. The dashed line is your goal.' }}
      </p>
      <p
        v-if="!hasValues"
        class="history-note"
      >
        No recorded {{ metric === 'time' ? 'dated practice or movies' : metric === 'movies' ? 'movies' : 'lesson results' }} in this period. Try a longer period.
      </p>
    </template>
    <p class="history-note">
      {{ error || 'Only dated records are plotted; lifetime totals may include older time without dates. Dates use your local time; weeks start on Monday. Accuracy is available only for completed lessons. Movies are counted by their watched date, without estimating viewing time.' }}
    </p>
    <p
      v-if="history.undatedSeconds"
      class="history-note"
    >
      {{ Math.round(history.undatedSeconds / 60) }} min of older or multi-day records cannot be placed precisely in this grouping and are excluded. Lifetime totals may therefore be higher.
    </p>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import type { LearningActivityEvent, MovieLearningReport, StatisticsSnapshot } from '@mentor-ai/shared';
import { buildPracticeHistory, suggestedPracticeGoal, summarizeHistoryValues, nearestHistoryIndex, localDateKey, practiceSeries, movieSeries, type HistoryGrouping } from 'src/services/practice-history';
const props = defineProps<{ events: LearningActivityEvent[]; movies: MovieLearningReport[]; snapshots: StatisticsSnapshot[]; loading: boolean; error: string }>();
defineEmits<{ refresh: [] }>();
const plotElement = ref<HTMLElement | null>(null);
const chartWidth = ref(900);
let resizeObserver: ResizeObserver | undefined;
onMounted(() => {
  resizeObserver = new ResizeObserver(([entry]) => { if (entry) chartWidth.value = Math.max(230, entry.contentRect.width); });
  if (plotElement.value) resizeObserver.observe(plotElement.value);
});
onBeforeUnmount(() => resizeObserver?.disconnect());
watch(plotElement, (element) => { resizeObserver?.disconnect(); if (element) resizeObserver?.observe(element); });
const grouping = ref<HistoryGrouping>('day'), period = ref('month'), metric = ref('time');
const activeKind = ref('grammar');
const customGoals = ref<Record<string, number>>({});
onMounted(() => { try { const saved = JSON.parse(localStorage.getItem('mentor-ai:chart-goals') ?? '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) customGoals.value = saved; } catch { /* Keep starting suggestions when storage is unavailable. */ } });
const today = localDateKey(new Date());
const customStart = ref(today), customEnd = ref(today), selected = ref(-1), hidden = ref<string[]>([]);
const groups = [{ label: 'Days', value: 'day' }, { label: 'Weeks', value: 'week' }, { label: 'Months', value: 'month' }, { label: 'Years', value: 'year' }];
const periods = [{ label: 'Last 7 days', value: 'week' }, { label: 'Last month', value: 'month' }, { label: 'Last 3 months', value: 'quarter' }, { label: 'Last year', value: 'year' }, { label: 'All recorded time', value: 'all' }, { label: 'Custom dates', value: 'custom' }];
const metrics = [{ label: 'Practice time', value: 'time' }, { label: 'Completed exercises', value: 'exercises' }, { label: 'Lesson accuracy', value: 'accuracy' }, { label: 'Words spoken', value: 'words' }, { label: 'Movies', value: 'movies' }];
const range = computed(() => {
  if (period.value === 'custom') return { start: customStart.value, end: customEnd.value };
  const end = new Date(), start = new Date(end);
  if (period.value === 'all') {
    const dates = [...props.events.map((event) => event.startedAt), ...props.snapshots.map((snapshot) => snapshot.createdAt), ...props.movies.map((movie) => movie.watchedAt)].map((date) => Date.parse(date)).filter(Number.isFinite);
    start.setTime(Math.min(end.getTime(), ...dates));
  } else start.setDate(start.getDate() - ({ week: 6, month: 29, quarter: 89, year: 364 }[period.value] ?? 29));
  return { start: localDateKey(start), end: localDateKey(end) };
});
const invalidRange = computed(() => !/^\d{4}-\d{2}-\d{2}$/.test(range.value.start) || !/^\d{4}-\d{2}-\d{2}$/.test(range.value.end) || range.value.start > range.value.end || !Number.isFinite(Date.parse(range.value.start)) || !Number.isFinite(Date.parse(range.value.end)) || Date.parse(range.value.end) - Date.parse(range.value.start) > 3660 * 86400000);
const history = computed(() => buildPracticeHistory(props.events, props.snapshots, invalidRange.value ? today : range.value.start, invalidRange.value ? today : range.value.end, grouping.value, props.movies));
const seriesOptions = computed(() => metric.value === 'time' ? [...practiceSeries, movieSeries] : [{ kind: metric.value, label: metrics.find((item) => item.value === metric.value)!.label, color: metric.value === 'movies' ? movieSeries.color : practiceSeries[0].color }]);
const visibleSeries = computed(() => seriesOptions.value.filter((series) => !hidden.value.includes(series.kind)));
const interactionSeries = computed(() => [...visibleSeries.value].sort((a, b) => Number(a.kind === activeKind.value) - Number(b.kind === activeKind.value)));
function selectSeries(kind: string) { if (!hidden.value.includes(kind)) activeKind.value = kind; }
function value(index: number, kind: string): number | null {
  const bucket = history.value.buckets[index]!;
  if (kind === 'movies') return bucket.movies;
  if (metric.value === 'time') return bucket.seconds[kind as keyof typeof bucket.seconds] / 60;
  if (metric.value === 'accuracy') return bucket.lessons ? bucket.accuracySum / bucket.lessons * 100 : null;
  return metric.value === 'words' ? bucket.words : bucket.exercises;
}
const dataMaxValue = computed(() => metric.value === 'accuracy' ? 100 : Math.max(1, ...history.value.buckets.flatMap((_, index) => visibleSeries.value.filter((series) => metric.value !== 'time' || series.kind !== 'movies').map((series) => value(index, series.kind) ?? 0))));
const dataMovieMax = computed(() => Math.max(4, Math.ceil(Math.max(0, ...history.value.buckets.map((bucket) => bucket.movies)) / 4) * 4));
const maxValue = computed(() => Math.max(dataMaxValue.value, ...visibleSeries.value.filter((series) => metric.value !== 'time' || series.kind !== 'movies').map((series) => goalFor(series.kind) ?? 0)));
const movieMax = computed(() => Math.max(dataMovieMax.value, Math.ceil((goalFor('movies') ?? 0) / 4) * 4));
function seriesMax(kind: string) { return metric.value === 'time' && kind === 'movies' ? movieMax.value : maxValue.value; }
const totalMovies = computed(() => history.value.buckets.reduce((sum, bucket) => sum + bucket.movies, 0));
const hasValues = computed(() => history.value.buckets.some((_, index) => visibleSeries.value.some((series) => (value(index, series.kind) ?? 0) > 0)));
const totalMinutes = computed(() => history.value.buckets.reduce((sum, bucket) => sum + Object.values(bucket.seconds).reduce((a, b) => a + b, 0), 0) / 60);
const totalLessons = computed(() => history.value.buckets.reduce((sum, bucket) => sum + bucket.lessons, 0));
const totalExercises = computed(() => history.value.buckets.reduce((sum, bucket) => sum + bucket.exercises, 0));
const accuracy = computed(() => totalLessons.value ? history.value.buckets.reduce((sum, bucket) => sum + bucket.accuracySum, 0) / totalLessons.value : null);
const selectedBucket = computed(() => activeSeries.value ? history.value.buckets[selected.value] : undefined);
const unit = computed(() => ({ time: 'Minutes', exercises: 'Exercises', accuracy: 'Accuracy (%)', words: 'Words spoken', movies: 'Movies' }[metric.value]));
function x(index: number) { return 48 + index * (chartWidth.value - 86) / Math.max(1, history.value.buckets.length - 1); }
function points(kind: string) { let connected = false; return history.value.buckets.map((_, index) => { const amount = value(index, kind); if (amount === null) { connected = false; return ''; } const command = connected ? 'L' : 'M'; connected = true; return `${command}${x(index)},${230 - amount / seriesMax(kind) * 200}`; }).join(' '); }
function chartDateLabel(key: string) { return new Date(`${key}T12:00:00`).toLocaleDateString('en-GB', grouping.value === 'year' ? { year: 'numeric' } : { day: 'numeric', month: 'short' }); }
function dateLabel(key: string) { return new Date(`${key}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
const activeSeries = computed(() => visibleSeries.value.find((series) => series.kind === activeKind.value));
const activeUnit = computed(() => activeKind.value === 'movies' ? 'movies' : metric.value === 'time' ? 'min' : metric.value === 'accuracy' ? '%' : metric.value === 'words' ? 'words' : 'exercises');
const goalKey = computed(() => `${metric.value}:${activeKind.value}:${grouping.value}`);
const goal = computed(() => activeSeries.value ? goalFor(activeKind.value) : null);
function goalFor(kind: string): number | null {
  const saved = customGoals.value[`${metric.value}:${kind}:${grouping.value}`];
  if (typeof saved === 'number' && Number.isFinite(saved) && saved >= 0) return metric.value === 'accuracy' ? Math.min(100, saved) : saved;
  return suggestedPracticeGoal(metric.value, kind, grouping.value);
}
const goalNote = computed(() => Number.isFinite(customGoals.value[goalKey.value]) ? `Your goal per ${grouping.value}.` : activeKind.value === 'movies' && grouping.value === 'day' && goal.value === null ? 'Starting suggestion: 1 movie per week. Set a daily goal if you want one.' : metric.value === 'accuracy' ? 'Starting suggestion: 80% lesson accuracy.' : grouping.value === 'month' || grouping.value === 'year' ? 'Starting suggestion (30/365 days).' : 'Starting suggestion.');
const goalY = computed(() => 230 - (goal.value ?? 0) / seriesMax(activeKind.value) * 200);
const extremes = computed(() => summarizeHistoryValues(history.value.buckets.map((_, index) => value(index, activeKind.value))));
function updateGoal(input: string | number | null) {
  if (input === '' || input === null) return;
  const amount = Number(input);
  if (!Number.isFinite(amount) || amount < 0 || (metric.value === 'accuracy' && amount > 100)) return;
  customGoals.value = { ...customGoals.value, [goalKey.value]: amount };
  try { localStorage.setItem('mentor-ai:chart-goals', JSON.stringify(customGoals.value)); } catch { /* Goal remains available for this visit. */ }
}
function formatValue(amount: number | null, kind: string) {
  if (amount === null) return 'Not measured';
  const suffix = kind === 'movies' ? (amount === 1 ? ' movie' : ' movies') : metric.value === 'accuracy' ? '%' : metric.value === 'time' ? ' min' : metric.value === 'words' ? ' words' : ' exercises';
  return `${Math.round(amount * 10) / 10}${suffix}`;
}
function bucketPeriod(index: number) {
  const bucket = history.value.buckets[index];
  if (!bucket) return '';
  const start = new Date(`${bucket.key}T12:00:00`), end = new Date(start);
  if (grouping.value === 'day') return dateLabel(bucket.key);
  if (grouping.value === 'week') end.setDate(end.getDate() + 6);
  else if (grouping.value === 'month') end.setMonth(end.getMonth() + 1, 0);
  else end.setFullYear(end.getFullYear() + 1, 0, 0);
  return `${dateLabel(bucket.key < range.value.start ? range.value.start : bucket.key)} – ${dateLabel(localDateKey(end) > range.value.end ? range.value.end : localDateKey(end))}`;
}
function inspectPoint(kind: string, index: number) { activeKind.value = kind; selected.value = index; }
function inspectLine(event: MouseEvent | PointerEvent, kind: string) {
  const svg = (event.currentTarget as SVGElement).ownerSVGElement;
  if (!svg) return;
  const bounds = svg.getBoundingClientRect();
  const position = (event.clientX - bounds.left) / bounds.width * chartWidth.value;
  const index = nearestHistoryIndex(position, chartWidth.value, history.value.buckets.length);
  inspectPoint(kind, index);
}
watch([metric, visibleSeries], () => { if (!visibleSeries.value.some((series) => series.kind === activeKind.value)) activeKind.value = visibleSeries.value[0]?.kind ?? seriesOptions.value[0]!.kind; });
function toggle(kind: string) { hidden.value = hidden.value.includes(kind) ? hidden.value.filter((item) => item !== kind) : [...hidden.value, kind]; }
watch([grouping, period, metric, customStart, customEnd], () => { selected.value = -1; });
</script>
<style scoped lang="scss">
.history-panel { min-width: 0; max-width: 100%; padding: 24px; border: 1px solid var(--app-border); border-radius: 22px; background: var(--app-surface); color: var(--app-text); }
.history-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
h2 { margin: 0; font-size: 19px; font-weight: 700; color: var(--app-text-strong); }
p { color: var(--app-muted-strong); font-size: 13px; }
.history-controls > * { min-width: 0; }
.history-controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
.history-dates { display: flex; gap: 12px; margin-bottom: 16px; }
.history-summary { display: flex; flex-wrap: wrap; gap: 12px 24px; margin: 20px 0; font-size: 12px; color: var(--app-muted-strong); }
.history-summary strong { font-size: 22px; color: var(--app-text-strong); margin-right: 4px; }
.history-explorer { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 18px; align-items: start; margin-bottom: 18px; }
.history-inspector { min-width: 0; padding: 14px; border: 1px solid var(--app-border); border-radius: 16px; background: var(--app-surface-soft); }
.history-current { display: flex; flex-direction: column; gap: 6px; margin: 16px 0; }
.history-current strong { color: var(--series-color); }
.history-current span { color: var(--app-muted-strong); font-size: 12px; }
.history-current b { color: var(--app-text-strong); font-size: 22px; }
.history-extremes { margin: 0 0 16px; }
.history-extremes > div { display: flex; justify-content: space-between; gap: 8px; margin-top: 8px; font-size: 12px; }
.history-extremes dt { color: var(--app-muted-strong); }
.history-extremes dd { margin: 0; font-weight: 600; }
.history-plot { position: relative; overflow-x: auto; }
.history-tooltip { position: absolute; top: 48px; right: 40px; z-index: 1; display: flex; flex-direction: column; gap: 4px; max-width: 190px; padding: 10px 12px; border: 1px solid; border-radius: 12px; background: var(--app-surface); box-shadow: 0 4px 18px #0002; font-size: 12px; pointer-events: none; }
.history-tooltip span { color: var(--app-muted-strong); }
svg { display: block; width: 100%; min-width: 0; }
svg text { fill: var(--app-muted-strong); font-size: 11px; }

.history-grid { stroke: var(--app-border); }
.history-cursor { stroke: var(--app-muted-strong); stroke-dasharray: 4; pointer-events: none; }
.history-legend { display: flex; flex-wrap: wrap; gap: 8px; }
.history-legend button { display: flex; align-items: center; gap: 6px; border: 1px solid var(--app-border); border-radius: 20px; padding: 7px 10px; background: var(--app-surface-soft); color: var(--app-text); cursor: pointer; font: inherit; font-size: 12px; }
.history-legend .muted { opacity: .45; }
.history-legend i { width: 9px; height: 9px; border-radius: 50%; }
.history-detail { min-height: 38px; line-height: 1.6; }
.history-note { font-size: 12px; line-height: 1.6; margin-bottom: 0; }
@media (max-width: 650px) { .history-explorer { grid-template-columns: minmax(0, 1fr); } .history-inspector { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; } .history-inspector > .history-note { grid-column: 1 / -1; } .history-current, .history-extremes { margin: 0; } .history-panel { min-width: 0; max-width: 100%; padding: 16px; } .history-controls { grid-template-columns: 1fr 1fr; } .history-controls > :last-child { grid-column: 1 / -1; } .history-dates > * { min-width: 0; flex: 1; } }
</style>
