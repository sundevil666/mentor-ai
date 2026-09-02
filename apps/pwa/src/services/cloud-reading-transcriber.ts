import { fetchOnlineReadingTranscriptionConfiguration, transcribeReadingAudioOnline } from './api-client.js';

type CloudReadingTranscriberOptions = {
  prompt: () => string;
  onTranscript: (text: string) => void;
  onDebug?: (message: string) => void;
  onReady: () => void;
  onUnavailable: (message: string) => void;
};

export type CloudReadingTranscriber = { stop: () => void };
// A three-second context window is long enough for cloud Whisper while the 50%
// overlap keeps highlighting responsive and stays near two billed audio minutes
// per minute of reading rather than tripling free-tier usage.
export const cloudReadingWindowSeconds = 3;
export const cloudReadingStepMs = 1_500;

export async function canUseCloudReadingTranscription(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    return (await fetchOnlineReadingTranscriptionConfiguration()).configured;
  } catch {
    return false;
  }
}

export async function startCloudReadingTranscriber(
  stream: MediaStream,
  options: CloudReadingTranscriberOptions,
): Promise<CloudReadingTranscriber> {
  const context = new AudioContext();
  if (!context.audioWorklet) {
    await context.close();
    throw new Error('AudioWorklet is unavailable.');
  }
  await context.audioWorklet.addModule('/reading-audio-processor.js');
  const source = context.createMediaStreamSource(stream);
  const processor = new AudioWorkletNode(context, 'reading-audio-processor');
  const silentOutput = context.createGain();
  silentOutput.gain.value = 0;
  source.connect(processor).connect(silentOutput).connect(context.destination);

  const maximumSamples = Math.ceil(context.sampleRate * (cloudReadingWindowSeconds + 1));
  let chunks: Float32Array[] = [];
  let sampleCount = 0;
  let stopped = false;
  let requestInFlight = false;
  let failureReported = false;

  processor.port.onmessage = (event: MessageEvent<Float32Array>) => {
    if (stopped || !(event.data instanceof Float32Array)) return;
    chunks.push(event.data);
    sampleCount += event.data.length;
    while (chunks.length > 1 && sampleCount - chunks[0]!.length >= maximumSamples) {
      sampleCount -= chunks.shift()!.length;
    }
  };

  const timer = window.setInterval(() => {
    if (stopped || requestInFlight || sampleCount < context.sampleRate * cloudReadingWindowSeconds) return;
    const sourceAudio = joinTail(chunks, sampleCount, Math.ceil(context.sampleRate * cloudReadingWindowSeconds));
    const wav = encodePcmWav(resampleMono(sourceAudio, context.sampleRate, 16_000), 16_000);
    requestInFlight = true;
    options.onDebug?.(`Sending ${(sourceAudio.length / context.sampleRate).toFixed(1)}s continuous audio window to online Whisper.`);
    void transcribeReadingAudioOnline(wav, options.prompt()).then(({ text }) => {
      if (!stopped && text) options.onTranscript(text);
    }).catch((error) => {
      if (stopped || failureReported) return;
      failureReported = true;
      options.onUnavailable(error instanceof Error ? error.message : String(error));
    }).finally(() => { requestInFlight = false; });
  }, cloudReadingStepMs);

  if (context.state === 'suspended') await context.resume();
  options.onReady();
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      window.clearInterval(timer);
      processor.port.onmessage = null;
      processor.disconnect();
      source.disconnect();
      silentOutput.disconnect();
      void context.close();
      chunks = [];
      sampleCount = 0;
    },
  };
}

export function resampleMono(input: Float32Array, sourceRate: number, targetRate: number): Float32Array {
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

export function encodePcmWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}

function joinTail(chunks: readonly Float32Array[], totalSamples: number, wantedSamples: number): Float32Array {
  const outputLength = Math.min(totalSamples, wantedSamples);
  const output = new Float32Array(outputLength);
  let outputOffset = outputLength;
  for (let index = chunks.length - 1; index >= 0 && outputOffset > 0; index -= 1) {
    const chunk = chunks[index]!;
    const copied = Math.min(chunk.length, outputOffset);
    outputOffset -= copied;
    output.set(chunk.subarray(chunk.length - copied), outputOffset);
  }
  return output;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}
