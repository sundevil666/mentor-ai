const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOICE_ID = 'af_heart' as const;

type KokoroInstance = Awaited<ReturnType<typeof import('kokoro-js').KokoroTTS.from_pretrained>>;

export type SpeechModelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface SpeechPlaybackHandlers {
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

let modelPromise: Promise<KokoroInstance> | null = null;
let audioContext: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let activeRequestId = 0;
let modelStatus: SpeechModelStatus = 'idle';
let modelProgress = 0;
const statusListeners = new Set<() => void>();

export function isSpeechSynthesisAvailable() {
  return typeof window !== 'undefined' && 'AudioContext' in window && 'WebAssembly' in window;
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

  const context = getAudioContext();
  const requestId = activeRequestId + 1;
  activeRequestId = requestId;
  stopActiveSource();

  try {
    await context.resume();
    const model = await prepareSpeechModel();
    const generated = await model.generate(trimmedText, { voice: VOICE_ID, speed: 1 });

    if (requestId !== activeRequestId) {
      return false;
    }

    const buffer = context.createBuffer(1, generated.audio.length, generated.sampling_rate);
    buffer.copyToChannel(new Float32Array(generated.audio), 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => {
      if (activeSource !== source) {
        return;
      }

      activeSource = null;
      handlers.onEnd?.();
    };
    activeSource = source;
    source.start();
    return true;
  } catch (error) {
    if (requestId === activeRequestId) {
      handlers.onError?.(toError(error));
    }
    return false;
  }
}

export async function pauseSpeech() {
  if (audioContext?.state === 'running') {
    await audioContext.suspend();
  }
}

export async function resumeSpeech() {
  if (audioContext?.state === 'suspended') {
    await audioContext.resume();
    return true;
  }

  return activeSource !== null;
}

export function stopSpeech() {
  activeRequestId += 1;
  stopActiveSource();
}

function getAudioContext() {
  audioContext ??= new AudioContext();
  return audioContext;
}

function stopActiveSource() {
  if (!activeSource) {
    return;
  }

  const source = activeSource;
  activeSource = null;
  source.onended = null;
  source.stop();
  source.disconnect();
}

function setModelStatus(status: SpeechModelStatus, progress: number) {
  modelStatus = status;
  modelProgress = progress;
  statusListeners.forEach((listener) => listener());
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error('Could not generate speech.');
}
