import { deleteSpeechBatch, getSpeechBatchSize } from './speech-synthesis.js';
import { deleteOfflineVideo, type LibraryVideo } from './video-library.js';
import { isSpeechBatchCached } from './speech-synthesis.js';
import type { GeneratedLesson, LearningContext } from '@mentor-ai/shared';

export type OfflineCategory = 'listening' | 'speaking' | 'videos';
export type RetentionDays = 7 | 14 | 30 | 90;
export interface OfflineLesson {
  id: string;
  category: OfflineCategory;
  title: string;
  downloadedAt: string;
  lastOpenedAt: string;
  estimatedBytes: number;
  speechTexts?: string[];
  video?: LibraryVideo;
}

export const offlineCategories: Array<{ id: OfflineCategory; label: string; icon: string }> = [
  { id: 'listening', label: 'Listening', icon: 'headphones' },
  { id: 'speaking', label: 'Speaking', icon: 'record_voice_over' },
  { id: 'videos', label: 'Videos', icon: 'video_library' },
];
const lessonsKey = 'mentor-ai:offline-lessons:v1';
const retentionKey = 'mentor-ai:offline-retention:v1';
const legacySpeechCatalog = [
  { id: 'commute-listening', category: 'listening', title: 'Commute listening' },
  { id: 'shop-listening', category: 'listening', title: 'At a small shop' },
  { id: 'weekly-weak-spots-dialogue', category: 'speaking', title: 'Work conversation' },
  { id: 'polite-speaking', category: 'speaking', title: 'Polite requests' },
] as const;

export function readOfflineLessons(): OfflineLesson[] { return readJson(lessonsKey, []); }
export function readOfflineRetention(): Record<OfflineCategory, RetentionDays> {
  return { listening: 30, speaking: 30, videos: 30, ...readJson(retentionKey, {}) };
}
export function saveOfflineRetention(category: OfflineCategory, days: RetentionDays) {
  localStorage.setItem(retentionKey, JSON.stringify({ ...readOfflineRetention(), [category]: days }));
}
export function registerOfflineSpeechLesson(input: { id: string; category: 'listening' | 'speaking'; title: string; speechTexts: string[] }) {
  upsert({ ...input, estimatedBytes: input.speechTexts.join('').length * 48 });
}
export function registerOfflineVideo(video: LibraryVideo) {
  upsert({ id: video.id, category: 'videos', title: video.title, estimatedBytes: video.sizeBytes, video });
}
export function markOfflineLessonOpened(id: string, category: OfflineCategory) {
  saveLessons(readOfflineLessons().map((lesson) => lesson.id === id && lesson.category === category
    ? { ...lesson, lastOpenedAt: new Date().toISOString() } : lesson));
}
export function forgetOfflineLesson(id: string, category: OfflineCategory) {
  saveLessons(readOfflineLessons().filter((lesson) => !(lesson.id === id && lesson.category === category)));
}
export async function refreshOfflineSizes() {
  const refreshed = await Promise.all(readOfflineLessons().map(async (lesson) => ({ ...lesson,
    estimatedBytes: lesson.speechTexts ? await getSpeechBatchSize(lesson.speechTexts) : lesson.estimatedBytes,
  })));
  saveLessons(refreshed);
  return refreshed;
}
export async function migrateLegacySpeechDownloads(loadLesson: (context: LearningContext, createdAt: string) => Promise<GeneratedLesson>) {
  for (const item of legacySpeechCatalog) {
    if (readOfflineLessons().some((lesson) => lesson.id === item.id && lesson.category === item.category)) continue;
    try {
      const lesson = await loadLesson({
        mode: item.category,
        selectedConcept: 'learning',
        manualConceptChoice: true,
        lessonTemplateKey: item.id,
        isOffline: !navigator.onLine,
        speechAvailable: true,
        availableMinutes: 10,
      }, new Date().toISOString());
      const texts = splitLessonSpeechTexts(lesson.exercises);
      if (await isSpeechBatchCached(texts)) registerOfflineSpeechLesson({ ...item, speechTexts: texts });
    } catch { /* A legacy lesson that cannot be reconstructed stays untouched. */ }
  }
}
export async function removeOfflineLesson(lesson: OfflineLesson) {
  if (lesson.speechTexts) await deleteSpeechBatch(lesson.speechTexts);
  if (lesson.video) await deleteOfflineVideo(lesson.video);
  saveLessons(readOfflineLessons().filter((item) => !(item.id === lesson.id && item.category === lesson.category)));
}
export async function clearOfflineCategory(category: OfflineCategory) {
  for (const lesson of readOfflineLessons().filter((item) => item.category === category)) await removeOfflineLesson(lesson);
}
export function selectExpiredOfflineLessons(lessons: OfflineLesson[], retention: Record<OfflineCategory, RetentionDays>, now = Date.now()) {
  return lessons.filter((lesson) => {
    const opened = Date.parse(lesson.lastOpenedAt || lesson.downloadedAt);
    return Number.isFinite(opened) && now - opened >= retention[lesson.category] * 86_400_000;
  });
}
export async function cleanupExpiredOfflineLessons(now = Date.now()) {
  const expired = selectExpiredOfflineLessons(readOfflineLessons(), readOfflineRetention(), now);
  for (const lesson of expired) await removeOfflineLesson(lesson);
  return expired;
}
function upsert(input: Pick<OfflineLesson, 'id' | 'category' | 'title' | 'estimatedBytes'> & Partial<OfflineLesson>) {
  const now = new Date().toISOString();
  const lessons = readOfflineLessons();
  const previous = lessons.find((item) => item.id === input.id && item.category === input.category);
  saveLessons([...lessons.filter((item) => !(item.id === input.id && item.category === input.category)), {
    ...input, downloadedAt: previous?.downloadedAt ?? now, lastOpenedAt: now,
  } as OfflineLesson]);
}
function splitLessonSpeechTexts(exercises: Array<{ audioText?: string }>) {
  return exercises.flatMap(({ audioText }) => {
    const text = audioText?.trim();
    if (!text) return [];
    return text.match(/[^.!?]+[.!?]+(?:[”'\"]+)?|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  });
}
function saveLessons(lessons: OfflineLesson[]) { localStorage.setItem(lessonsKey, JSON.stringify(lessons)); }
function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
