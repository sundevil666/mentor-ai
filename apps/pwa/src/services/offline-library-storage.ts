import type { GeneratedLesson } from '@mentor-ai/shared';
import type { LibraryAudio } from './audio-library.js';
import type { LibraryStory } from './story-library.js';

export type OfflineCategory = 'lessons' | 'listening' | 'speaking' | 'audio' | 'stories' | 'videos';

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
  generatedLesson?: GeneratedLesson;
  story?: LibraryStory;
  audio?: LibraryAudio;
  sourceCreatedAt?: string;
  contentKey?: string;
}

export const offlineLessonsStorageKey = 'mentor-ai:offline-lessons:v1';

export function readOfflineLessons(): OfflineLesson[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const value = localStorage.getItem(offlineLessonsStorageKey);
    return value ? JSON.parse(value) as OfflineLesson[] : [];
  } catch {
    return [];
  }
}
