import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  shouldPauseBackgroundAudio,
  startVideoWithBackgroundAudio,
  type VideoPlaybackMedia,
} from '../src/services/video-background-playback.js';

describe('video background playback', () => {
  it('starts synchronized audio in the same activation as the muted video', async () => {
    const calls: string[] = [];
    let releaseAudio!: () => void;
    const audioStarted = new Promise<void>((resolve) => {
      releaseAudio = resolve;
    });
    const video: VideoPlaybackMedia = {
      currentTime: 37,
      muted: false,
      play: async () => {
        calls.push('video');
      },
    };
    const backgroundAudio: VideoPlaybackMedia = {
      currentTime: 0,
      muted: false,
      play: () => {
        calls.push('audio');
        return audioStarted;
      },
    };

    const playback = startVideoWithBackgroundAudio(video, backgroundAudio);

    assert.deepEqual(calls, ['audio', 'video']);
    assert.equal(video.muted, true);
    assert.equal(backgroundAudio.currentTime, 37);
    releaseAudio();
    await playback;
  });

  it('keeps audio running when the system pauses video during screen lock', () => {
    assert.equal(shouldPauseBackgroundAudio(false, 0, 10_000), false);
    assert.equal(shouldPauseBackgroundAudio(true, 9_500, 10_000), false);
  });

  it('pauses audio after a recent interaction with the visible video controls', () => {
    assert.equal(shouldPauseBackgroundAudio(false, 9_500, 10_000), true);
    assert.equal(shouldPauseBackgroundAudio(false, 8_000, 10_000), false);
  });
});
