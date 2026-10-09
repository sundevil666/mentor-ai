import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAudioPlaybackCompleted } from '../src/services/audio-completion.js';

describe('audio completion state', () => {
  it('marks audio completed when playback reached the end even without a full-play event', () => {
    assert.equal(isAudioPlaybackCompleted(undefined, { finishes: 4, fullPlays: 0 }), true);
  });

  it('keeps synchronized completed progress authoritative when engagement events are absent', () => {
    assert.equal(isAudioPlaybackCompleted({ completed: true }, undefined), true);
  });

  it('accepts legacy full-play evidence as completed', () => {
    assert.equal(isAudioPlaybackCompleted(undefined, { finishes: 0, fullPlays: 1 }), true);
  });

  it('does not complete audio that was only started', () => {
    assert.equal(isAudioPlaybackCompleted({ completed: false }, { finishes: 0, fullPlays: 0 }), false);
  });
});
