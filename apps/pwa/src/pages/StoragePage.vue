<template>
  <q-page class="storage-page">
    <section class="storage-shell">
      <header class="storage-header">
        <div><p>On this device</p><h1>Storage</h1><span>Manage lessons available without an internet connection.</span></div>
        <div class="storage-total"><strong>{{ formatBytes(totalBytes) }}</strong><span>{{ lessons.length }} saved</span></div>
      </header>

      <div class="storage-policy q-mb-md">
        <div><strong>Offline storage limit</strong><span>Older downloads are removed at this limit. Lessons added in the last 7 days are always kept.</span></div>
        <q-select v-model="maxBytes" :options="maxBytesOptions" emit-value map-options outlined dense options-dense aria-label="Offline storage limit" @update:model-value="saveLimit" />
      </div>

      <q-tabs v-model="activeTab" class="storage-tabs" align="left" active-color="primary" indicator-color="primary" mobile-arrows>
        <q-tab v-for="category in offlineCategories" :key="category.id" :name="category.id" :icon="category.icon" :label="category.label" no-caps />
        <q-tab name="statistics" icon="donut_large" label="Statistics" no-caps />
      </q-tabs>

      <q-tab-panels v-model="activeTab" animated class="storage-panels">
        <q-tab-panel v-for="category in offlineCategories" :key="category.id" :name="category.id">
          <div class="storage-policy">
            <div><strong>Automatic cleanup</strong><span>Remove lessons not opened during this period.</span></div>
            <q-select v-model="retention[category.id]" :options="retentionOptions" emit-value map-options outlined dense options-dense aria-label="Automatic cleanup period" @update:model-value="savePeriod(category.id)" />
          </div>
          <div class="storage-category-summary">
            <span>{{ categoryLessons(category.id).length }} lessons · {{ formatBytes(categoryBytes(category.id)) }}</span>
            <q-btn flat no-caps color="negative" icon="delete_sweep" label="Clear category" :disable="categoryLessons(category.id).length === 0" @click="clearCategory(category.id)" />
          </div>
          <q-list v-if="categoryLessons(category.id).length" separator class="offline-lesson-list">
            <q-item v-for="lesson in categoryLessons(category.id)" :key="lesson.id">
              <q-item-section avatar><q-avatar color="primary" text-color="white" :icon="category.icon" /></q-item-section>
              <q-item-section><q-item-label>{{ lesson.title }}</q-item-label><q-item-label caption>{{ formatBytes(lesson.estimatedBytes) }} · Last opened {{ formatDate(lesson.lastOpenedAt) }}</q-item-label></q-item-section>
              <q-item-section side><q-btn round flat color="negative" icon="delete_outline" :aria-label="`Delete ${lesson.title}`" @click="removeLesson(lesson)" /></q-item-section>
            </q-item>
          </q-list>
          <div v-else class="storage-empty"><q-icon name="cloud_off" size="42px" /><strong>No saved lessons</strong><span>Downloaded {{ category.label.toLowerCase() }} lessons will appear here.</span></div>
        </q-tab-panel>

        <q-tab-panel name="statistics">
          <div class="storage-chart" aria-label="Storage used by category">
            <div class="storage-donut" :style="donutStyle"><div><strong>{{ formatBytes(totalBytes) }}</strong><span>Total</span></div></div>
            <div class="storage-legend">
              <div v-for="(category, index) in offlineCategories" :key="category.id"><i :style="{ background: chartColors[index] }" /><span>{{ category.label }}</span><strong>{{ formatBytes(categoryBytes(category.id)) }}</strong><small>{{ categoryPercent(category.id) }}%</small></div>
            </div>
          </div>
          <p class="storage-note">Sizes are measured from the offline files stored by Mentor AI on this device.</p>
        </q-tab-panel>
      </q-tab-panels>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { Notify } from 'quasar';
import { computed, onMounted, ref } from 'vue';
import { formatDisplayDate } from 'src/services/date-format';
import { cleanupExpiredOfflineLessons, clearOfflineCategory, migrateLegacySpeechDownloads, offlineCategories, readOfflineLessons, readOfflineMaxBytes, readOfflineRetention, refreshOfflineSizes, removeOfflineLesson, saveOfflineMaxBytes, saveOfflineRetention, type OfflineCategory, type OfflineLesson, type RetentionDays } from 'src/services/offline-library';
import { useAppStore } from 'src/stores/app-store';

const activeTab = ref<OfflineCategory | 'statistics'>('listening');
const appStore = useAppStore();
const lessons = ref<OfflineLesson[]>([]);
const retention = ref(readOfflineRetention());
const maxBytes = ref(readOfflineMaxBytes());
const maxBytesOptions = [{ label: '100 MB', value: 100_000_000 }, { label: '250 MB', value: 250_000_000 }, { label: '500 MB', value: 500_000_000 }, { label: '1 GB', value: 1_000_000_000 }];
const retentionOptions = [{ label: '1 week', value: 7 }, { label: '2 weeks', value: 14 }, { label: '1 month', value: 30 }, { label: '3 months', value: 90 }];
const chartColors = ['#5b7cfa', '#8b5cf6', '#22b8a7'];
const totalBytes = computed(() => lessons.value.reduce((sum, lesson) => sum + lesson.estimatedBytes, 0));
const donutStyle = computed(() => {
  if (!totalBytes.value) return { background: '#dfe4ee' };
  let cursor = 0;
  const stops = offlineCategories.map((category, index) => { const start = cursor; cursor += categoryPercent(category.id); return `${chartColors[index]} ${start}% ${cursor}%`; });
  return { background: `conic-gradient(${stops.join(', ')})` };
});
onMounted(async () => { if (!appStore.isHydrated) await appStore.hydrate(); await migrateLegacySpeechDownloads(appStore.loadLesson.bind(appStore)); const expired = await cleanupExpiredOfflineLessons(); lessons.value = await refreshOfflineSizes(); if (expired.length) Notify.create({ type: 'info', message: `Removed ${expired.length} unused offline lesson${expired.length === 1 ? '' : 's'}.` }); });
function categoryLessons(category: OfflineCategory) { return lessons.value.filter((lesson) => lesson.category === category); }
function categoryBytes(category: OfflineCategory) { return categoryLessons(category).reduce((sum, lesson) => sum + lesson.estimatedBytes, 0); }
function categoryPercent(category: OfflineCategory) { return totalBytes.value ? Math.round(categoryBytes(category) / totalBytes.value * 100) : 0; }
function savePeriod(category: OfflineCategory) { saveOfflineRetention(category, retention.value[category] as RetentionDays); }
async function saveLimit() { saveOfflineMaxBytes(maxBytes.value); await cleanupExpiredOfflineLessons(); lessons.value = readOfflineLessons(); }
async function removeLesson(lesson: OfflineLesson) { await removeOfflineLesson(lesson); lessons.value = readOfflineLessons(); Notify.create({ type: 'positive', message: `${lesson.title} removed from this device.` }); }
async function clearCategory(category: OfflineCategory) { await clearOfflineCategory(category); lessons.value = readOfflineLessons(); Notify.create({ type: 'positive', message: 'Category storage cleared.' }); }
function formatBytes(bytes: number) { if (!bytes) return '0 MB'; return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1_000))} KB`; }
function formatDate(value: string) { return formatDisplayDate(value); }
</script>
