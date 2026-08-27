import type { PhrasePattern } from './pattern-library.js';
import { getSpeechAudioBlob } from './speech-synthesis.js';

export const PATTERN_PLAYLIST_CACHE_NAME = 'mentor-ai-pattern-playlists-v1';
export const PATTERN_REPEAT_PAUSE_SECONDS = 4;

export interface PatternPlaylistResult {
  blob: Blob;
  offline: boolean;
}

export async function getCachedPatternPlaylist(patternId: string) {
  if (!('caches' in window)) return null;
  const response = await (await caches.open(PATTERN_PLAYLIST_CACHE_NAME)).match(
    createPatternPlaylistRequest(patternId),
  );
  return response ? response.blob() : null;
}

export async function preparePatternPlaylist(
  pattern: PhrasePattern,
  onProgress?: (completed: number, total: number) => void,
): Promise<PatternPlaylistResult> {
  const cached = await getCachedPatternPlaylist(pattern.id);
  if (cached) return { blob: cached, offline: true };

  const context = new AudioContext();
  try {
    const decoded: AudioBuffer[] = [];
    for (let index = 0; index < pattern.examples.length; index += 1) {
      const example = pattern.examples[index]!;
      const speech = await getSpeechAudioBlob(example.phrase);
      decoded.push(await context.decodeAudioData(await speech.arrayBuffer()));
      onProgress?.(index + 1, pattern.examples.length);
    }

    const wav = createPatternPlaylistWav(decoded, PATTERN_REPEAT_PAUSE_SECONDS);
    if ('caches' in window) {
      await (await caches.open(PATTERN_PLAYLIST_CACHE_NAME)).put(
        createPatternPlaylistRequest(pattern.id),
        new Response(wav, { headers: { 'Content-Type': 'audio/wav' } }),
      );
    }
    return { blob: wav, offline: true };
  } finally {
    void context.close();
  }
}

export async function deletePatternPlaylist(patternId: string) {
  if (!('caches' in window)) return;
  await (await caches.open(PATTERN_PLAYLIST_CACHE_NAME)).delete(
    createPatternPlaylistRequest(patternId),
  );
}

export function createPatternPlaylistWav(
  buffers: Array<Pick<AudioBuffer, 'numberOfChannels' | 'sampleRate' | 'length' | 'getChannelData'>>,
  pauseSeconds: number,
) {
  if (buffers.length === 0) throw new Error('At least one phrase is required.');
  const sampleRate = buffers[0]!.sampleRate;
  const channels = Math.min(2, Math.max(...buffers.map((buffer) => buffer.numberOfChannels)));
  const pauseFrames = Math.round(Math.max(0, pauseSeconds) * sampleRate);
  const totalFrames = buffers.reduce((total, buffer) => total + buffer.length + pauseFrames, 0);
  const output = Array.from({ length: channels }, () => new Float32Array(totalFrames));
  let offset = 0;

  for (const buffer of buffers) {
    if (buffer.sampleRate !== sampleRate) throw new Error('Playlist phrases must use one sample rate.');
    for (let channel = 0; channel < channels; channel += 1) {
      output[channel]!.set(buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1)), offset);
    }
    offset += buffer.length + pauseFrames;
  }

  return encodePcmToWav(output, sampleRate);
}

function encodePcmToWav(channels: Float32Array[], sampleRate: number) {
  const channelCount = channels.length;
  const frameCount = channels[0]!.length;
  const bytesPerSample = 2;
  const dataSize = frameCount * channelCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let byteOffset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel]![frame] ?? 0));
      view.setInt16(byteOffset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      byteOffset += bytesPerSample;
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function createPatternPlaylistRequest(patternId: string) {
  return new Request(`${window.location.origin}/__pattern-playlist/${encodeURIComponent(patternId)}.wav`);
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}
