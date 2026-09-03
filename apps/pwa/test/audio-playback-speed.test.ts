import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { audioPlaybackRates, isAudioPlaybackRate } from '../src/services/audio-playback-speed.js';

describe('shared audio playback speed', () => {
  it('offers the same complete speed list to every audio control block', () => {
    assert.deepEqual(audioPlaybackRates, [0.75, 1, 1.25, 1.5, 1.75]);
  });

  it('accepts only a speed exposed by the shared menu', () => {
    assert.equal(isAudioPlaybackRate(1.75), true);
    assert.equal(isAudioPlaybackRate(2), false);
  });
});
