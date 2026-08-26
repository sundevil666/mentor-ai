export type LibraryStory = {
  id: string;
  title: string;
  description: string;
  level: 'A2' | 'A2–B1' | 'B1';
  author: string;
  reader: string;
  sourceLabel: string;
  sourcePageUrl: string;
  sourceUrl: string;
  durationSeconds: number;
  sizeBytes: number;
};

export const offlineStoryCacheName = 'mentor-ai-offline-stories-v1';

export const storyLibrary: LibraryStory[] = [
  {
    id: 'aladdin-and-the-magic-lamp',
    title: 'Aladdin and the Magic Lamp',
    description: 'A complete classic fairy tale about Aladdin, the lamp and the genie, told as one focused listening session.',
    level: 'A2–B1',
    author: 'Traditional',
    reader: 'Lucy Lo Faro',
    sourceLabel: 'LibriVox public-domain recording',
    sourcePageUrl: 'https://librivox.org/short-story-collection-vol-034/',
    sourceUrl: '/audio-stories/aladdin-and-the-magic-lamp.mp3',
    durationSeconds: 2_107,
    sizeBytes: 16_854_050,
  },
  {
    id: 'beauty-and-the-beast',
    title: 'Beauty and the Beast',
    description: 'The complete fairy tale in clear English, with recurring vocabulary about family, promises and character.',
    level: 'A2–B1',
    author: 'Traditional',
    reader: 'Bellona Times',
    sourceLabel: 'LibriVox public-domain recording',
    sourcePageUrl: 'https://librivox.org/childrens-short-works-vol-009/',
    sourceUrl: '/audio-stories/beauty-and-the-beast.mp3',
    durationSeconds: 2_147,
    sizeBytes: 17_180_082,
  },
  {
    id: 'the-30000-bequest-part-1',
    title: 'The $30,000 Bequest · Part 1 of 2',
    description: 'The first half of Mark Twain’s humorous story about a couple whose imagined fortune changes their lives.',
    level: 'B1',
    author: 'Mark Twain',
    reader: 'TriciaG',
    sourceLabel: 'LibriVox public-domain recording',
    sourcePageUrl: 'https://librivox.org/30000-bequest-and-other-stories-by-mark-twain/',
    sourceUrl: '/audio-stories/the-30000-bequest-part-1.mp3',
    durationSeconds: 2_138,
    sizeBytes: 17_101_287,
  },
  {
    id: 'the-30000-bequest-part-2',
    title: 'The $30,000 Bequest · Part 2 of 2',
    description: 'The concluding half of the same story, kept as a separate 37-minute listening session.',
    level: 'B1',
    author: 'Mark Twain',
    reader: 'TriciaG',
    sourceLabel: 'LibriVox public-domain recording',
    sourcePageUrl: 'https://librivox.org/30000-bequest-and-other-stories-by-mark-twain/',
    sourceUrl: '/audio-stories/the-30000-bequest-part-2.mp3',
    durationSeconds: 2_238,
    sizeBytes: 17_900_842,
  },
];

export async function getCachedStoryUrls(): Promise<Set<string>> {
  if (!('caches' in globalThis)) return new Set();
  const cache = await caches.open(offlineStoryCacheName);
  return new Set((await cache.keys()).map((request) => request.url));
}

export async function saveStoryOffline(story: LibraryStory): Promise<void> {
  if (!('caches' in globalThis)) throw new Error('Offline audio storage is not supported on this device.');
  const cache = await caches.open(offlineStoryCacheName);
  const response = await fetch(story.sourceUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Audio download failed with HTTP ${response.status}.`);
  await cache.put(story.sourceUrl, response);
  if (!(await cache.match(story.sourceUrl, { ignoreVary: true }))) throw new Error('The audio was not saved by this device.');
}

export async function deleteOfflineStory(story: LibraryStory): Promise<void> {
  if (!('caches' in globalThis)) return;
  await (await caches.open(offlineStoryCacheName)).delete(story.sourceUrl, { ignoreVary: true });
}

export function formatStoryDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function formatStorySize(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
