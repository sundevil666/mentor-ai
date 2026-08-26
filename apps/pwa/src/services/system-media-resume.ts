export interface RecoverableAudioMedia {
  currentTime: number;
  playbackRate: number;
  muted: boolean;
  pause(): void;
  load(): void;
  play(): Promise<void>;
}

export async function restartAudioFromSystemControls(audio: RecoverableAudioMedia): Promise<void> {
  const position = audio.currentTime;
  const playbackRate = audio.playbackRate;

  // On iOS a lock-screen pause can leave the HTMLMediaElement reporting a
  // successful play while its native decoder remains stalled. Reloading in
  // the Media Session action handler creates a fresh decoder while that
  // system interaction still counts as user activation.
  audio.pause();
  audio.load();
  audio.currentTime = position;
  audio.playbackRate = playbackRate;
  audio.muted = false;
  await audio.play();
}
