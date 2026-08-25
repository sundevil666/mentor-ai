export type LibraryAudio = {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  articleUrl: string;
  level: string;
  durationSeconds: number;
  sizeBytes: number;
  publishedAt: string;
};

export const offlineAudioCacheName = 'mentor-ai-offline-audio-v1';

export const audioLibrary: LibraryAudio[] = [
  {
    id: 'voa-yellowstone-open-boat',
    title: 'Yellowstone and The Open Boat',
    description: 'Adverbs, Yellowstone National Park and the conclusion of a classic American story.',
    sourceUrl: 'https://voa-audio.voanews.eu/vle/2025/03/15/20250315-003003-vle122-program.mp3',
    articleUrl: 'https://learningenglish.voanews.com/a/7993156.html',
    level: 'A2–B1',
    durationSeconds: 1_800,
    sizeBytes: 14_376_586,
    publishedAt: '2025-03-15',
  },
  {
    id: 'voa-lincoln-national-parks',
    title: 'Lincoln and America’s National Parks',
    description: 'A historic home, the expression “watching grass grow,” Theodore Roosevelt and a grammar lesson.',
    sourceUrl: 'https://voa-audio.voanews.eu/vle/2025/03/17/20250317-003003-vle122-program.mp3',
    articleUrl: 'https://learningenglish.voanews.com/a/7994518.html',
    level: 'A2–B1',
    durationSeconds: 1_800,
    sizeBytes: 14_376_586,
    publishedAt: '2025-03-17',
  },
  {
    id: 'voa-flight-grand-canyon',
    title: 'First Flight and the Grand Canyon',
    description: 'The Wright brothers, useful aircraft words, the Grand Canyon and everyday vocabulary.',
    sourceUrl: 'https://voa-audio.voanews.eu/vle/2025/03/18/20250318-003003-vle122-program.mp3',
    articleUrl: 'https://learningenglish.voanews.com/a/7995925.html',
    level: 'A2–B1',
    durationSeconds: 1_800,
    sizeBytes: 14_376_586,
    publishedAt: '2025-03-18',
  },
];

export async function getCachedAudioUrls(): Promise<Set<string>> {
  if (!('caches' in window)) return new Set();
  const cache = await caches.open(offlineAudioCacheName);
  const keys = await cache.keys();
  return new Set(keys.map((request) => request.url));
}

export async function saveAudioOffline(audio: LibraryAudio): Promise<void> {
  if (!('caches' in window)) throw new Error('Offline audio storage is not supported on this device.');
  const cache = await caches.open(offlineAudioCacheName);
  const response = await fetch(audio.sourceUrl, { mode: 'cors', cache: 'no-store' });
  if (!response.ok) throw new Error(`Audio download failed with HTTP ${response.status}.`);
  await cache.put(audio.sourceUrl, response);
  if (!(await cache.match(audio.sourceUrl, { ignoreVary: true }))) {
    throw new Error('The downloaded audio was not saved by this device.');
  }
}

export async function deleteOfflineAudio(audio: LibraryAudio): Promise<void> {
  if (!('caches' in window)) return;
  const cache = await caches.open(offlineAudioCacheName);
  await cache.delete(audio.sourceUrl, { ignoreVary: true });
}

export async function resolveAudioPlaybackUrl(audio: LibraryAudio): Promise<{ url: string; offline: boolean }> {
  if (!('caches' in window)) return { url: audio.sourceUrl, offline: false };
  const response = await (await caches.open(offlineAudioCacheName)).match(audio.sourceUrl, { ignoreVary: true });
  if (!response) return { url: audio.sourceUrl, offline: false };
  return { url: URL.createObjectURL(await response.blob()), offline: true };
}

export function formatAudioDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export function formatAudioSize(bytes: number) {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
