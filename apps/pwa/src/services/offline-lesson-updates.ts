import type { GeneratedLesson, LearningContext } from '@mentor-ai/shared';
import { fetchOfflineLessons } from './api-client.js';
import {
  cleanupExpiredOfflineLessons,
  getOfflineLessonContentVersion,
  getSpeechTextsContentVersion,
  readOfflineLessons,
  registerOfflineStory,
  registerOfflineAudio,
  selectStaleOfflineAudio,
  selectStaleOfflineStories,
  replaceOfflineSpeechLesson,
  removeOfflineLesson,
  refreshOfflineSizes,
  registerOfflineGeneratedLesson,
} from './offline-library.js';
import { isSpeechBatchCached, preloadSpeechBatch } from './speech-synthesis.js';
import { getCachedStoryUrls, saveStoryOffline, storyLibrary } from './story-library.js';
import { audioLibrary, getCachedAudioUrls, saveAudioOffline } from './audio-library.js';

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
  downloadedStories: number;
  downloadedAudio: number;
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
    const storiesDownloaded = await updateStories();
    const audioDownloaded = await updateAudio();
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
        downloaded: builtInDownloaded + storiesDownloaded + audioDownloaded,
        downloadedLessons: builtInDownloaded,
        downloadedStories: storiesDownloaded,
        downloadedAudio: audioDownloaded,
        current: builtInDownloaded + storiesDownloaded + audioDownloaded === 0,
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
      downloaded: completed + builtInDownloaded + storiesDownloaded + audioDownloaded,
      downloadedLessons: completed + builtInDownloaded,
      downloadedStories: storiesDownloaded,
      downloadedAudio: audioDownloaded,
      current: false,
      eventId,
    };
  } catch (error) {
    setState({ status: 'error', lastCheckedAt: new Date().toISOString() });
    throw error;
  }
}

async function updateAudio() {
  const activeAudioIds = new Set(audioLibrary.map((audio) => audio.id));
  for (const audio of selectStaleOfflineAudio(readOfflineLessons(), activeAudioIds)) {
    await removeOfflineLesson(audio);
  }

  const cachedUrls = await getCachedAudioUrls();
  const pending = audioLibrary.filter((audio) => !cachedUrls.has(audio.sourceUrl));
  let completed = 0;
  let failed = 0;
  for (const audio of pending) {
    setState({ status: 'downloading', completed, total: pending.length });
    try {
      await saveAudioOffline(audio);
      registerOfflineAudio(audio);
      completed += 1;
    } catch {
      failed += 1;
    }
    setState({ status: 'downloading', completed, total: pending.length });
  }
  for (const audio of audioLibrary.filter((item) => cachedUrls.has(item.sourceUrl))) {
    registerOfflineAudio(audio);
  }
  if (failed > 0) throw new Error(`${failed} audio program${failed === 1 ? '' : 's'} could not be saved offline.`);
  return completed;
}

async function updateStories() {
  const activeStoryIds = new Set(storyLibrary.map((story) => story.id));
  const staleStories = selectStaleOfflineStories(readOfflineLessons(), activeStoryIds);
  for (const story of staleStories) await removeOfflineLesson(story);

  const cachedUrls = await getCachedStoryUrls();
  const pending = storyLibrary.filter((story) => !cachedUrls.has(new URL(story.sourceUrl, window.location.origin).href));
  let completed = 0;
  let failed = 0;
  for (const story of pending) {
    setState({ status: 'downloading', completed, total: pending.length });
    try {
      await saveStoryOffline(story);
      registerOfflineStory(story);
      completed += 1;
    } catch {
      failed += 1;
    }
    setState({ status: 'downloading', completed, total: pending.length });
  }
  for (const story of storyLibrary.filter((item) => cachedUrls.has(new URL(item.sourceUrl, window.location.origin).href))) registerOfflineStory(story);
  if (failed > 0) throw new Error(`${failed} audio ${failed === 1 ? 'story' : 'stories'} could not be saved offline.`);
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
    const saved = readOfflineLessons().find((lesson) => lesson.id === item.id && lesson.category === item.category);
    const currentVersion = getSpeechTextsContentVersion(texts);
    if (texts.length === 0 || (saved?.contentVersion === currentVersion && await isSpeechBatchCached(texts))) {
      continue;
    }
    if (!(await isSpeechBatchCached(texts))) {
      const result = await preloadSpeechBatch(texts);
      if (result.failed > 0) throw new Error(`Could not download ${item.title}.`);
    }
    await replaceOfflineSpeechLesson({ ...item, speechTexts: texts });
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
