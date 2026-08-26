import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { useRecoveringMediaPlayPause } from '../src/services/audio-session.js';

describe('system media controls', () => {
  it('nudges the decoder before resuming from the lock screen', async () => {
    const handlers = new Map<string, MediaSessionActionHandler | null>();
    const mediaSession = {
      setActionHandler(action: MediaSessionAction, handler: MediaSessionActionHandler | null) {
        handlers.set(action, handler);
      },
    };
    let playCalls = 0;
    let pauseCalls = 0;
    const audio = {
      currentTime: 26.5,
      duration: 120,
      readyState: 4,
      play: async () => { playCalls += 1; },
      pause: () => { pauseCalls += 1; },
    };

    useRecoveringMediaPlayPause(mediaSession, () => audio as HTMLAudioElement);
    handlers.get('play')?.({ action: 'play' });
    await Promise.resolve();
    handlers.get('pause')?.({ action: 'pause' });

    assert.equal(audio.currentTime, 26.51);
    assert.equal(playCalls, 1);
    assert.equal(pauseCalls, 1);
  });
});
