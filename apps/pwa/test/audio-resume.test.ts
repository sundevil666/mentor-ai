import assert from 'node:assert/strict';
import { it } from 'node:test';
import { resolveAudioResumePosition } from '../src/services/audio-resume.js';

it('resumes a replay even when the recording was completed previously', () => {
  assert.equal(resolveAudioResumePosition(412.25, 1800), 412.25);
});
it('starts a finished recording again and preserves a new loop position', () => {
  assert.equal(resolveAudioResumePosition(1800, 1800), 0);
  assert.equal(resolveAudioResumePosition(7, 1800), 7);
});
it('handles invalid positions and unavailable duration', () => {
  assert.equal(resolveAudioResumePosition(NaN, 1800), 0);
  assert.equal(resolveAudioResumePosition(-1, 1800), 0);
  assert.equal(resolveAudioResumePosition(412, NaN), 412);
});
