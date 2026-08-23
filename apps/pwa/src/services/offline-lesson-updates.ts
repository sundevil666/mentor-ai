import type { GeneratedLesson } from '@mentor-ai/shared';
import { fetchOfflineLessons } from './api-client.js';
import {
  cleanupExpiredOfflineLessons,
  getOfflineLessonContentVersion,
  readOfflineLessons,
  removeOfflineLesson,
  refreshOfflineSizes,
  registerOfflineGeneratedLesson,
} from './offline-library.js';
import { preloadSpeechBatch } from './speech-synthesis.js';

export type OfflineLessonUpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';
export interface OfflineLessonUpdateState {
  status: OfflineLessonUpdateStatus;
  completed: number;
  total: number;
  lastCheckedAt: string | null;
}

const listeners = new Set<(state: OfflineLessonUpdateState) => void>();
let state: OfflineLessonUpdateState = { status: 'idle', completed: 0, total: 0, lastCheckedAt: null };
let activeUpdate: Promise<{ downloaded: number; current: boolean }> | null = null;

export function getOfflineLessonUpdateState() { return state; }
export function subscribeOfflineLessonUpdates(listener: (state: OfflineLessonUpdateState) => void) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function updateOfflineLessons(): Promise<{ downloaded: number; current: boolean }> {
  if (activeUpdate) return activeUpdate;
  activeUpdate = performUpdate().finally(() => { activeUpdate = null; });
  return activeUpdate;
}

async function performUpdate() {
  setState({ status: 'checking', completed: 0, total: 0 });
  try {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const lessons = await fetchOfflineLessons(since);
    const savedLessons = readOfflineLessons().filter((item) => item.category === 'lessons');
    const activeIds = new Set(lessons.map((lesson) => lesson.id));
    const removed = savedLessons.filter((item) => item.sourceCreatedAt && item.sourceCreatedAt >= since && !activeIds.has(item.id));
    for (const lesson of removed) await removeOfflineLesson(lesson);
    const savedVersions = new Map(readOfflineLessons().filter((item) => item.category === 'lessons')
      .map((item) => [item.id, item.contentVersion]));
    const pending = lessons.filter((lesson) => savedVersions.get(lesson.id) !== getOfflineLessonContentVersion(lesson));
    if (pending.length === 0) {
      await cleanupExpiredOfflineLessons();
      setState({ status: 'ready', completed: lessons.length, total: lessons.length, lastCheckedAt: new Date().toISOString() });
      return { downloaded: 0, current: true };
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
    return { downloaded: completed, current: false };
  } catch (error) {
    setState({ status: 'error', lastCheckedAt: new Date().toISOString() });
    throw error;
  }
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
