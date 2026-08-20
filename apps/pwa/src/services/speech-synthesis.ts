const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOICE_ID = 'af_heart' as const;

type KokoroInstance = Awaited<ReturnType<typeof import('kokoro-js').KokoroTTS.from_pretrained>>;

export type SpeechModelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface SpeechPlaybackHandlers {
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  mediaTitle?: string;
}

let modelPromise: Promise<KokoroInstance> | null = null;
let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let activeRequestId = 0;
let modelStatus: SpeechModelStatus = 'idle';
let modelProgress = 0;
const statusListeners = new Set<() => void>();

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
    modelPromise = import('kokoro-js')
      .then(({ KokoroTTS }) =>
        KokoroTTS.from_pretrained(MODEL_ID, {
          dtype: 'q8',
          device: 'wasm',
          progress_callback: (progress) => {
            if (progress.status === 'progress' && typeof progress.progress === 'number') {
              setModelStatus('loading', Math.round(progress.progress));
            }
          },
        }),
      )
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
    const model = await prepareSpeechModel();
    const generated = await model.generate(trimmedText, { voice: VOICE_ID, speed: 1 });

    if (requestId !== activeRequestId) {
      return false;
    }

    const audioUrl = URL.createObjectURL(
      createWaveBlob(new Float32Array(generated.audio), generated.sampling_rate),
    );
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
    return true;
  } catch (error) {
    if (requestId === activeRequestId) {
      stopActiveAudio();
      handlers.onError?.(toError(error));
    }
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
    const normalized = Math.max(-1, Math.min(1, sample));
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
}

function setModelStatus(status: SpeechModelStatus, progress: number) {
  modelStatus = status;
  modelProgress = progress;
  statusListeners.forEach((listener) => listener());
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error('Could not generate speech.');
}
