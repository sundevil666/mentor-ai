import { env, pipeline } from '@huggingface/transformers';

type WorkerRequest = { type?: 'init'; id?: number; audio?: Float32Array };
type TranscriptionResult = { text?: string };

env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriberPromise: Promise<(audio: Float32Array, options?: Record<string, unknown>) => Promise<TranscriptionResult>> | null = null;
let transcribing = false;
let latestPendingRequest: { id: number; audio: Float32Array } | null = null;

async function createTranscriber() {
  const progress_callback = (progress: { status?: string; progress?: number }) => {
    self.postMessage({ type: 'progress', status: progress.status, progress: progress.progress });
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
    // On slower Apple devices inference may take longer than recording a chunk.
    // Retaining every old chunk makes the marker drift further behind forever.
    // Keep only the newest waiting chunk so recognition catches up to the reader.
    latestPendingRequest = request;
    return;
  }
  void transcribe(request);
};

async function transcribe(request: { id: number; audio: Float32Array }) {
  transcribing = true;
  try {
    const transcriber = await transcriberPromise!;
    const result = await transcriber(request.audio, { language: 'english', task: 'transcribe' });
    self.postMessage({ type: 'result', id: request.id, text: result.text?.trim() ?? '' });
  } catch (error) {
    self.postMessage({ type: 'error', id: request.id, message: error instanceof Error ? error.message : String(error) });
  } finally {
    const pending = latestPendingRequest;
    latestPendingRequest = null;
    if (pending) void transcribe(pending);
    else transcribing = false;
  }
}
