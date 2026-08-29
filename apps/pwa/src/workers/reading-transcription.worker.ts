import { env, pipeline } from '@huggingface/transformers';

type WorkerRequest = { type?: 'init'; id?: number; audio?: Float32Array };
type TranscriptionResult = { text?: string };

env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriberPromise: Promise<(audio: Float32Array, options?: Record<string, unknown>) => Promise<TranscriptionResult>> | null = null;
let transcriptionQueue = Promise.resolve();

async function createTranscriber() {
  const progress_callback = (progress: { status?: string; progress?: number }) => {
    self.postMessage({ type: 'progress', status: progress.status, progress: progress.progress });
  };
  try {
    return await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
      device: 'webgpu',
      dtype: 'q4',
      progress_callback,
    }) as unknown as (audio: Float32Array, options?: Record<string, unknown>) => Promise<TranscriptionResult>;
  } catch {
    return await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
      device: 'wasm',
      dtype: 'q8',
      progress_callback,
    }) as unknown as (audio: Float32Array, options?: Record<string, unknown>) => Promise<TranscriptionResult>;
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  transcriberPromise ??= createTranscriber();
  if (event.data.type === 'init') {
    void transcriberPromise.catch((error) => self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) }));
    return;
  }
  if (!event.data.audio || event.data.id === undefined) return;
  const { audio, id } = event.data;
  const currentTranscriber = transcriberPromise;
  transcriptionQueue = transcriptionQueue.then(async () => {
    const transcriber = await currentTranscriber;
    const result = await transcriber(audio, { language: 'english', task: 'transcribe' });
    self.postMessage({ type: 'result', id, text: result.text?.trim() ?? '' });
  }).catch((error) => {
    self.postMessage({ type: 'error', id, message: error instanceof Error ? error.message : String(error) });
  });
};
