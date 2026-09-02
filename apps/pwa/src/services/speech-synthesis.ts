export const SPEECH_CACHE_NAME = 'mentor-ai-speech-dialogue-v2';

export type SpeechVoiceProfile = 'mia' | 'tom';

export interface SpeechSegment {
  text: string;
  voice: SpeechVoiceProfile;
}

export type SpeechModelStatus = 'idle' | 'loading' | 'generating' | 'playing' | 'ready' | 'error';

export interface SpeechPlaybackHandlers {
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  mediaTitle?: string;
  voice?: SpeechVoiceProfile;
  repeat?: boolean;
  temporary?: boolean;
}

export interface SystemSpeechHandlers {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

export const speechCacheMaxEntries = 160;
export const speechCacheMaxAgeMs = 30 * 86_400_000;
export const speechMemoryMaxEntries = 12;
const speechApiBaseUrl = resolveSpeechApiBaseUrl(
  process.env.API_BASE_URL,
  Boolean(process.env.DEV),
);

let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let activeRequestId = 0;
let modelStatus: SpeechModelStatus = 'idle';
let modelProgress = 0;
const statusListeners = new Set<() => void>();
const generatedSpeechCache = new Map<string, Promise<Blob>>();
let lastSpeechCacheCleanupAt = 0;
let activeSystemSpeechCleanup: ((completed: boolean, notifyError?: boolean) => void) | null = null;

export function isSpeechSynthesisAvailable() {
  return (
    typeof window !== 'undefined' &&
    'Audio' in window &&
    'fetch' in window
  );
}

export function resolveSpeechApiBaseUrl(
  configuredBaseUrl: string | undefined,
  isDevelopment: boolean,
): string {
  return configuredBaseUrl ?? (isDevelopment ? 'http://localhost:4000' : '');
}

export function speakWithSystemVoice(text: string, handlers: SystemSpeechHandlers = {}) {
  const trimmedText = text.trim();
  if (!trimmedText || typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return false;
  if (activeSystemSpeechCleanup) {
    activeSystemSpeechCleanup(false, false);
    window.speechSynthesis.cancel();
  }
  const utterance = new SpeechSynthesisUtterance(trimmedText);
  utterance.lang = 'en-US';
  utterance.rate = 0.88;
  utterance.voice = selectEnglishSystemVoice(window.speechSynthesis.getVoices());
  let settled = false;
  const finish = (completed: boolean, notifyError = true) => {
    if (settled) return;
    settled = true;
    if (activeSystemSpeechCleanup === finish) activeSystemSpeechCleanup = null;
    if (completed) handlers.onEnd?.();
    else if (notifyError) handlers.onError?.();
  };
  activeSystemSpeechCleanup = finish;
  utterance.onstart = () => handlers.onStart?.();
  utterance.onend = () => finish(true);
  utterance.onerror = () => finish(false);
  window.speechSynthesis.resume();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function selectEnglishSystemVoice(voices: readonly SpeechSynthesisVoice[]) {
  return voices.find((voice) => voice.lang.toLowerCase() === 'en-us' && /samantha|ava|allison|serena|karen/i.test(voice.name))
    ?? voices.find((voice) => voice.lang.toLowerCase() === 'en-us')
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en'))
    ?? null;
}

export function getSpeechModelStatus() {
  return { status: modelStatus, progress: modelProgress } as const;
}

export function subscribeToSpeechModelStatus(listener: () => void) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export async function speakWithPreferredVoice(
  text: string,
  handlers: SpeechPlaybackHandlers = {},
) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return false;
  }

  const requestId = activeRequestId + 1;
  activeRequestId = requestId;
  stopActiveAudio();

  try {
    const voice = handlers.voice ?? 'mia';
    const generated = await generateSpeech(trimmedText, voice);

    if (handlers.temporary) {
      await deleteGeneratedSpeech(trimmedText, voice);
    }

    if (requestId !== activeRequestId) {
      return false;
    }

    const audioUrl = URL.createObjectURL(generated);
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    applySpeechRepeat(audio, handlers.repeat);
    audio.onended = () => {
      if (activeAudio !== audio) return;
      clearActiveAudio();
      handlers.onEnd?.();
    };
    audio.onerror = () => {
      if (activeAudio !== audio) return;
      clearActiveAudio();
      handlers.onError?.(new Error('Could not play generated speech.'));
    };
    audio.ontimeupdate = () => {
      handlers.onTimeUpdate?.(audio.currentTime, audio.duration);
      updateMediaPosition(audio);
    };
    activeAudio = audio;
    activeAudioUrl = audioUrl;
    configureMediaSession(audio, handlers.mediaTitle ?? 'Mentor AI listening');
    await audio.play();
    setModelStatus('playing', 100);
    return true;
  } catch (error) {
    if (requestId === activeRequestId) {
      stopActiveAudio();
      setModelStatus('error', 0);
      handlers.onError?.(toError(error));
    }
    return false;
  }
}

export async function preloadSpeech(text: string) {
  const trimmedText = text.trim();

  if (!trimmedText || !isSpeechSynthesisAvailable()) return false;

  try {
    await generateSpeech(trimmedText);
    return true;
  } catch {
    setModelStatus('error', 0);
    return false;
  }
}

export async function getSpeechAudioBlob(
  text: string,
  voice: SpeechVoiceProfile = 'mia',
) {
  const trimmedText = text.trim();
  if (!trimmedText) throw new Error('Speech text is required.');
  return generateSpeech(trimmedText, voice);
}

export function applySpeechRepeat(audio: Pick<HTMLAudioElement, 'loop'>, repeat = false) {
  audio.loop = repeat;
}

export function setActiveSpeechRepeat(repeat: boolean) {
  if (activeAudio) applySpeechRepeat(activeAudio, repeat);
}

export function hasActiveSpeechPlayback() {
  return Boolean(activeAudio && !activeAudio.paused);
}

export async function preloadSpeechBatch(
  texts: string[],
  onProgress?: (completed: number, total: number) => void,
) {
  const uniqueTexts = Array.from(new Set(texts.map((text) => text.trim()).filter(Boolean)));
  const total = uniqueTexts.length;

  if (total === 0 || !isSpeechSynthesisAvailable()) {
    return { completed: 0, failed: total, total } as const;
  }

  let nextIndex = 0;
  let completed = 0;
  let failed = 0;
  const workerCount = Math.min(3, total);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < total) {
        const text = uniqueTexts[nextIndex];
        nextIndex += 1;

        if (!text || !(await preloadSpeech(text))) {
          failed += 1;
        }

        completed += 1;
        onProgress?.(completed, total);
      }
    }),
  );

  return { completed, failed, total } as const;
}

