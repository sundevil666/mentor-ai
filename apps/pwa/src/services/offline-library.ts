import { deleteSpeechBatch, getSpeechBatchSize, isSpeechBatchCached, splitSpeechTextIntoSentences } from './speech-synthesis.js';
import { deleteOfflineStory, type LibraryStory } from './story-library.js';
import { deleteOfflineAudio, type LibraryAudio } from './audio-library.js';
import type { GeneratedLesson, LearningContext } from '@mentor-ai/shared';

export type OfflineCategory = 'lessons' | 'listening' | 'speaking' | 'audio' | 'stories' | 'videos';
export type RetentionDays = 7 | 14 | 30 | 90;
export const mandatoryOfflineDays = 7;
export const defaultOfflineMaxBytes = 250_000_000;
export interface OfflineLesson {
  id: string;
  category: OfflineCategory;
  title: string;
  downloadedAt: string;
  lastOpenedAt: string;
  estimatedBytes: number;
  contentBytes?: number;
  contentVersion?: string;
  speechTexts?: string[];
  story?: LibraryStory;
  audio?: LibraryAudio;
  sourceCreatedAt?: string;
}

export const offlineCategories: Array<{ id: OfflineCategory; label: string; icon: string }> = [
  { id: 'lessons', label: 'Lessons', icon: 'school' },
  { id: 'listening', label: 'Listening', icon: 'headphones' },
  { id: 'speaking', label: 'Speaking', icon: 'record_voice_over' },
  { id: 'audio', label: 'Audio', icon: 'podcasts' },
  { id: 'stories', label: 'Stories', icon: 'auto_stories' },
];
const lessonsKey = 'mentor-ai:offline-lessons:v1';
const retentionKey = 'mentor-ai:offline-retention:v1';
const maxBytesKey = 'mentor-ai:offline-max-bytes:v1';
const legacySpeechCatalog = [
  { id: 'commute-listening', category: 'listening', title: 'Commute listening' },
  { id: 'shop-listening', category: 'listening', title: 'At a small shop' },
  { id: 'weekly-weak-spots-dialogue', category: 'speaking', title: 'Work conversation' },
  { id: 'polite-speaking', category: 'speaking', title: 'Polite requests' },
] as const;

