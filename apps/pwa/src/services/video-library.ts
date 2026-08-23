export type LibraryVideo = {
  id: string;
  title: string;
  description: string;
  captionUrl: string;
  level: string;
  sourceLabel: string;
  sourceUrl: string;
  durationSeconds: number;
  sizeBytes: number;
};

export const offlineVideoCacheName = 'mentor-ai-offline-videos-v1';

export const videoLibrary: LibraryVideo[] = [
  {
    id: 'english-networking-dinner',
    title: 'English Networking Dinner',
    description: 'Clear news-style narration about conversations and community connections in Okinawa.',
    captionUrl: '/subtitles/english-networking-dinner.en.vtt',
    level: 'A2–B1',
    sourceLabel: 'U.S. Marine Corps · Public domain via Wikimedia Commons',
    sourceUrl: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/87/English_Networking_Dinner_%281018406%29.webm/English_Networking_Dinner_%281018406%29.webm.360p.mpeg4.mov',
    durationSeconds: 30,
    sizeBytes: 4_274_153,
  },
  {
    id: 'leaders-links',
    title: 'What Do You Want to Be Remembered For?',
    description: 'Natural reflective speech about reputation, leadership and the impression we leave on others.',
    captionUrl: '/subtitles/leaders-links.en.vtt',
    level: 'B1–B2',
    sourceLabel: 'U.S. Army · Public domain via Wikimedia Commons',
    sourceUrl: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/d/d8/Leaders_Links_-_DrillSergeantFitness_%28990648%29.webm/Leaders_Links_-_DrillSergeantFitness_%28990648%29.webm.480p.vp9.webm',
    durationSeconds: 60,
    sizeBytes: 7_776_489,
  },
  {
    id: 'pacific-spotlight',
    title: 'A Pharmacy Technician at Work',
    description: 'A short self-introduction using practical workplace vocabulary and conversational American English.',
    captionUrl: '/subtitles/pacific-spotlight.en.vtt',
    level: 'A2–B1',
    sourceLabel: 'U.S. Air Force · Public domain via Wikimedia Commons',
    sourceUrl: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/9/95/Pacific_Spotlight_-_SrA_Malik_Hardy-No_Graphics_%281004531%29.webm/Pacific_Spotlight_-_SrA_Malik_Hardy-No_Graphics_%281004531%29.webm.480p.vp9.webm',
    durationSeconds: 30,
    sizeBytes: 3_194_948,
  },
  {
    id: 'opsec-spot',
    title: 'Think Before You Share',
    description: 'Clear instructional English about information, social media and everyday responsibility.',
    captionUrl: '/subtitles/opsec-spot.en.vtt',
    level: 'B1',
    sourceLabel: 'U.S. Air Force · Public domain via Wikimedia Commons',
    sourceUrl: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b2/OPSEC_Spot_%28720p%29_%28998832%29.webm/OPSEC_Spot_%28720p%29_%28998832%29.webm.480p.vp9.webm',
    durationSeconds: 30,
    sizeBytes: 3_160_183,
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
  const response = await fetch(video.sourceUrl, { mode: 'cors', cache: 'no-store' });
  if (!response.ok) throw new Error(`Video download failed with HTTP ${response.status}.`);
  await cache.put(video.sourceUrl, response);
  if (!(await cache.match(video.sourceUrl, { ignoreVary: true }))) {
    throw new Error('The downloaded video was not saved by this device.');
  }
}

export async function deleteOfflineVideo(video: LibraryVideo): Promise<void> {
  if (!('caches' in window)) return;
  const cache = await caches.open(offlineVideoCacheName);
  await cache.delete(video.sourceUrl, { ignoreVary: true });
}

export function formatVideoDuration(totalSeconds: number): string {
  const roundedSeconds = Math.round(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatVideoSize(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
