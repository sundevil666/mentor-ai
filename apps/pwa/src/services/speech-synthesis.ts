const SPEECH_CACHE_NAME = 'mentor-ai-speech-dialogue-v1';

export type SpeechVoiceProfile = 'ava' | 'andrew';

export type SpeechModelStatus = 'idle' | 'loading' | 'generating' | 'playing' | 'ready' | 'error';

export interface SpeechPlaybackHandlers {
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  mediaTitle?: string;
  voice?: SpeechVoiceProfile;
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
    const voice = handlers.voice ?? 'ava';
    const generated = await generateSpeech(trimmedText, voice);

    if (requestId !== activeRequestId) {
      return false;
    }

    const audioUrl = URL.createObjectURL(generated);
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
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

function generateSpeech(text: string, voice: SpeechVoiceProfile = 'ava') {
  const key = `${voice}:${text}`;
  const cached = generatedSpeechCache.get(key);
  if (cached) return cached;

  const generation = generateAndCacheSpeech(text, voice).catch((error: unknown) => {
    generatedSpeechCache.delete(key);
    throw toError(error);
  });
  generatedSpeechCache.set(key, generation);
  return generation;
}

async function generateAndCacheSpeech(text: string, voice: SpeechVoiceProfile) {
  const cacheRequest = await createSpeechCacheRequest(text, voice);

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
    body: JSON.stringify({ text, voice }),
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

async function createSpeechCacheRequest(text: string, voice: SpeechVoiceProfile) {
  if (!('crypto' in window) || !crypto.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return new Request(`${window.location.origin}/__speech-cache/${voice}/${hash}`);
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
