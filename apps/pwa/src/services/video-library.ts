export type LibraryVideo = {
  id: string;
  title: string;
  description: string;
  sourceLabel: string;
  sourceUrl: string;
  durationSeconds: number;
  sizeBytes: number;
};

export const offlineVideoCacheName = 'mentor-ai-offline-videos-v1';

export const videoLibrary: LibraryVideo[] = [
  {
    id: 'sintel-trailer',
    title: 'Sintel — English trailer',
    description: 'A short animated story with natural English dialogue. Good for listening to emotion and intonation.',
    sourceLabel: 'W3C media archive · Blender Foundation',
    sourceUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    durationSeconds: 52,
    sizeBytes: 4_372_373,
  },
];

export async function getCachedVideoUrls(): Promise<Set<string>> {
  if (!('caches' in window)) return new Set();
  const cache = await caches.open(offlineVideoCacheName);
  const keys = await cache.keys();
  return new Set(keys.map((request) => request.url));
}

export async function saveVideoOffline(video: LibraryVideo): Promise<void> {
  if (!('caches' in window)) throw new Error('Offline video storage is not supported on this device.');
  const cache = await caches.open(offlineVideoCacheName);
  const response = await fetch(video.sourceUrl, { mode: 'no-cors', cache: 'no-store' });
  await cache.put(video.sourceUrl, response);
}

export async function deleteOfflineVideo(video: LibraryVideo): Promise<void> {
  if (!('caches' in window)) return;
  const cache = await caches.open(offlineVideoCacheName);
  await cache.delete(video.sourceUrl, { ignoreVary: true });
}

export function formatVideoDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatVideoSize(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
