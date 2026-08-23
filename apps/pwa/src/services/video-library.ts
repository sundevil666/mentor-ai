export type LibraryVideo = {
  id: string;
  title: string;
  description: string;
  level: string;
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
    level: 'A2–B1',
    sourceLabel: 'W3C media archive · Blender Foundation',
    sourceUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    durationSeconds: 52,
    sizeBytes: 4_372_373,
  },
  {
    id: 'weekly-conversation-eldraen',
    title: 'A phone call with Eldraen',
    description: 'A short real-life American phone conversation. Listen for greetings, short answers and everyday rhythm.',
    level: 'A2–B1',
    sourceLabel: 'White House · Public domain via Wikimedia Commons',
    sourceUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/A_Weekly_Conversation_-_On_The_Line_With_Eldraen.webm',
    durationSeconds: 142,
    sizeBytes: 16_017_033,
  },
  {
    id: 'weekly-conversation-jocelyn',
    title: 'A phone call with Jocelyn',
    description: 'Natural American speech in a friendly conversation. Practise catching the topic without translating every word.',
    level: 'B1',
    sourceLabel: 'White House · Public domain via Wikimedia Commons',
    sourceUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/be/A_Weekly_Conversation-_On_the_Line_with_Jocelyn.webm',
    durationSeconds: 153,
    sizeBytes: 25_354_920,
  },
  {
    id: 'weekly-conversation-erica',
    title: 'A phone call with Erica',
    description: 'A longer unscripted exchange for practising names, key details and natural conversational pauses.',
    level: 'B1–B2',
    sourceLabel: 'White House · Public domain via Wikimedia Commons',
    sourceUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/A_Weekly_Conversation-_On_the_Line_with_Erica.webm',
    durationSeconds: 171,
    sizeBytes: 35_527_616,
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
