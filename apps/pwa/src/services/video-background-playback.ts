export interface VideoPlaybackMedia {
  currentTime: number;
  muted: boolean;
  play(): Promise<void>;
}

const videoInteractionWindowMs = 1_500;

export function shouldPauseBackgroundAudio(
  documentHidden: boolean,
  lastVideoInteractionAt: number,
  now = Date.now(),
) {
  return !documentHidden
    && lastVideoInteractionAt > 0
    && now - lastVideoInteractionAt <= videoInteractionWindowMs;
}

export async function startVideoWithBackgroundAudio(
  video: VideoPlaybackMedia,
  backgroundAudio: VideoPlaybackMedia,
): Promise<void> {
  video.muted = true;
  backgroundAudio.currentTime = video.currentTime;

  // Invoke both play calls before awaiting either one so both retain the same
  // user activation on mobile browsers.
  await Promise.all([backgroundAudio.play(), video.play()]);
}
