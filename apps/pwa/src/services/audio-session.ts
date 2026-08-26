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

export function useNativeMediaPlayPause(mediaSession: Pick<MediaSession, 'setActionHandler'>): void {
  mediaSession.setActionHandler('play', null);
  mediaSession.setActionHandler('pause', null);
}
