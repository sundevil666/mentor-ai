import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { audioPlaybackRates, isAudioPlaybackRate, readAudioPlaybackRate, saveAudioPlaybackRate } from '../src/services/audio-playback-speed.js';

describe('shared audio playback speed', () => {
  it('offers the same complete speed list to every audio control block', () => {
    assert.deepEqual(audioPlaybackRates, [0.75, 1, 1.25, 1.5, 1.75]);
  });

  it('accepts only a speed exposed by the shared menu', () => {
    assert.equal(isAudioPlaybackRate(1.75), true);
    assert.equal(isAudioPlaybackRate(2), false);
  });

  it('stores a separate speed for every audio item', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    saveAudioPlaybackRate('story:aladdin', 1.75, storage);
    saveAudioPlaybackRate('audio:yellowstone', 1.25, storage);

    assert.equal(readAudioPlaybackRate('story:aladdin', storage), 1.75);
    assert.equal(readAudioPlaybackRate('audio:yellowstone', storage), 1.25);
    assert.equal(readAudioPlaybackRate('story:beauty', storage), 1);
  });
});
