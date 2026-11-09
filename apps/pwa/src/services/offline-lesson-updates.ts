import type { GeneratedLesson, LearningContext } from '@mentor-ai/shared';
import { fetchOfflineLessons } from './api-client.js';
import {
  cleanupExpiredOfflineLessons,
  builtInOfflineLessons,
  readOfflineGeneratedLessons,
  isGeneratedLessonAvailableOffline,
  getGeneratedLessonSpeechTexts,
  readOfflineLessons,
  registerOfflineStory,
  registerOfflineAudio,
  refreshOfflineSizes,
  registerOfflineGeneratedLesson,
} from './offline-library.js';
import { mergeAvailableLessonCatalog } from './lesson-category-progress.js';
import { isSpeechBatchCached, preloadSpeechBatch } from './speech-synthesis.js';
import { getCachedStoryUrls, getStoryContentVersion, saveStoryOffline, storyLibrary, type LibraryStory } from './story-library.js';
import { audioLibrary, getAudioContentVersion, getCachedAudioUrls, saveAudioOffline, type LibraryAudio } from './audio-library.js';

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
export const recentOfflineLessonDays = 30;
export type PendingOfflineMediaDownload =
  | { kind: 'story'; item: LibraryStory }
  | { kind: 'audio'; item: LibraryAudio };

export function getOfflineLessonUpdateState() { return state; }
export function subscribeOfflineLessonUpdates(listener: (state: OfflineLessonUpdateState) => void) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function prioritizeNewLessons(lessons: GeneratedLesson[]) {
  return [...lessons].sort((left, right) => {
    if (Boolean(left.doFirst) !== Boolean(right.doFirst)) return left.doFirst ? -1 : 1;
    const priorityDifference = (right.priority ?? 0) - (left.priority ?? 0);
    return priorityDifference || right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id);
  });
}

export function selectPendingBulkLessonDownloads(
  lessons: GeneratedLesson[],
  savedLessonIds: ReadonlySet<string>,
  completedLessonKeys: ReadonlySet<string> = new Set(),
) {
  return prioritizeNewLessons(lessons.filter((lesson) => (
    !savedLessonIds.has(lesson.id)
    && !completedLessonKeys.has(lesson.id)
    && !(lesson.lessonTemplateKey && completedLessonKeys.has(lesson.lessonTemplateKey))
  )));
}

const catalogCheckKey = 'mentor-ai:lesson-catalog-checked-at:v1';
const catalogCheckInterval = 24 * 60 * 60 * 1000;
export function createLessonCatalogRefresh(dependencies: {
  readLastChecked: () => number;
  writeLastChecked: (time: number) => void;
  fetchRemote: () => Promise<GeneratedLesson[]>;
  persist: (lessons: GeneratedLesson[]) => Promise<void>;
  isOnline: () => boolean;
  now: () => number;
}) {
  let request: Promise<GeneratedLesson[]> | null = null;
  return function refresh(): Promise<GeneratedLesson[]> {
    if (request) return request;
    if (!dependencies.isOnline()) return Promise.resolve([]);
    const lastChecked = dependencies.readLastChecked();
    if (lastChecked > 0 && dependencies.now() - lastChecked < catalogCheckInterval) return Promise.resolve([]);
    request = (async () => {
      const remote = await dependencies.fetchRemote();
      await dependencies.persist(remote);
      dependencies.writeLastChecked(dependencies.now());
      return remote;
    })().finally(() => { request = null; });
    return request;
  };
}

const refreshRemoteLessonCatalog = createLessonCatalogRefresh({
  readLastChecked: () => Number(localStorage.getItem(catalogCheckKey)),
  writeLastChecked: (time) => localStorage.setItem(catalogCheckKey, String(time)),
  fetchRemote: () => fetchOfflineLessons(new Date(0).toISOString()),
  isOnline: () => typeof navigator === 'undefined' || navigator.onLine,
  now: () => Date.now(),
  persist: async (lessons) => {
    // Persist catalog content without marking audio as downloaded.
    const { mentorDb } = await import('./indexed-db.js');
    const db = await mentorDb;
    const tx = db.transaction('lessons', 'readwrite');
    for (const lesson of lessons) await tx.store.put(lesson);
    await tx.done;
  },
});

export async function fetchNewLessonCatalog(
  fetchRemote: () => Promise<GeneratedLesson[]> = refreshRemoteLessonCatalog,
  readLocal: () => Promise<GeneratedLesson[]> = readOfflineGeneratedLessons,
) {
  const [remote, local] = await Promise.all([
    fetchRemote().catch(() => []),
    readLocal().catch(() => []),
  ]);
  return prioritizeNewLessons(mergeAvailableLessonCatalog(remote, local, null, []));
}

export function getRecentOfflineLessonSince(now = Date.now()) {
  return new Date(now - recentOfflineLessonDays * 86_400_000).toISOString();
}

export function selectPendingStoryDownloads(
  stories: LibraryStory[],
  cachedUrls: ReadonlySet<string>,
  savedVersions: ReadonlyMap<string, string | undefined>,
  origin: string,
  completedIds: ReadonlySet<string> = new Set(),
) {
  return stories.filter((story) => (
    !completedIds.has(story.id)
    && (
      !cachedUrls.has(new URL(story.sourceUrl, origin).href)
      || savedVersions.get(story.id) !== getStoryContentVersion(story)
    )
  ));
}

export function selectPendingAudioDownloads(
  audioPrograms: LibraryAudio[],
  cachedUrls: ReadonlySet<string>,
  savedVersions: ReadonlyMap<string, string | undefined>,
  completedIds: ReadonlySet<string> = new Set(),
) {
  return audioPrograms.filter((audio) => (
    !completedIds.has(audio.id)
    && (
      !cachedUrls.has(audio.sourceUrl)
      || savedVersions.get(audio.id) !== getAudioContentVersion(audio)
    )
  ));
}

