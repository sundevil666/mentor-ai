// Use after recording completion in the ended handler. Native loop suppresses
// ended events, so completed listening must be saved before restarting manually.
export function replayCompletedAudio(player: Pick<HTMLAudioElement, 'currentTime' | 'play'>): Promise<void> {
  player.currentTime = 0;
  return player.play();
}
