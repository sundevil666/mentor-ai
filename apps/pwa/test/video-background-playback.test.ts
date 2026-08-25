import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  startVideoWithBackgroundAudio,
  type VideoPlaybackMedia,
} from '../src/services/video-background-playback.js';

describe('video background playback', () => {
  it('starts silent synchronized audio in the same activation as the video', async () => {
    const calls: string[] = [];
    let releaseAudio!: () => void;
    const audioStarted = new Promise<void>((resolve) => {
      releaseAudio = resolve;
    });
    const video: VideoPlaybackMedia = {
      currentTime: 37,
      volume: 1,
      play: async () => {
        calls.push('video');
      },
    };
    const backgroundAudio: VideoPlaybackMedia = {
      currentTime: 0,
      volume: 1,
      play: () => {
        calls.push('audio');
        return audioStarted;
      },
    };

    const playback = startVideoWithBackgroundAudio(video, backgroundAudio);

    assert.deepEqual(calls, ['audio', 'video']);
    assert.equal(backgroundAudio.currentTime, 37);
    assert.equal(backgroundAudio.volume, 0);
    releaseAudio();
    await playback;
  });
});