export async function findPendingOfflineMediaDownloads(completedIds: ReadonlySet<string> = new Set()): Promise<PendingOfflineMediaDownload[]> {
  const saved = readOfflineLessons();
  const [cachedStoryUrls, cachedAudioUrls] = await Promise.all([
    getCachedStoryUrls(),
    getCachedAudioUrls(),
  ]);
  const storyVersions = new Map(saved.filter((item) => item.category === 'stories').map((item) => [item.id, item.contentVersion]));
  const audioVersions = new Map(saved.filter((item) => item.category === 'audio').map((item) => [item.id, item.contentVersion]));
  return [
    ...selectPendingStoryDownloads(storyLibrary, cachedStoryUrls, storyVersions, window.location.origin, completedIds)
      .map((item): PendingOfflineMediaDownload => ({ kind: 'story', item })),
    ...selectPendingAudioDownloads(audioLibrary, cachedAudioUrls, audioVersions, completedIds)
      .map((item): PendingOfflineMediaDownload => ({ kind: 'audio', item })),
  ];
}

export async function downloadOfflineMedia(item: PendingOfflineMediaDownload) {
  if (item.kind === 'story') {
    await saveStoryOffline(item.item);
    registerOfflineStory(item.item);
    return;
  }
  await saveAudioOffline(item.item);
  registerOfflineAudio(item.item);
}

export async function downloadGeneratedLessonOffline(lesson: GeneratedLesson) {
  const speechTexts = getSpeechTexts(lesson);
  const result = speechTexts.length ? await preloadSpeechBatch(speechTexts) : { failed: 0 };
  if (result.failed > 0) throw new Error(`Could not download the complete audio for ${lesson.title}.`);
  await registerOfflineGeneratedLesson(lesson, speechTexts);
  await refreshOfflineSizes();
}

export function updateOfflineLessons(
  loadLesson: (context: LearningContext, createdAt: string, forceRefresh?: boolean) => Promise<GeneratedLesson>,
): Promise<OfflineLessonUpdateResult> {
  if (activeUpdate) return activeUpdate;
  activeUpdate = performUpdate(loadLesson).finally(() => { activeUpdate = null; });
  return activeUpdate;
}

async function performUpdate(
  loadLesson: (context: LearningContext, createdAt: string, forceRefresh?: boolean) => Promise<GeneratedLesson>,
) {
  const eventId = new Date().toISOString();
  setState({ status: 'checking', completed: 0, total: 0 });
  try {
    await cleanupExpiredOfflineLessons();
    const storiesDownloaded = await updateStories(new Set());
    const audioDownloaded = await updateAudio(new Set());
    const builtInDownloaded = await updateBuiltInLessons(loadLesson);
    const lessons = await fetchNewLessonCatalog();
    const readiness = await Promise.all(lessons.map(async (lesson) => ({
      lesson, ready: await isGeneratedLessonAvailableOffline(lesson),
    })));
    const pending = readiness.filter((item) => !item.ready).map((item) => item.lesson);
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

async function updateAudio(completedIds: ReadonlySet<string>) {
  const cachedUrls = await getCachedAudioUrls();
  const saved = new Map(readOfflineLessons().filter((item) => item.category === 'audio').map((item) => [item.id, item]));
  const pending = selectPendingAudioDownloads(
    audioLibrary,
    cachedUrls,
    new Map([...saved].map(([id, item]) => [id, item.contentVersion])),
    completedIds,
  );
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
  const pendingIds = new Set(pending.map((audio) => audio.id));
  for (const audio of audioLibrary.filter((item) => cachedUrls.has(item.sourceUrl) && !pendingIds.has(item.id))) {
    registerOfflineAudio(audio);
  }
  if (failed > 0) throw new Error(`${failed} audio program${failed === 1 ? '' : 's'} could not be saved offline.`);
  return completed;
}

async function updateStories(completedIds: ReadonlySet<string>) {
  const cachedUrls = await getCachedStoryUrls();
  const saved = new Map(readOfflineLessons().filter((item) => item.category === 'stories').map((item) => [item.id, item]));
  const pending = selectPendingStoryDownloads(
    storyLibrary,
    cachedUrls,
    new Map([...saved].map(([id, item]) => [id, item.contentVersion])),
    window.location.origin,
    completedIds,
  );
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
  const pendingIds = new Set(pending.map((story) => story.id));
  for (const story of storyLibrary.filter((item) => (
    cachedUrls.has(new URL(item.sourceUrl, window.location.origin).href) && !pendingIds.has(item.id)
  ))) registerOfflineStory(story);
  if (failed > 0) throw new Error(`${failed} audio ${failed === 1 ? 'story' : 'stories'} could not be saved offline.`);
  return completed;
}

export async function updateBuiltInLessons(
  loadLesson: (context: LearningContext, createdAt: string, forceRefresh?: boolean) => Promise<GeneratedLesson>,
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
    }, new Date().toISOString(), true);
    const texts = getSpeechTexts(lesson);
    if (texts.length === 0 || await isGeneratedLessonAvailableOffline(lesson)) {
      continue;
    }
    if (!(await isSpeechBatchCached(texts))) {
      const result = await preloadSpeechBatch(texts);
      if (result.failed > 0) throw new Error(`Could not download ${item.title}.`);
    }
    await downloadGeneratedLessonOffline(lesson);
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
  return getGeneratedLessonSpeechTexts(lesson);
}