export async function isSpeechBatchCached(texts: string[]) {
  const uniqueTexts = Array.from(new Set(texts.map((text) => text.trim()).filter(Boolean)));

  if (uniqueTexts.length === 0 || typeof window === 'undefined' || !('caches' in window)) {
    return false;
  }

  const cache = await caches.open(SPEECH_CACHE_NAME);
  const matches = await Promise.all(
    uniqueTexts.map(async (text) => {
      const request = await createSpeechCacheRequest(parseSpeechSegments(text));
      return request ? Boolean(await cache.match(request)) : false;
    }),
  );

  return matches.every(Boolean);
}

export async function getSpeechBatchSize(texts: string[]) {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;
  const cache = await caches.open(SPEECH_CACHE_NAME);
  let total = 0;
  for (const text of uniqueSpeechTexts(texts)) {
    const request = await createSpeechCacheRequest(parseSpeechSegments(text));
    const response = request ? await cache.match(request) : undefined;
    if (response) total += (await response.clone().blob()).size;
  }
  return total;
}

export async function deleteSpeechBatch(texts: string[]) {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  const cache = await caches.open(SPEECH_CACHE_NAME);
  await Promise.all(uniqueSpeechTexts(texts).map(async (text) => {
    const request = await createSpeechCacheRequest(parseSpeechSegments(text));
    if (request) await cache.delete(request);
  }));
}

