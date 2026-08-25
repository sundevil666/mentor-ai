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
}

let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let activeRequestId = 0;
let modelStatus: SpeechModelStatus = 'idle';
let modelProgress = 0;
const statusListeners = new Set<() => void>();
const generatedSpeechCache = new Map<string, Promise<Blob>>();

export function isSpeechSynthesisAvailable() {
  return (
    typeof window !== 'undefined' &&
    'Audio' in window &&
    'fetch' in window
  );
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
  return generation;
}

async function generateAndCacheSpeech(segments: SpeechSegment[]) {
  const cacheRequest = await createSpeechCacheRequest(segments);

  if (cacheRequest && 'caches' in window) {
    const cachedResponse = await (await caches.open(SPEECH_CACHE_NAME)).match(cacheRequest);
    if (cachedResponse) {
      setModelStatus('ready', 100);
      return cachedResponse.blob();
    }
  }

  setModelStatus('generating', 0);
  const response = await fetch('/api/speech', {
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
      new Response(audio, { headers: { 'Content-Type': 'audio/mpeg' } }),
    );
  }

  setModelStatus('ready', 100);
  return audio;
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
