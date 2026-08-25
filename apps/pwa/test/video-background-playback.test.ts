import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
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

    assert.deepEqual(calls, ['video', 'audio']);
    assert.equal(video.muted, true);
    assert.equal(backgroundAudio.currentTime, 37);
    releaseAudio();
    await playback;
  });

});