function uniqueSpeechTexts(texts: string[]) {
  return Array.from(new Set(texts.map((text) => text.trim()).filter(Boolean)));
}

export async function pauseSpeech() {
  activeAudio?.pause();
}

export async function resumeSpeech() {
  if (activeAudio) {
    await activeAudio.play();
    return true;
  }

  return false;
}

export function stopSpeech() {
  activeRequestId += 1;
  stopActiveAudio();
}

function generateSpeech(text: string, voice: SpeechVoiceProfile = 'mia') {
  const segments = parseSpeechSegments(text, voice);
  const key = JSON.stringify(segments);
  const cached = generatedSpeechCache.get(key);
  if (cached) return cached;

  const generation = generateAndCacheSpeech(segments).catch((error: unknown) => {
    generatedSpeechCache.delete(key);
    throw toError(error);
  });
  generatedSpeechCache.set(key, generation);
  trimGeneratedSpeechMemoryCache();
  return generation;
}

async function generateAndCacheSpeech(segments: SpeechSegment[]) {
  await cleanupSpeechCache();
  const cacheRequest = await createSpeechCacheRequest(segments);

  if (cacheRequest && 'caches' in window) {
    const cachedResponse = await (await caches.open(SPEECH_CACHE_NAME)).match(cacheRequest);
    if (cachedResponse) {
      setModelStatus('ready', 100);
      return cachedResponse.blob();
    }
  }

  setModelStatus('generating', 0);
  const response = await fetch(`${speechApiBaseUrl}/api/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ segments }),
  });

  if (!response.ok) {
    throw new Error('The online voice is temporarily unavailable.');
  }

  const audio = await response.blob();
  if (!audio.size) throw new Error('The speech service returned empty audio.');

  if (cacheRequest && 'caches' in window) {
    await (await caches.open(SPEECH_CACHE_NAME)).put(
      cacheRequest,
      new Response(audio, { headers: {
        'Content-Type': 'audio/mpeg',
        'X-Mentor-Cache-Created-At': new Date().toISOString(),
      } }),
    );
  }

  setModelStatus('ready', 100);
  return audio;
}

export async function deleteGeneratedSpeech(text: string, voice: SpeechVoiceProfile = 'mia') {
  const segments = parseSpeechSegments(text.trim(), voice);
  generatedSpeechCache.delete(JSON.stringify(segments));
  if (typeof window === 'undefined' || !('caches' in window)) return;
  const request = await createSpeechCacheRequest(segments);
  if (request) await (await caches.open(SPEECH_CACHE_NAME)).delete(request);
}

export function selectSpeechCacheUrlsToDelete(
  entries: Array<{ url: string; createdAt?: string }>,
  now = Date.now(),
) {
  const fresh = entries.filter((entry) => {
    const createdAt = Date.parse(entry.createdAt ?? '');
    return Number.isFinite(createdAt) && now - createdAt < speechCacheMaxAgeMs;
  });
  const retained = new Set(fresh.slice(-speechCacheMaxEntries).map((entry) => entry.url));
  return entries.filter((entry) => !retained.has(entry.url)).map((entry) => entry.url);
}

async function cleanupSpeechCache(now = Date.now()) {
  if (typeof window === 'undefined' || !('caches' in window) || now - lastSpeechCacheCleanupAt < 86_400_000) return;
  lastSpeechCacheCleanupAt = now;
  const cache = await caches.open(SPEECH_CACHE_NAME);
  const requests = await cache.keys();
  const entries = await Promise.all(requests.map(async (request) => ({
    url: request.url,
    createdAt: (await cache.match(request))?.headers.get('X-Mentor-Cache-Created-At') ?? undefined,
  })));
  const obsolete = new Set(selectSpeechCacheUrlsToDelete(entries, now));
  await Promise.all(requests.filter((request) => obsolete.has(request.url)).map((request) => cache.delete(request)));
}

function trimGeneratedSpeechMemoryCache() {
  while (generatedSpeechCache.size > speechMemoryMaxEntries) {
    const oldestKey = generatedSpeechCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    generatedSpeechCache.delete(oldestKey);
  }
}

async function createSpeechCacheRequest(segments: SpeechSegment[]) {
  if (!('crypto' in window) || !crypto.subtle) return null;
  const cacheValue = JSON.stringify(segments);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cacheValue));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return new Request(`${window.location.origin}/__speech-cache/${hash}`);
}

export function parseSpeechSegments(
  text: string,
  defaultVoice: SpeechVoiceProfile = 'mia',
): SpeechSegment[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 1) {
    const singleLineMatch = /^(Mia|Tom):\s*(.+)$/i.exec(lines[0] ?? '');

    if (singleLineMatch) {
      return [{
        text: singleLineMatch[2]!,
        voice: singleLineMatch[1]!.toLowerCase() === 'tom' ? 'tom' : 'mia',
      }];
    }

    return [{ text, voice: defaultVoice }];
  }

  const segments: SpeechSegment[] = [];
  for (const line of lines) {
    const match = /^(Mia|Tom):\s*(.+)$/i.exec(line);
    if (!match) return [{ text, voice: defaultVoice }];
    segments.push({
      text: match[2]!,
      voice: match[1]!.toLowerCase() === 'tom' ? 'tom' : 'mia',
    });
  }

  return segments;
}

export function splitSpeechTextIntoSentences(text: string): string[] {
  return text.split(/\r?\n/).flatMap((rawLine) => {
    const line = rawLine.trim();
    if (!line) return [];
    const speakerMatch = /^(Mia|Tom):\s*(.+)$/i.exec(line);
    const speaker = speakerMatch?.[1];
    const content = speakerMatch?.[2] ?? line;
    const sentences = content.match(/[^.!?]+[.!?]+(?:[”'"]+)?|[^.!?]+$/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? [];

    return speaker
      ? sentences.map((sentence) => `${speaker}: ${sentence}`)
      : sentences;
  });
}

export function preserveDialogueSpeakerLabels(text: string): string {
  if (!/(?:^|\n)\s*(?:Mia|Tom):/i.test(text)) return text;
  return splitSpeechTextIntoSentences(text).join('\n');
}

function configureMediaSession(audio: HTMLAudioElement, title: string) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist: 'Mentor AI',
    album: 'English practice',
  });
  navigator.mediaSession.setActionHandler('play', () => void audio.play());
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('stop', stopSpeech);
}

function updateMediaPosition(audio: HTMLAudioElement) {
  if (!('mediaSession' in navigator) || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
  navigator.mediaSession.setPositionState({
    duration: audio.duration,
    playbackRate: audio.playbackRate,
    position: Math.min(audio.currentTime, audio.duration),
  });
}

function stopActiveAudio() {
  if (activeAudio) {
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio.ontimeupdate = null;
    activeAudio.pause();
    activeAudio.removeAttribute('src');
    activeAudio.load();
  }
  clearActiveAudio();
}

function clearActiveAudio() {
  activeAudio = null;
  if (activeAudioUrl) {
    URL.revokeObjectURL(activeAudioUrl);
    activeAudioUrl = null;
  }
  if (modelStatus === 'playing') setModelStatus('ready', 100);
}

function setModelStatus(status: SpeechModelStatus, progress: number) {
  modelStatus = status;
  modelProgress = progress;
  statusListeners.forEach((listener) => listener());
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error('Could not generate speech.');
}