export function readOfflineLessons(): OfflineLesson[] { return readJson(lessonsKey, []); }
export function readOfflineRetention(): Record<OfflineCategory, RetentionDays> {
  return { lessons: 30, listening: 30, speaking: 30, audio: 30, stories: 30, videos: 30, ...readJson(retentionKey, {}) };
}
export function readOfflineMaxBytes() { return readJson(maxBytesKey, defaultOfflineMaxBytes); }
export function saveOfflineMaxBytes(bytes: number) { localStorage.setItem(maxBytesKey, JSON.stringify(bytes)); }
export function saveOfflineRetention(category: OfflineCategory, days: RetentionDays) {
  localStorage.setItem(retentionKey, JSON.stringify({ ...readOfflineRetention(), [category]: days }));
}
export function registerOfflineSpeechLesson(input: { id: string; category: 'listening' | 'speaking'; title: string; speechTexts: string[] }) {
  upsert({ ...input, estimatedBytes: input.speechTexts.join('').length * 48 });
}
export function registerOfflineStory(story: LibraryStory) {
  upsert({ id: story.id, category: 'stories', title: story.title, estimatedBytes: story.sizeBytes, story });
}
export function registerOfflineAudio(audio: LibraryAudio) {
  upsert({ id: audio.id, category: 'audio', title: audio.title, estimatedBytes: audio.sizeBytes, audio });
}
export async function registerOfflineGeneratedLesson(lesson: GeneratedLesson, speechTexts: string[]) {
  const db = await getMentorDb();
  await db.put('lessons', lesson);
  upsert({
    id: lesson.id,
    category: 'lessons',
    title: lesson.title,
    sourceCreatedAt: lesson.createdAt,
    speechTexts,
    contentBytes: JSON.stringify(lesson).length * 2,
    contentVersion: getOfflineLessonContentVersion(lesson),
    estimatedBytes: JSON.stringify(lesson).length * 2,
  });
}
export function getOfflineLessonContentVersion(lesson: GeneratedLesson) {
  const value = JSON.stringify(lesson);
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}
export async function findOfflineLesson(context: LearningContext): Promise<GeneratedLesson | null> {
  const db = await getMentorDb();
  const lessons = (await db.getAll('lessons')) as GeneratedLesson[];
  const match = selectOfflineLesson(lessons, context);
  if (match) markOfflineLessonOpened(match.id, 'lessons');
  return match;
}
export function selectOfflineLesson(lessons: GeneratedLesson[], context: LearningContext): GeneratedLesson | null {
  const matchesMode = (lesson: GeneratedLesson) => context.mode === 'listening'
    ? lesson.exercises.some((exercise) => exercise.targetSkill === 'listening' || exercise.type === 'listening-text')
    : context.mode === 'speaking'
      ? lesson.exercises.some((exercise) => exercise.targetSkill === 'speaking' || exercise.type === 'repeat-speaking' || exercise.type === 'dialogue-translation')
      : true;
  return lessons
    .filter((lesson) => (
      (!context.lessonTemplateKey || lesson.lessonTemplateKey === context.lessonTemplateKey)
      && (!context.selectedConcept || lesson.concept === context.selectedConcept)
      && matchesMode(lesson)
    ))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
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
    estimatedBytes: lesson.speechTexts
      ? (lesson.contentBytes ?? 0) + await getSpeechBatchSize(lesson.speechTexts)
      : lesson.estimatedBytes,
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
  if (lesson.story) await deleteOfflineStory(lesson.story);
  if (lesson.audio) await deleteOfflineAudio(lesson.audio);
  if (lesson.category === 'lessons') await (await getMentorDb()).delete('lessons', lesson.id);
  saveLessons(readOfflineLessons().filter((item) => !(item.id === lesson.id && item.category === lesson.category)));
}
export async function clearOfflineCategory(category: OfflineCategory) {
  for (const lesson of readOfflineLessons().filter((item) => item.category === category)) await removeOfflineLesson(lesson);
}
export function selectExpiredOfflineLessons(lessons: OfflineLesson[], retention: Record<OfflineCategory, RetentionDays>, now = Date.now()) {
  return lessons.filter((lesson) => {
    const added = Date.parse(lesson.sourceCreatedAt || lesson.lastOpenedAt || lesson.downloadedAt);
    const mandatory = lesson.sourceCreatedAt && now - Date.parse(lesson.sourceCreatedAt) < mandatoryOfflineDays * 86_400_000;
    return !mandatory && Number.isFinite(added) && now - added >= retention[lesson.category] * 86_400_000;
  });
}
export function selectOfflineLessonsOverLimit(lessons: OfflineLesson[], maxBytes: number, now = Date.now()) {
  let total = lessons.reduce((sum, lesson) => sum + Math.max(0, lesson.estimatedBytes), 0);
  if (total <= maxBytes) return [];
  const removable = lessons.filter((lesson) => !lesson.sourceCreatedAt
    || now - Date.parse(lesson.sourceCreatedAt) >= mandatoryOfflineDays * 86_400_000)
    .sort((left, right) => Date.parse(left.downloadedAt) - Date.parse(right.downloadedAt));
  const selected: OfflineLesson[] = [];
  for (const lesson of removable) {
    if (total <= maxBytes) break;
    selected.push(lesson);
    total -= Math.max(0, lesson.estimatedBytes);
  }
  return selected;
}
export function selectStaleOfflineStories(lessons: OfflineLesson[], activeStoryIds: ReadonlySet<string>) {
  return lessons.filter((lesson) => lesson.category === 'stories' && !activeStoryIds.has(lesson.id));
}
export function selectStaleOfflineAudio(lessons: OfflineLesson[], activeAudioIds: ReadonlySet<string>) {
  return lessons.filter((lesson) => lesson.category === 'audio' && !activeAudioIds.has(lesson.id));
}
export async function cleanupExpiredOfflineLessons(now = Date.now()) {
  await purgeLegacyVideoLibrary();
  const expired = selectExpiredOfflineLessons(readOfflineLessons(), readOfflineRetention(), now);
  for (const lesson of expired) await removeOfflineLesson(lesson);
  const oversized = selectOfflineLessonsOverLimit(readOfflineLessons(), readOfflineMaxBytes(), now);
  for (const lesson of oversized) await removeOfflineLesson(lesson);
  return [...expired, ...oversized];
}
async function purgeLegacyVideoLibrary() {
  const legacyVideos = readOfflineLessons().filter((lesson) => lesson.category === 'videos');
  if (legacyVideos.length > 0) saveLessons(readOfflineLessons().filter((lesson) => lesson.category !== 'videos'));
  if ('caches' in globalThis) await caches.delete('mentor-ai-offline-videos-v1');
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
    return splitSpeechTextIntoSentences(text);
  });
}
function saveLessons(lessons: OfflineLesson[]) { localStorage.setItem(lessonsKey, JSON.stringify(lessons)); }
async function getMentorDb() { return (await import('./indexed-db.js')).mentorDb; }
function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
