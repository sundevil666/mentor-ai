export const videoPlaybackRates = [1, 1.1, 1.5, 1.2] as const;
export type VideoPlaybackRate = (typeof videoPlaybackRates)[number];

export type VideoPlaybackPreference = {
  repeat: boolean;
  playbackRate: VideoPlaybackRate;
};

const storageKey = 'mentor_ai_video_playback_preferences';
const defaultPreference: VideoPlaybackPreference = { repeat: true, playbackRate: 1 };

export function readVideoPlaybackPreference(videoId: string): VideoPlaybackPreference {
  if (typeof localStorage === 'undefined') return { ...defaultPreference };

  try {
    const allPreferences = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Record<string, unknown>;
    return validatePreference(allPreferences[videoId]);
  } catch {
    return { ...defaultPreference };
  }
}

export function saveVideoPlaybackPreference(videoId: string, preference: VideoPlaybackPreference) {
  if (typeof localStorage === 'undefined') return;

  let allPreferences: Record<string, unknown> = {};
  try {
    allPreferences = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Record<string, unknown>;
  } catch {
    // Replace malformed local preferences with a clean map.
  }

  localStorage.setItem(storageKey, JSON.stringify({
    ...allPreferences,
    [videoId]: preference,
  }));
}

function validatePreference(value: unknown): VideoPlaybackPreference {
  if (!value || typeof value !== 'object') return { ...defaultPreference };
  const candidate = value as Partial<VideoPlaybackPreference>;
  const playbackRate = videoPlaybackRates.find((rate) => rate === candidate.playbackRate) ?? 1;

  return {
    repeat: typeof candidate.repeat === 'boolean' ? candidate.repeat : true,
    playbackRate,
  };
}
