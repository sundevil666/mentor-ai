type PlaybackAudioSession = {
  type: string;
};

type NavigatorWithAudioSession = Navigator & {
  audioSession?: PlaybackAudioSession;
};

export function configurePlaybackAudioSession(target: Navigator = navigator): boolean {
  const audioSession = (target as NavigatorWithAudioSession).audioSession;
  if (!audioSession) return false;
  audioSession.type = 'playback';
  return true;
}

type ResumableAudio = Pick<HTMLAudioElement, 'currentTime' | 'duration' | 'pause' | 'play' | 'readyState'>;

export function useRecoveringMediaPlayPause(
  mediaSession: Pick<MediaSession, 'setActionHandler'>,
  getAudio: () => ResumableAudio | null,
): void {
  mediaSession.setActionHandler('play', () => {
    const audio = getAudio();
    if (!audio) return;

    // iOS can emit both `play` and `playing` after a lock-screen resume while
    // leaving the decoder clock frozen. A tiny seek reattaches the existing
    // decoded stream without calling load(), which WebKit defers until unlock.
    if (audio.readyState >= 2 && Number.isFinite(audio.currentTime)) {
      const resumeAt = audio.currentTime;
      const maxPosition = Number.isFinite(audio.duration) ? Math.max(0, audio.duration - 0.01) : resumeAt + 0.01;
      audio.currentTime = Math.min(resumeAt + 0.01, maxPosition);
    }
    void audio.play().catch(() => undefined);
  });
  mediaSession.setActionHandler('pause', () => getAudio()?.pause());
}
