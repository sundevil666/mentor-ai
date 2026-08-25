export interface VideoPlaybackMedia {
  currentTime: number;
  muted: boolean;
  play(): Promise<void>;
}

export async function startVideoWithBackgroundAudio(
  video: VideoPlaybackMedia,
  backgroundAudio: VideoPlaybackMedia,
): Promise<void> {
  video.muted = true;
  backgroundAudio.currentTime = video.currentTime;

  // Invoke both play calls before awaiting either one so both retain the same
  // user activation on mobile browsers.
  await Promise.all([video.play(), backgroundAudio.play()]);
}
