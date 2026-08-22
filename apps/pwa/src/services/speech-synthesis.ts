const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOICE_ID = 'af_heart' as const;

type KokoroInstance = Awaited<ReturnType<typeof import('kokoro-js').KokoroTTS.from_pretrained>>;

export type SpeechModelStatus = 'idle' | 'loading' | 'generating' | 'playing' | 'ready' | 'error';

type GeneratedSpeech = {
  audio: Blob;
};

const SPEECH_CACHE_NAME = 'mentor-ai-speech-q8-v1';

export interface SpeechPlaybackHandlers {
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  mediaTitle?: string;
}

let modelPromise: Promise<KokoroInstance> | null = null;
let modelUsesWebGpu = false;
let forceWasmUntilReload = false;
let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let activeRequestId = 0;
let modelStatus: SpeechModelStatus = 'idle';
let modelProgress = 0;
const statusListeners = new Set<() => void>();
const generatedSpeechCache = new Map<string, Promise<GeneratedSpeech>>();

export function isSpeechSynthesisAvailable() {
  return typeof window !== 'undefined' && 'Audio' in window && 'WebAssembly' in window;
}

export function getSpeechModelStatus() {
  return { status: modelStatus, progress: modelProgress } as const;
}

export function subscribeToSpeechModelStatus(listener: () => void) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export async function prepareSpeechModel() {
  if (!isSpeechSynthesisAvailable()) {
    throw new Error('Neural speech is not supported by this browser.');
  }

  if (!modelPromise) {
    setModelStatus('loading', 0);
    const useWebGpu = 'gpu' in navigator && !forceWasmUntilReload;
    modelPromise = import('kokoro-js')
      .then(async ({ KokoroTTS }) => {
        const progressCallback: Parameters<typeof KokoroTTS.from_pretrained>[1] = {
          progress_callback: (progress) => {
            if (progress.status === 'progress' && typeof progress.progress === 'number') {
              setModelStatus('loading', Math.round(progress.progress));
            }
          },
        };

        if (useWebGpu) {
          try {
            const model = await KokoroTTS.from_pretrained(MODEL_ID, {
              ...progressCallback,
              dtype: 'q8',
              device: 'webgpu',
            });
            modelUsesWebGpu = true;
            return model;
          } catch {
            forceWasmUntilReload = true;
            setModelStatus('loading', 0);
          }
        }

        const model = await KokoroTTS.from_pretrained(MODEL_ID, {
          ...progressCallback,
          dtype: 'q8',
          device: 'wasm',
        });
        modelUsesWebGpu = false;
        return model;
      })
      .then((model) => {
        setModelStatus('ready', 100);
        return model;
      })
      .catch((error: unknown) => {
        modelPromise = null;
        setModelStatus('error', 0);
        throw toError(error);
      });
  }

  return modelPromise;
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
    const generated = await generateSpeech(trimmedText);

    if (requestId !== activeRequestId) {
      return false;
    }

    const audioUrl = URL.createObjectURL(generated.audio);
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    audio.onended = () => {
      if (activeAudio !== audio) {
        return;
      }

      clearActiveAudio();
      handlers.onEnd?.();
    };
    audio.onerror = () => {
      if (activeAudio !== audio) {
        return;
      }

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
      handlers.onError?.(toError(error));
    }
    return false;
  }
}

export async function preloadSpeech(text: string) {
  const trimmedText = text.trim();

  if (!trimmedText || !isSpeechSynthesisAvailable()) {
    return false;
  }

  try {
    await generateSpeech(trimmedText);
    return true;
  } catch {
    return false;
  }
}

export async function pauseSpeech() {
  activeAudio?.pause();
}

export async function resumeSpeech() {
  if (!activeAudio) {
    return false;
  }

  await activeAudio.play();
  return true;
}

export function stopSpeech() {
  activeRequestId += 1;
  stopActiveAudio();
}

function createWaveBlob(samples: Float32Array, sampleRate: number) {
  const bytesPerSample = 2;
  const peak = samples.reduce((maximum, sample) => Math.max(maximum, Math.abs(sample)), 0);
  const gain = peak > 0.95 ? 0.95 / peak : 1;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, samples.length * bytesPerSample, true);

  samples.forEach((sample, index) => {
    const normalized = Math.max(-1, Math.min(1, sample * gain));
    view.setInt16(
      44 + index * bytesPerSample,
      normalized < 0 ? normalized * 0x8000 : normalized * 0x7fff,
      true,
    );
  });

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, value: string) {
  Array.from(value).forEach((character, index) => {
    view.setUint8(offset + index, character.charCodeAt(0));
  });
}

function configureMediaSession(audio: HTMLAudioElement, title: string) {
  if (!('mediaSession' in navigator)) {
    return;
  }

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
  if (!('mediaSession' in navigator) || !Number.isFinite(audio.duration) || audio.duration <= 0) {
    return;
  }

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

  if (modelStatus === 'playing') {
    setModelStatus('ready', 100);
  }
}

function generateSpeech(text: string) {
  const cached = generatedSpeechCache.get(text);

  if (cached) {
    return cached;
  }

  const generation = generateAndCacheSpeech(text)
    .catch((error: unknown) => {
      generatedSpeechCache.delete(text);
      setModelStatus('error', 0);
      throw toError(error);
    });

  generatedSpeechCache.set(text, generation);
  return generation;
}

async function generateAndCacheSpeech(text: string): Promise<GeneratedSpeech> {
  const cacheRequest = await createSpeechCacheRequest(text);

  if (cacheRequest && 'caches' in window) {
    const cachedResponse = await (await caches.open(SPEECH_CACHE_NAME)).match(cacheRequest);

    if (cachedResponse) {
      setModelStatus('ready', 100);
      return { audio: await cachedResponse.blob() };
    }
  }

  return prepareSpeechModel()
    .then(async (model) => {
      setModelStatus('generating', 100);
      const generated = await generateWithBackendFallback(model, text);
      const audio = createWaveBlob(new Float32Array(generated.audio), generated.sampling_rate);

      if (cacheRequest && 'caches' in window) {
        await (await caches.open(SPEECH_CACHE_NAME)).put(
          cacheRequest,
          new Response(audio, { headers: { 'Content-Type': 'audio/wav' } }),
        );
      }

      setModelStatus('ready', 100);
      return { audio };
    });
}

async function generateWithBackendFallback(model: KokoroInstance, text: string) {
  try {
    return await model.generate(text, { voice: VOICE_ID, speed: 1 });
  } catch (error) {
    if (!modelUsesWebGpu) {
      throw error;
    }

    forceWasmUntilReload = true;
    modelUsesWebGpu = false;
    modelPromise = null;
    setModelStatus('loading', 0);
    const fallbackModel = await prepareSpeechModel();
    setModelStatus('generating', 100);
    return fallbackModel.generate(text, { voice: VOICE_ID, speed: 1 });
  }
}

async function createSpeechCacheRequest(text: string) {
  if (!('crypto' in window) || !crypto.subtle) {
    return null;
  }

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return new Request(`${window.location.origin}/__speech-cache/${hash}`);
}

function setModelStatus(status: SpeechModelStatus, progress: number) {
  modelStatus = status;
  modelProgress = progress;
  statusListeners.forEach((listener) => listener());
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error('Could not generate speech.');
}
