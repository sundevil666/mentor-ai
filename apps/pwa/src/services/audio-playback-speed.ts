export const audioPlaybackRates = [0.75, 1, 1.25, 1.5, 1.75] as const;

export type AudioPlaybackRate = typeof audioPlaybackRates[number];

const playbackRateStoragePrefix = 'mentor-ai:audio-playback-rate:';

export function isAudioPlaybackRate(value: number): value is AudioPlaybackRate {
  return audioPlaybackRates.some((rate) => rate === value);
}

export function readAudioPlaybackRate(
  persistenceKey: string,
  storage: Pick<Storage, 'getItem'> = localStorage,
): AudioPlaybackRate {
  const value = Number(storage.getItem(`${playbackRateStoragePrefix}${persistenceKey}`));
  return isAudioPlaybackRate(value) ? value : 1;
}

export function saveAudioPlaybackRate(
  persistenceKey: string,
  rate: AudioPlaybackRate,
  storage: Pick<Storage, 'setItem'> = localStorage,
) {
  storage.setItem(`${playbackRateStoragePrefix}${persistenceKey}`, String(rate));
}
