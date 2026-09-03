export const audioPlaybackRates = [0.75, 1, 1.25, 1.5, 1.75] as const;

export type AudioPlaybackRate = typeof audioPlaybackRates[number];

export function isAudioPlaybackRate(value: number): value is AudioPlaybackRate {
  return audioPlaybackRates.some((rate) => rate === value);
}
