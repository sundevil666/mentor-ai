import { sortMaterialsNewestFirst } from './material-order.js';

export type LibraryStory = {
  id: string;
  addedAt: string;
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

export function getStoryContentVersion(story: LibraryStory) {
  const value = JSON.stringify([story.sourceUrl, story.durationSeconds, story.sizeBytes, story.reader]);
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

const storyCatalog: LibraryStory[] = [
  ...([
    ['peter-breaks-through', 'Peter Breaks Through', 'peterpan_01_barrie_64kb.mp3', 1_249, 10_002_327],
    ['the-shadow', 'The Shadow', 'peterpan_02_barrie_64kb.mp3', 1_250, 10_011_939],
    ['come-away-come-away', 'Come Away, Come Away!', 'peterpan_03_barrie_64kb.mp3', 1_719, 13_764_375],
    ['the-flight', 'The Flight', 'peterpan_04_barrie_64kb.mp3', 1_167, 9_349_021],
    ['the-island-come-true', 'The Island Come True', 'peterpan_05_barrie_64kb.mp3', 1_526, 12_218_052],
    ['the-little-house', 'The Little House', 'peterpan_06_barrie_64kb.mp3', 1_106, 8_857_851],
    ['the-home-underground', 'The Home Underground', 'peterpan_07_barrie_64kb.mp3', 937, 7_504_614],
    ['the-mermaids-lagoon', 'The Mermaids’ Lagoon', 'peterpan_08_barrie_64kb.mp3', 1_685, 13_493_267],
    ['the-never-bird', 'The Never Bird', 'peterpan_09_barrie_64kb.mp3', 465, 3_726_035],
    ['the-happy-home', 'The Happy Home', 'peterpan_10_barrie_64kb.mp3', 846, 6_773_913],
    ['wendys-story', 'Wendy’s Story', 'peterpan_11_barrie_64kb.mp3', 1_025, 8_208_321],
    ['the-children-are-carried-off', 'The Children Are Carried Off', 'peterpan_12_barrie_64kb.mp3', 691, 5_538_250],
    ['do-you-believe-in-fairies', 'Do You Believe in Fairies?', 'peterpan_13_barrie_64kb.mp3', 1_190, 9_531_659],
    ['the-pirate-ship', 'The Pirate Ship', 'peterpan_14_barrie_64kb.mp3', 1_012, 8_106_237],
    ['hook-or-me-this-time', 'Hook or Me This Time', 'peterpan_15_barrie_64kb.mp3', 1_390, 11_132_577],
    ['the-return-home', 'The Return Home', 'peterpan_16_barrie_64kb.mp3', 1_229, 9_847_105],
    ['when-wendy-grew-up', 'When Wendy Grew Up', 'peterpan_17_barrie_64kb.mp3', 1_458, 11_680_436],
  ] as const).map(([slug, chapterTitle, filename, durationSeconds, sizeBytes], index): LibraryStory => ({
    id: `peter-pan-chapter-${String(index + 1).padStart(2, '0')}-${slug}`,
    addedAt: '2026-10-09T10:00:00.000Z',
    title: `Peter Pan · ${String(index + 1).padStart(2, '0')}/17 · ${chapterTitle}`,
    description: `Chapter ${index + 1} of the complete Peter Pan adventure, read throughout by one narrator for comfortable repeat listening.`,
    level: 'B1',
    author: 'J. M. Barrie',
    reader: 'Phil Chenevert',
    sourceLabel: 'LibriVox public-domain recording',
    sourcePageUrl: 'https://librivox.org/peter-pan-by-j-m-barrie-5/',
    sourceUrl: `https://archive.org/download/peterpan_2105_librivox/${filename}`,
    durationSeconds,
    sizeBytes,
  })),
  {
    id: 'aladdin-and-the-magic-lamp',
    addedAt: '2026-08-26T10:00:00.000Z',
    title: 'Aladdin and the Magic Lamp',
    description: 'A complete classic fairy tale about Aladdin, the lamp and the genie, told as one focused listening session.',
    level: 'A2–B1',
    author: 'Traditional',
    reader: 'Lucy Lo Faro',
    sourceLabel: 'LibriVox public-domain recording',
    sourcePageUrl: 'https://librivox.org/short-story-collection-vol-034/',
    sourceUrl: 'https://archive.org/download/short_story_034_0810_librivox/shortstory034_aladdinandthemagiclamp_llf_64kb.mp3',
    durationSeconds: 2_107,
    sizeBytes: 16_854_050,
  },
  {
    id: 'beauty-and-the-beast',
    addedAt: '2026-08-26T10:00:00.000Z',
    title: 'Beauty and the Beast',
    description: 'The complete fairy tale in clear English, with recurring vocabulary about family, promises and character.',
    level: 'A2–B1',
    author: 'Traditional',
    reader: 'Bellona Times',
    sourceLabel: 'LibriVox public-domain recording',
    sourcePageUrl: 'https://librivox.org/childrens-short-works-vol-009/',
    sourceUrl: 'https://archive.org/download/childrensshortworks09_1010_librivox/childrensshortworks009_beautybeast_bt_64kb.mp3',
    durationSeconds: 2_147,
    sizeBytes: 17_180_082,
  },
  {
    id: 'the-30000-bequest-part-1',
    addedAt: '2026-08-26T10:00:00.000Z',
    title: 'The $30,000 Bequest · Part 1 of 2',
    description: 'The first half of Mark Twain’s humorous story about a couple whose imagined fortune changes their lives.',
    level: 'B1',
    author: 'Mark Twain',
    reader: 'TriciaG',
    sourceLabel: 'LibriVox public-domain recording',
    sourcePageUrl: 'https://librivox.org/30000-bequest-and-other-stories-by-mark-twain/',
    sourceUrl: 'https://archive.org/download/30000_dollar_bequest_1002_librivox/30000bequestandotherstories_01_twain_64kb.mp3',
    durationSeconds: 2_138,
    sizeBytes: 17_101_287,
  },
  {
    id: 'the-30000-bequest-part-2',
    addedAt: '2026-08-26T10:00:00.000Z',
    title: 'The $30,000 Bequest · Part 2 of 2',
    description: 'The concluding half of the same story, kept as a separate 37-minute listening session.',
    level: 'B1',
    author: 'Mark Twain',
    reader: 'TriciaG',
    sourceLabel: 'LibriVox public-domain recording',
    sourcePageUrl: 'https://librivox.org/30000-bequest-and-other-stories-by-mark-twain/',
    sourceUrl: 'https://archive.org/download/30000_dollar_bequest_1002_librivox/30000bequestandotherstories_02_twain_64kb.mp3',
    durationSeconds: 2_238,
    sizeBytes: 17_900_842,
  },
];

export const storyLibrary = sortMaterialsNewestFirst(storyCatalog);

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
