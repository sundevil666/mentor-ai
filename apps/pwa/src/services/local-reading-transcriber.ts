type LocalTranscriberOptions = {
  onTranscript: (text: string) => void;
  onDebug?: (message: string) => void;
  onReady: () => void;
  onProgress: (message: string) => void;
  onError: (message: string) => void;
  chunkDurationMs?: number;
};

export type LocalReadingTranscriber = { stop: () => void };
export type NormalizedReadingAudio = { audio: Float32Array; rms: number; peak: number; gain: number; usable: boolean };

let sharedWorker: Worker | null = null;
let sharedWorkerInitializing = false;
let sharedWorkerReady = false;
let sharedRequestId = 0;

// A persistent AudioWorklet avoids repeatedly constructing MediaRecorder and
// AudioContext instances. Small, non-overlapping PCM batches keep the marker
// moving while silence is discarded before it reaches Whisper.
export const localReadingChunkDurationMs = 1_200;

export function prepareLocalSpeechTranscriber(): void {
  if (sharedWorkerReady || sharedWorkerInitializing) return;
  const worker = sharedWorker ??= new Worker(new URL('../workers/reading-transcription.worker.ts', import.meta.url), { type: 'module' });
  sharedWorkerInitializing = true;
  worker.onmessage = (event: MessageEvent<{ type: string }>) => {
    if (event.data.type === 'ready') {
      sharedWorkerReady = true;
      sharedWorkerInitializing = false;
    }
    if (event.data.type === 'error') {
      sharedWorkerInitializing = false;
      sharedWorkerReady = false;
      sharedWorker = null;
      worker.terminate();
    }
  };
  worker.postMessage({ type: 'init' });
}

export function startLocalReadingTranscriber(stream: MediaStream, options: LocalTranscriberOptions): LocalReadingTranscriber {
  const worker = sharedWorker ??= new Worker(new URL('../workers/reading-transcription.worker.ts', import.meta.url), { type: 'module' });
  let context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: AudioWorkletNode | null = null;
  let silentOutput: GainNode | null = null;
  let timer = 0;
  let stopped = false;
  let pcmChunks: Float32Array[] = [];
  let pcmSampleCount = 0;
  const firstSessionRequestId = sharedRequestId + 1;
  options.onDebug?.(sharedWorkerReady ? 'Reusing ready offline speech model.' : sharedWorkerInitializing ? 'Waiting for offline speech model already loading.' : 'Creating offline transcription worker.');

  worker.onmessage = (event: MessageEvent<{ type: string; id?: number; text?: string; progress?: number; message?: string }>) => {
    if (event.data.type === 'ready') {
      sharedWorkerReady = true;
      sharedWorkerInitializing = false;
    }
    if (event.data.type === 'error' && event.data.id === undefined) {
      sharedWorkerInitializing = false;
      sharedWorkerReady = false;
      sharedWorker = null;
      worker.terminate();
    }
    if (event.data.id !== undefined && event.data.id < firstSessionRequestId) return;
    if (event.data.type === 'debug' && event.data.message) options.onDebug?.(event.data.message);
    if (event.data.type === 'result') {
      options.onDebug?.(`Worker result #${event.data.id ?? '?'}: ${event.data.text ? 'text received' : 'empty text'}.`);
      if (event.data.text) options.onTranscript(event.data.text);
    }
    // A result from the final partial chunk is intentionally delivered after
    // Pause. Other lifecycle callbacks must not restart or alter the session.
    if (stopped) return;
    if (event.data.type === 'ready') {
      options.onReady();
      void startCapture().catch((error) => options.onError(error instanceof Error ? error.message : String(error)));
    }
    if (event.data.type === 'progress') {
      const progress = Number.isFinite(event.data.progress) ? ` ${Math.round(event.data.progress ?? 0)}%` : '';
      options.onProgress(`Loading speech model${progress}`);
    }
    if (event.data.type === 'error') {
      options.onError(event.data.message ?? 'Offline speech recognition failed.');
    }
  };
  if (sharedWorkerReady) {
    queueMicrotask(() => {
      if (stopped) return;
      options.onReady();
      void startCapture().catch((error) => options.onError(error instanceof Error ? error.message : String(error)));
    });
  } else if (!sharedWorkerInitializing) {
    sharedWorkerInitializing = true;
    options.onDebug?.('Initializing offline speech model.');
    worker.postMessage({ type: 'init' });
  }

  const flushPcm = () => {
    if (stopped || !pcmSampleCount) return;
    const captured = joinPcmChunks(pcmChunks, pcmSampleCount);
    pcmChunks = [];
    pcmSampleCount = 0;
    if (!context) return;
    const normalized = normalizeReadingAudio(resampleReadingAudio(captured, context.sampleRate, 16_000));
    const id = ++sharedRequestId;
    options.onDebug?.(`PCM batch #${id} (${(normalized.audio.length / 16_000).toFixed(2)}s); RMS=${normalized.rms.toFixed(4)}, peak=${normalized.peak.toFixed(3)}, gain=${normalized.gain.toFixed(1)}x.`);
    if (!normalized.usable) {
      options.onDebug?.(`PCM batch #${id} is quiet; skipped before Whisper.`);
      return;
    }
    options.onDebug?.(`Sending speech batch #${id} to worker.`);
    worker.postMessage({ id, audio: normalized.audio }, [normalized.audio.buffer]);
  };

  let captureStarted = false;
  const startCapture = async () => {
    if (captureStarted || stopped || !stream.active) return;
    captureStarted = true;
    context = new AudioContext();
    if (!context.audioWorklet) throw new Error('AudioWorklet is unavailable.');
    await context.audioWorklet.addModule('/reading-audio-processor.js');
    if (stopped) return;
    source = context.createMediaStreamSource(stream);
    processor = new AudioWorkletNode(context, 'reading-audio-processor');
    silentOutput = context.createGain();
    silentOutput.gain.value = 0;
    processor.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (stopped || !(event.data instanceof Float32Array)) return;
      pcmChunks.push(event.data);
      pcmSampleCount += event.data.length;
    };
    source.connect(processor).connect(silentOutput).connect(context.destination);
    if (context.state === 'suspended') await context.resume();
    const chunkDurationMs = options.chunkDurationMs ?? localReadingChunkDurationMs;
    options.onDebug?.(`Continuous PCM capture ready; checking speech every ${(chunkDurationMs / 1_000).toFixed(1)}s.`);
    timer = window.setInterval(flushPcm, chunkDurationMs);
  };
  return {
    stop() {
      stopped = true;
      window.clearInterval(timer);
      processor && (processor.port.onmessage = null);
      processor?.disconnect();
      source?.disconnect();
      silentOutput?.disconnect();
      void context?.close();
      context = null;
      pcmChunks = [];
      pcmSampleCount = 0;
      // Keep the worker and its model alive between Pause/Start taps. Loading
      // Whisper is the slow part on iPad; destroying it here made every retry
      // begin the same long model initialization again.
    },
  };
}

