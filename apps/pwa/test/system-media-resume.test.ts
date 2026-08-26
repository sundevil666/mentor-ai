import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { restartAudioFromSystemControls, type RecoverableAudioMedia } from '../src/services/system-media-resume.js';

describe('system media resume', () => {
  it('rebuilds a stalled iOS decoder and preserves the listening position', async () => {
    const calls: string[] = [];
    let storedPosition = 83;
    let storedRate = 1.25;
    const audio: RecoverableAudioMedia = {
      get currentTime() { return storedPosition; },
      set currentTime(value) { storedPosition = value; calls.push(`seek:${value}`); },
      get playbackRate() { return storedRate; },
      set playbackRate(value) { storedRate = value; calls.push(`rate:${value}`); },
      muted: true,
      pause() { calls.push('pause'); },
      load() { calls.push('load'); storedPosition = 0; storedRate = 1; },
      async play() { calls.push('play'); },
    };

    await restartAudioFromSystemControls(audio);

    assert.deepEqual(calls, ['pause', 'load', 'seek:83', 'rate:1.25', 'play']);
    assert.equal(audio.currentTime, 83);
    assert.equal(audio.playbackRate, 1.25);
    assert.equal(audio.muted, false);
  });
});
