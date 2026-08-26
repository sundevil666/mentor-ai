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
    id: 'johnny-and-his-sand-box',
    title: 'Johnny and His Sand Box',
    description: 'A warm, short story with clear everyday vocabulary about a child, play and imagination.',
    level: 'A2',
    author: 'Laura E. Richards',
    reader: 'mbm0rxi',
    sourceLabel: 'LibriVox public-domain recording',
    sourcePageUrl: 'https://librivox.org/three-minute-stories-by-laura-e-richards/',
    sourceUrl: '/audio-stories/johnny-and-his-sand-box.mp3',
    durationSeconds: 290,
    sizeBytes: 2_321_920,
  },
  {
    id: 'the-new-leaves',
    title: 'The New Leaves',
    description: 'A gentle nature story for practising descriptions, seasons and simple past-tense narration.',
    level: 'A2',
    author: 'Laura E. Richards',
    reader: 'Catherine Russell',
    sourceLabel: 'LibriVox public-domain recording',
    sourcePageUrl: 'https://librivox.org/three-minute-stories-by-laura-e-richards/',
    sourceUrl: '/audio-stories/the-new-leaves.mp3',
    durationSeconds: 220,
    sizeBytes: 1_758_208,
  },
  {
    id: 'the-boastful-donkey',
    title: 'The Boastful Donkey',
    description: 'A compact animal fable with a clear plot and useful language for character and consequences.',
    level: 'A2–B1',
    author: 'Laura E. Richards',
    reader: 'Claudia Salto',
    sourceLabel: 'LibriVox public-domain recording',
    sourcePageUrl: 'https://librivox.org/three-minute-stories-by-laura-e-richards/',
    sourceUrl: '/audio-stories/the-boastful-donkey.mp3',
    durationSeconds: 229,
    sizeBytes: 1_832_448,
  },
  {
    id: 'the-grateful-crane',
    title: 'The Grateful Crane',
    description: 'A traditional-style tale about kindness and gratitude, narrated in short, manageable English.',
    level: 'B1',
    author: 'Adapted by Laura E. Richards',
    reader: 'Krista',
    sourceLabel: 'LibriVox public-domain recording',
    sourcePageUrl: 'https://librivox.org/three-minute-stories-by-laura-e-richards/',
    sourceUrl: '/audio-stories/the-grateful-crane.mp3',
    durationSeconds: 190,
    sizeBytes: 1_519_616,
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