export function resampleReadingAudio(input: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  if (!input.length || sourceRate <= 0 || targetRate <= 0) return new Float32Array();
  if (sourceRate === targetRate) return input.slice();
  const output = new Float32Array(Math.max(1, Math.floor(input.length * targetRate / sourceRate)));
  const ratio = sourceRate / targetRate;
  for (let index = 0; index < output.length; index += 1) {
    const position = index * ratio;
    const left = Math.floor(position);
    const right = Math.min(input.length - 1, left + 1);
    const fraction = position - left;
    output[index] = (input[left] ?? 0) * (1 - fraction) + (input[right] ?? 0) * fraction;
  }
  return output;
}

function joinPcmChunks(chunks: readonly Float32Array[], sampleCount: number): Float32Array {
  const output = new Float32Array(sampleCount);
  let offset = 0;
  chunks.forEach((chunk) => { output.set(chunk, offset); offset += chunk.length; });
  return output;
}

export function normalizeReadingAudio(input: Float32Array): NormalizedReadingAudio {
  if (!input.length) return { audio: input, rms: 0, peak: 0, gain: 1, usable: false };
  let sumSquares = 0;
  let peak = 0;
  for (const sample of input) {
    sumSquares += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  const rms = Math.sqrt(sumSquares / input.length);
  if (rms < 0.002 || peak < 0.008) return { audio: input, rms, peak, gain: 1, usable: false };
  const gain = Math.max(1, Math.min(12, 0.12 / rms, 0.95 / peak));
  if (gain <= 1.05) return { audio: input, rms, peak, gain: 1, usable: true };
  const audio = new Float32Array(input.length);
  for (let index = 0; index < input.length; index += 1) audio[index] = (input[index] ?? 0) * gain;
  return { audio, rms, peak, gain, usable: true };
}
