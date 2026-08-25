export interface VideoPlaybackMedia {
  currentTime: number;
  volume: number;
  play(): Promise<void>;
}

export async function startVideoWithBackgroundAudio(
  video: VideoPlaybackMedia,
  backgroundAudio: VideoPlaybackMedia,
): Promise<void> {
  backgroundAudio.volume = 0;
  backgroundAudio.currentTime = video.currentTime;

  // Invoke both play calls before awaiting either one so both retain the same
  // user activation on mobile browsers.
  await Promise.all([backgroundAudio.play(), video.play()]);
}
