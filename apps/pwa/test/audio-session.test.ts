import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { configurePlaybackAudioSession } from '../src/services/audio-session.js';

describe('audio session', () => {
  it('declares long-form playback to iOS before audio starts', () => {
    const target = { audioSession: { type: 'auto' } } as unknown as Navigator;

    const configured = configurePlaybackAudioSession(target);

    assert.equal(configured, true);
    assert.equal((target as unknown as { audioSession: { type: string } }).audioSession.type, 'playback');
  });

  it('falls back safely in browsers without the Audio Session API', () => {
    assert.equal(configurePlaybackAudioSession({} as Navigator), false);
  });
});
