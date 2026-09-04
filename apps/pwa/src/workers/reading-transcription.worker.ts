import { env, pipeline } from '@huggingface/transformers';

type WorkerRequest = { type?: 'init'; id?: number; audio?: Float32Array };
type TranscriptionResult = { text?: string };

env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriberPromise: Promise<(audio: Float32Array, options?: Record<string, unknown>) => Promise<TranscriptionResult>> | null = null;
let transcribing = false;
const pendingRequests: Array<{ id: number; audio: Float32Array }> = [];
const maximumWhisperSamples = 28 * 16_000;
const maximumPendingSamples = 6 * 16_000;

async function createTranscriber() {
  const progress_callback = (progress: { status?: string; progress?: number }) => {
    // Transformers emits many lifecycle events without a meaningful percentage.
    // Reporting every one as "Loading speech model" made a normal first load
    // look like an endless restart loop in the microphone debug panel.
    if (progress.status === 'progress' && Number.isFinite(progress.progress)) {
      self.postMessage({ type: 'progress', progress: progress.progress });
    }
  };
  return await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
    device: 'wasm',
    dtype: 'q4',
    progress_callback,
  }) as unknown as (audio: Float32Array, options?: Record<string, unknown>) => Promise<TranscriptionResult>;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  transcriberPromise ??= createTranscriber();
  if (event.data.type === 'init') {
    void transcriberPromise
      .then(() => self.postMessage({ type: 'ready' }))
      .catch((error) => self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) }));
    return;
  }
  if (!event.data.audio || event.data.id === undefined) return;
  const request = { id: event.data.id, audio: event.data.audio };
  if (transcribing) {
    // Whisper can be slower than real time on Apple mobile devices. Preserve a
    // short ordered backlog, but cap it so old audio cannot make highlighting
    // drift farther and farther behind the reader.
    pendingRequests.push(request);
    let pendingSamples = pendingRequests.reduce((total, item) => total + item.audio.length, 0);
    while (pendingRequests.length > 1 && pendingSamples > maximumPendingSamples) {
      const dropped = pendingRequests.shift()!;
      pendingSamples -= dropped.audio.length;
      self.postMessage({ type: 'debug', message: `Worker overloaded; dropped stale batch #${dropped.id} to keep highlighting current.` });
    }
    self.postMessage({ type: 'debug', message: `Worker busy; queued chunk #${request.id} (${pendingRequests.length} waiting).` });
    return;
  }
  void transcribe(request);
};

async function transcribe(request: { id: number; audio: Float32Array }) {
  transcribing = true;
  const startedAt = performance.now();
  self.postMessage({ type: 'debug', message: `Worker transcribing chunk #${request.id}.` });
  try {
    const transcriber = await transcriberPromise!;
    // whisper-tiny.en is English-only and already defaults to transcription.
    // Transformers.js rejects language/task overrides for this model.
    const result = await transcriber(request.audio);
    self.postMessage({ type: 'debug', message: `Worker finished chunk #${request.id} in ${((performance.now() - startedAt) / 1_000).toFixed(1)}s.` });
    self.postMessage({ type: 'result', id: request.id, text: result.text?.trim() ?? '' });
  } catch (error) {
    self.postMessage({ type: 'error', id: request.id, message: error instanceof Error ? error.message : String(error) });
  } finally {
    const pending = takePendingBatch();
    if (pending) void transcribe(pending);
    else transcribing = false;
  }
}

function takePendingBatch(): { id: number; audio: Float32Array } | null {
  if (!pendingRequests.length) return null;
  const batch: Array<{ id: number; audio: Float32Array }> = [];
  let sampleCount = 0;
  while (pendingRequests.length) {
    const next = pendingRequests[0]!;
    if (batch.length && sampleCount + next.audio.length > maximumWhisperSamples) break;
    pendingRequests.shift();
    batch.push(next);
    sampleCount += next.audio.length;
    if (sampleCount >= maximumWhisperSamples) break;
  }
  const audio = new Float32Array(sampleCount);
  let offset = 0;
  for (const chunk of batch) {
    audio.set(chunk.audio, offset);
    offset += chunk.audio.length;
  }
  const firstId = batch[0]!.id;
  const lastId = batch.at(-1)!.id;
  self.postMessage({
    type: 'debug',
    message: `Worker combining queued chunks #${firstId}${lastId === firstId ? '' : `–${lastId}`} (${(sampleCount / 16_000).toFixed(1)}s).`,
  });
  return { id: lastId, audio };
}
