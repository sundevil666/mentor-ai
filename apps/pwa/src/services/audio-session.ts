type PlaybackAudioSession = {
  type: string;
};

type NavigatorWithAudioSession = Navigator & {
  audioSession?: PlaybackAudioSession;
  standalone?: boolean;
};

export function isIosStandalone(target: Navigator = navigator): boolean {
  const iosNavigator = target as NavigatorWithAudioSession;
  return isAppleMobileDevice(target) && iosNavigator.standalone === true;
}

export function isAppleMobileDevice(target: Navigator = navigator): boolean {
  return /iPad|iPhone|iPod/.test(target.userAgent)
    || (target.platform === 'MacIntel' && target.maxTouchPoints > 1);
}

export function configurePlaybackAudioSession(target: Navigator = navigator): boolean {
  const audioSession = (target as NavigatorWithAudioSession).audioSession;
  if (!audioSession) return false;
  audioSession.type = 'playback';
  return true;
}

export function configureCaptureAudioSession(target: Navigator = navigator): boolean {
  const audioSession = (target as NavigatorWithAudioSession).audioSession;
  if (!audioSession) return false;
  audioSession.type = 'play-and-record';
  return true;
}

type ResumableAudio = Pick<HTMLAudioElement, 'currentTime' | 'duration' | 'pause' | 'play' | 'readyState'>;

export function useRecoveringMediaPlayPause(
  mediaSession: Pick<MediaSession, 'setActionHandler'>,
  getAudio: () => ResumableAudio | null,
  target: Navigator = navigator,
): boolean {
  if (/iPad|iPhone|iPod/.test(target.userAgent)) {
    // A Home Screen web app can lose its audio decoder when any JavaScript
    // MediaSession action handler is registered. Leave every remote command
    // to WebKit's native HTMLAudioElement integration on iOS.
    for (const action of ['play', 'pause', 'seekbackward', 'seekforward', 'seekto'] as MediaSessionAction[]) {
      try { mediaSession.setActionHandler(action, null); } catch { /* Older Safari may not expose every action. */ }
    }
    return true;
  }

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
  return false;
}
