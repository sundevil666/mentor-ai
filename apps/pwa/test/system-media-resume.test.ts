import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { useNativeMediaPlayPause } from '../src/services/audio-session.js';

describe('system media controls', () => {
  it('leaves lock-screen play and pause to the native media process', () => {
    const handlers = new Map<string, unknown>();
    const mediaSession = {
      setActionHandler(action: MediaSessionAction, handler: MediaSessionActionHandler | null) {
        handlers.set(action, handler);
      },
    };

    useNativeMediaPlayPause(mediaSession);

    assert.equal(handlers.get('play'), null);
    assert.equal(handlers.get('pause'), null);
  });
});
