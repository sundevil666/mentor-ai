type LocalTranscriberOptions = {
  onTranscript: (text: string) => void;
  onProgress: (message: string) => void;
  onError: (message: string) => void;
};

export type LocalReadingTranscriber = { stop: () => void };

const chunkDurationMs = 4_000;

export function startLocalReadingTranscriber(stream: MediaStream, options: LocalTranscriberOptions): LocalReadingTranscriber {
  const worker = new Worker(new URL('../workers/reading-transcription.worker.ts', import.meta.url), { type: 'module' });
  let recorder: MediaRecorder | null = null;
  let timer = 0;
  let stopped = false;
  let requestId = 0;

  worker.onmessage = (event: MessageEvent<{ type: string; id?: number; text?: string; progress?: number; message?: string }>) => {
    if (event.data.type === 'result' && event.data.text) options.onTranscript(event.data.text);
    if (event.data.type === 'progress') {
      const progress = Number.isFinite(event.data.progress) ? ` ${Math.round(event.data.progress ?? 0)}%` : '';
      options.onProgress(`Preparing offline speech recognition${progress}…`);
    }
    if (event.data.type === 'error') options.onError(event.data.message ?? 'Offline speech recognition failed.');
  };
  worker.postMessage({ type: 'init' });

  const recordChunk = () => {
    if (stopped || !stream.active) return;
    const chunks: Blob[] = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      if (!stopped && chunks.length) void decodeAudio(new Blob(chunks, { type: recorder?.mimeType })).then((audio) => {
        worker.postMessage({ id: ++requestId, audio }, [audio.buffer]);
      }).catch((error) => options.onError(error instanceof Error ? error.message : String(error)));
      if (!stopped) recordChunk();
    };
    recorder.start();
    timer = window.setTimeout(() => recorder?.state === 'recording' && recorder.stop(), chunkDurationMs);
  };
  recordChunk();

  return {
    stop() {
      stopped = true;
      window.clearTimeout(timer);
      if (recorder?.state === 'recording') recorder.stop();
      worker.terminate();
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
