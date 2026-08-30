type LocalTranscriberOptions = {
  onTranscript: (text: string) => void;
  onDebug?: (message: string) => void;
  onReady: () => void;
  onProgress: (message: string) => void;
  onError: (message: string) => void;
};

export type LocalReadingTranscriber = { stop: () => void };
export type NormalizedReadingAudio = { audio: Float32Array; rms: number; peak: number; gain: number; usable: boolean };

let sharedWorker: Worker | null = null;
let sharedWorkerInitializing = false;
let sharedWorkerReady = false;
let sharedRequestId = 0;

// Keep chunks long enough for the three-word matcher, but short enough for the
// reading marker to feel live. The worker applies its own backpressure so a
// slower iPad cannot build an ever-growing transcription queue.
const chunkDurationMs = 4_000;

export function startLocalReadingTranscriber(stream: MediaStream, options: LocalTranscriberOptions): LocalReadingTranscriber {
  const worker = sharedWorker ??= new Worker(new URL('../workers/reading-transcription.worker.ts', import.meta.url), { type: 'module' });
  let recorder: MediaRecorder | null = null;
  let timer = 0;
  let stopped = false;
  const firstSessionRequestId = sharedRequestId + 1;
  options.onDebug?.(sharedWorkerReady ? 'Reusing ready offline speech model.' : sharedWorkerInitializing ? 'Waiting for offline speech model already loading.' : 'Creating offline transcription worker.');

  worker.onmessage = (event: MessageEvent<{ type: string; id?: number; text?: string; progress?: number; message?: string }>) => {
    if (event.data.type === 'ready') {
      sharedWorkerReady = true;
      sharedWorkerInitializing = false;
    }
    if (stopped) return;
    if (event.data.id !== undefined && event.data.id < firstSessionRequestId) return;
    if (event.data.type === 'debug' && event.data.message) options.onDebug?.(event.data.message);
    if (event.data.type === 'result') {
      options.onDebug?.(`Worker result #${event.data.id ?? '?'}: ${event.data.text ? 'text received' : 'empty text'}.`);
      if (event.data.text) options.onTranscript(event.data.text);
    }
    if (event.data.type === 'ready') {
      options.onReady();
      recordChunk();
    }
    if (event.data.type === 'progress') {
      const progress = Number.isFinite(event.data.progress) ? ` ${Math.round(event.data.progress ?? 0)}%` : '';
      options.onProgress(`Loading speech model${progress}`);
    }
    if (event.data.type === 'error') {
      if (event.data.id === undefined) {
        sharedWorkerInitializing = false;
        sharedWorkerReady = false;
        sharedWorker = null;
        worker.terminate();
      }
      options.onError(event.data.message ?? 'Offline speech recognition failed.');
    }
  };
  if (sharedWorkerReady) {
    queueMicrotask(() => {
      if (stopped) return;
      options.onReady();
      recordChunk();
    });
  } else if (!sharedWorkerInitializing) {
    sharedWorkerInitializing = true;
    options.onDebug?.('Initializing offline speech model.');
    worker.postMessage({ type: 'init' });
  }

  const recordChunk = () => {
    if (stopped || !stream.active) return;
    const chunks: Blob[] = [];
    recorder = new MediaRecorder(stream);
    options.onDebug?.(`Recording ${(chunkDurationMs / 1_000).toFixed(1)}s audio chunk (${recorder.mimeType || 'default format'}).`);
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      if (!stopped && chunks.length) void decodeAudio(new Blob(chunks, { type: recorder?.mimeType })).then((decodedAudio) => {
        const id = ++sharedRequestId;
        const normalized = normalizeReadingAudio(decodedAudio);
        options.onDebug?.(`Audio chunk #${id} decoded (${(normalized.audio.length / 16_000).toFixed(2)}s); RMS=${normalized.rms.toFixed(4)}, peak=${normalized.peak.toFixed(3)}, gain=${normalized.gain.toFixed(1)}x.`);
        if (!normalized.usable) {
          options.onDebug?.(`Audio chunk #${id} is too quiet for reliable recognition; skipped.`);
          return;
        }
        options.onDebug?.(`Sending normalized audio chunk #${id} to worker.`);
        worker.postMessage({ id, audio: normalized.audio }, [normalized.audio.buffer]);
      }).catch((error) => options.onError(error instanceof Error ? error.message : String(error)));
      else if (!stopped) options.onDebug?.('Audio chunk was empty.');
      if (!stopped) recordChunk();
    };
    recorder.start();
    timer = window.setTimeout(() => recorder?.state === 'recording' && recorder.stop(), chunkDurationMs);
  };
  return {
    stop() {
      stopped = true;
      window.clearTimeout(timer);
      if (recorder?.state === 'recording') recorder.stop();
      // Keep the worker and its model alive between Pause/Start taps. Loading
      // Whisper is the slow part on iPad; destroying it here made every retry
      // begin the same long model initialization again.
    },
  };
}

async function decodeAudio(blob: Blob): Promise<Float32Array> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const outputLength = Math.ceil(decoded.duration * 16_000);
    const offline = new OfflineAudioContext(1, outputLength, 16_000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return new Float32Array(rendered.getChannelData(0));
  } finally {
    await context.close();
  }
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
