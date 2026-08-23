import type { GeneratedLesson, LearningContext } from '@mentor-ai/shared';
import { fetchOfflineLessons } from './api-client.js';
import {
  cleanupExpiredOfflineLessons,
  getOfflineLessonContentVersion,
  readOfflineLessons,
  registerOfflineVideo,
  registerOfflineSpeechLesson,
  removeOfflineLesson,
  refreshOfflineSizes,
  registerOfflineGeneratedLesson,
} from './offline-library.js';
import { isSpeechBatchCached, preloadSpeechBatch } from './speech-synthesis.js';
import { getCachedVideoUrls, saveVideoOffline, videoLibrary } from './video-library.js';

export type OfflineLessonUpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';
export interface OfflineLessonUpdateState {
  status: OfflineLessonUpdateStatus;
  completed: number;
  total: number;
  lastCheckedAt: string | null;
}

const listeners = new Set<(state: OfflineLessonUpdateState) => void>();
let state: OfflineLessonUpdateState = { status: 'idle', completed: 0, total: 0, lastCheckedAt: null };
export interface OfflineLessonUpdateResult {
  downloaded: number;
  downloadedLessons: number;
  downloadedVideos: number;
  current: boolean;
  eventId: string;
}
let activeUpdate: Promise<OfflineLessonUpdateResult> | null = null;
const builtInOfflineLessons = [
  { id: 'commute-listening', category: 'listening', title: 'Commute listening' },
  { id: 'shop-listening', category: 'listening', title: 'At a small shop' },
  { id: 'weekly-weak-spots-dialogue', category: 'speaking', title: 'Work conversation' },
  { id: 'polite-speaking', category: 'speaking', title: 'Polite requests' },
] as const;

export function getOfflineLessonUpdateState() { return state; }
export function subscribeOfflineLessonUpdates(listener: (state: OfflineLessonUpdateState) => void) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function updateOfflineLessons(
  loadLesson: (context: LearningContext, createdAt: string) => Promise<GeneratedLesson>,
): Promise<OfflineLessonUpdateResult> {
  if (activeUpdate) return activeUpdate;
  activeUpdate = performUpdate(loadLesson).finally(() => { activeUpdate = null; });
  return activeUpdate;
}

async function performUpdate(loadLesson: (context: LearningContext, createdAt: string) => Promise<GeneratedLesson>) {
  const eventId = new Date().toISOString();
  setState({ status: 'checking', completed: 0, total: 0 });
  try {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const videosDownloaded = await updateVideos();
    const builtInDownloaded = await updateBuiltInLessons(loadLesson);
    let privateLessonsAvailable = true;
    const lessons = await fetchOfflineLessons(since).catch(() => {
      privateLessonsAvailable = false;
      return [];
    });
    const savedLessons = readOfflineLessons().filter((item) => item.category === 'lessons');
    const activeIds = new Set(lessons.map((lesson) => lesson.id));
    const removed = privateLessonsAvailable
      ? savedLessons.filter((item) => item.sourceCreatedAt && item.sourceCreatedAt >= since && !activeIds.has(item.id))
      : [];
    for (const lesson of removed) await removeOfflineLesson(lesson);
    const savedVersions = new Map(readOfflineLessons().filter((item) => item.category === 'lessons')
      .map((item) => [item.id, item.contentVersion]));
    const pending = lessons.filter((lesson) => savedVersions.get(lesson.id) !== getOfflineLessonContentVersion(lesson));
    if (pending.length === 0) {
      await cleanupExpiredOfflineLessons();
      setState({ status: 'ready', completed: lessons.length, total: lessons.length, lastCheckedAt: new Date().toISOString() });
      return {
        downloaded: builtInDownloaded + videosDownloaded,
        downloadedLessons: builtInDownloaded,
        downloadedVideos: videosDownloaded,
        current: builtInDownloaded + videosDownloaded === 0,
        eventId,
      };
    }

    setState({ status: 'downloading', completed: 0, total: pending.length });
    let completed = 0;
    for (const lesson of prioritizeNewest(pending)) {
      const speechTexts = getSpeechTexts(lesson);
      const result = speechTexts.length ? await preloadSpeechBatch(speechTexts) : { failed: 0 };
      if (result.failed > 0) throw new Error(`Could not download ${lesson.title}.`);
      await registerOfflineGeneratedLesson(lesson, speechTexts);
      completed += 1;
      setState({ status: 'downloading', completed, total: pending.length });
    }
    await refreshOfflineSizes();
    await cleanupExpiredOfflineLessons();
    setState({ status: 'ready', completed: lessons.length, total: lessons.length, lastCheckedAt: new Date().toISOString() });
    return {
      downloaded: completed + builtInDownloaded + videosDownloaded,
      downloadedLessons: completed + builtInDownloaded,
      downloadedVideos: videosDownloaded,
      current: false,
      eventId,
    };
  } catch (error) {
    setState({ status: 'error', lastCheckedAt: new Date().toISOString() });
    throw error;
  }
}

