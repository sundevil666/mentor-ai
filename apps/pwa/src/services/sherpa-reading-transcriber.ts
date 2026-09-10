import { resampleReadingAudio } from './local-reading-transcriber';

type SherpaReadingTranscriberOptions = {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onReady: () => void;
  onProgress: (message: string) => void;
  onError: (message: string) => void;
  onDebug?: (message: string) => void;
};

export type SherpaReadingTranscriber = { stop: () => void };

let sharedWorker: Worker | null = null;
let sharedWorkerReady = false;
let sharedWorkerIdleTimer: ReturnType<typeof setTimeout> | null = null;
let sessionCounter = 0;

export function startSherpaReadingTranscriber(stream: MediaStream, options: SherpaReadingTranscriberOptions): SherpaReadingTranscriber {
  if (sharedWorkerIdleTimer) clearTimeout(sharedWorkerIdleTimer);
  sharedWorkerIdleTimer = null;
  const worker = sharedWorker ??= new Worker('/sherpa-reader-worker.js');
  const sessionId = ++sessionCounter;
  let context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: AudioWorkletNode | null = null;
  let silentOutput: GainNode | null = null;
  let stopped = false;

  const startCapture = async () => {
    if (stopped || context || !stream.active) return;
    context = new AudioContext();
    await context.audioWorklet.addModule('/reading-audio-processor.js');
    if (stopped || !context) return;
    source = context.createMediaStreamSource(stream);
    processor = new AudioWorkletNode(context, 'reading-audio-processor');
    silentOutput = context.createGain();
    silentOutput.gain.value = 0;
    processor.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (stopped || !(event.data instanceof Float32Array) || !context) return;
      const audio = resampleReadingAudio(event.data, context.sampleRate, 16_000);
      worker.postMessage({ type: 'audio', sessionId, audio }, [audio.buffer]);
    };
    source.connect(processor).connect(silentOutput).connect(context.destination);
    if (context.state === 'suspended') await context.resume();
    worker.postMessage({ type: 'start', sessionId });
    options.onDebug?.('Sherpa streaming PCM capture ready.');
  };

  const handleMessage = (event: MessageEvent<{ type: string; sessionId?: number; text?: string; loaded?: number; total?: number; message?: string }>) => {
    if (stopped) return;
    if (event.data.type === 'ready') {
      sharedWorkerReady = true;
      options.onReady();
      void startCapture().catch((error) => options.onError(error instanceof Error ? error.message : String(error)));
      return;
    }
    if (event.data.type === 'progress') {
      const total = event.data.total ?? 0;
      const percent = total > 0 ? Math.round((event.data.loaded ?? 0) * 100 / total) : 0;
      options.onProgress(`Loading Sherpa speech model… ${percent}%`);
      return;
    }
    if (event.data.type === 'error') {
      options.onError(event.data.message ?? 'Sherpa speech recognition failed.');
      return;
    }
    if (event.data.sessionId !== sessionId) return;
    if (event.data.type === 'interim' && event.data.text) options.onInterim(event.data.text);
    if (event.data.type === 'final' && event.data.text) options.onFinal(event.data.text);
  };
  worker.onmessage = handleMessage;
  worker.onerror = (event) => {
    if (!stopped) options.onError(event.message || 'Sherpa speech worker failed.');
  };

  if (sharedWorkerReady) {
    queueMicrotask(() => {
      if (stopped) return;
      options.onReady();
      void startCapture().catch((error) => options.onError(error instanceof Error ? error.message : String(error)));
    });
  } else {
    options.onProgress('Loading Sherpa speech model… 0%');
  }

  return {
    stop() {
      stopped = true;
      worker.postMessage({ type: 'stop', sessionId });
      if (worker.onmessage === handleMessage) worker.onmessage = null;
      worker.onerror = null;
      processor && (processor.port.onmessage = null);
      processor?.disconnect();
      source?.disconnect();
      silentOutput?.disconnect();
      void context?.close();
      context = null;
      sharedWorkerIdleTimer = setTimeout(() => {
        if (sharedWorker !== worker) return;
        worker.terminate();
        sharedWorker = null;
        sharedWorkerReady = false;
        sharedWorkerIdleTimer = null;
      }, 60_000);
    },
  };
}

export function isSherpaReaderExperiment(): boolean {
  return true;
}
