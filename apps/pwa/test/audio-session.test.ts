import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { configurePlaybackAudioSession, isAppleMobileDevice, isIosStandalone } from '../src/services/audio-session.js';

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

  it('detects an iPhone Home Screen web app', () => {
    assert.equal(isIosStandalone({ userAgent: 'Mozilla/5.0 (iPhone)', standalone: true } as unknown as Navigator), true);
    assert.equal(isIosStandalone({ userAgent: 'Mozilla/5.0 (iPhone)', standalone: false } as unknown as Navigator), false);
    assert.equal(isIosStandalone({ userAgent: 'Mozilla/5.0 (Macintosh)', standalone: true } as unknown as Navigator), false);
  });

  it('detects an iPad Home Screen app using its desktop user agent', () => {
    const ipad = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
      platform: 'MacIntel',
      maxTouchPoints: 5,
      standalone: true,
    } as unknown as Navigator;

    assert.equal(isIosStandalone(ipad), true);
    assert.equal(isIosStandalone({ ...ipad, standalone: false } as unknown as Navigator), false);
    assert.equal(isAppleMobileDevice({ ...ipad, standalone: false } as unknown as Navigator), true);
  });
});