async function updateVideos() {
  const cachedUrls = await getCachedVideoUrls();
  const pending = videoLibrary.filter((video) => !cachedUrls.has(video.sourceUrl));
  let completed = 0;
  let failed = 0;
  for (const video of pending) {
    setState({ status: 'downloading', completed, total: pending.length });
    try {
      await saveVideoOffline(video);
      registerOfflineVideo(video);
      completed += 1;
    } catch {
      failed += 1;
    }
    setState({ status: 'downloading', completed, total: pending.length });
  }
  for (const video of videoLibrary.filter((item) => cachedUrls.has(item.sourceUrl))) registerOfflineVideo(video);
  if (failed > 0) throw new Error(`${failed} video${failed === 1 ? '' : 's'} could not be saved offline.`);
  return completed;
}

async function updateBuiltInLessons(
  loadLesson: (context: LearningContext, createdAt: string) => Promise<GeneratedLesson>,
) {
  let downloaded = 0;
  for (const item of builtInOfflineLessons) {
    const lesson = await loadLesson({
      mode: item.category,
      selectedConcept: 'learning',
      manualConceptChoice: true,
      lessonTemplateKey: item.id,
      isOffline: false,
      speechAvailable: true,
      availableMinutes: 10,
    }, new Date().toISOString());
    const texts = getSpeechTexts(lesson);
    if (texts.length === 0 || await isSpeechBatchCached(texts)) {
      if (texts.length > 0) registerOfflineSpeechLesson({ ...item, speechTexts: texts });
      continue;
    }
    const result = await preloadSpeechBatch(texts);
    if (result.failed > 0) throw new Error(`Could not download ${item.title}.`);
    registerOfflineSpeechLesson({ ...item, speechTexts: texts });
    downloaded += 1;
  }
  return downloaded;
}

function setState(update: Partial<OfflineLessonUpdateState>) {
  state = { ...state, ...update };
  listeners.forEach((listener) => listener(state));
}

function prioritizeNewest(lessons: GeneratedLesson[]) {
  const mandatoryCutoff = Date.now() - 7 * 86_400_000;
  return [...lessons].sort((left, right) => {
    const leftMandatory = Date.parse(left.createdAt) >= mandatoryCutoff ? 1 : 0;
    const rightMandatory = Date.parse(right.createdAt) >= mandatoryCutoff ? 1 : 0;
    return rightMandatory - leftMandatory || right.createdAt.localeCompare(left.createdAt);
  });
}

function getSpeechTexts(lesson: GeneratedLesson) {
  return lesson.exercises.flatMap((exercise) => {
    const text = exercise.audioText?.trim();
    if (!text) return [];
    return text.match(/[^.!?]+[.!?]+(?:[”'"]+)?|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  });
}
