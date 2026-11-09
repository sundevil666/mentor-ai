import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSpeechEndpointDetector } from '../src/services/speech-endpoint.js';
import { isExactDialogueAnswer } from '../src/services/dialogue-speech.js';

describe('automatic spoken answer completion', () => {
  it('does not stop while waiting for speech or on a brief click', () => {
    const observe = createSpeechEndpointDetector();
    assert.equal(observe(0, 10_000), false);
    assert.equal(observe(0.02, 50), false);
    assert.equal(observe(0, 3_000), false);
  });
  it('allows thinking pauses and resets the pause when speech resumes', () => {
    const observe = createSpeechEndpointDetector();
    assert.equal(observe(0.02, 600), false);
    assert.equal(observe(0, 1_200), false);
    assert.equal(observe(0.02, 400), false);
    assert.equal(observe(0, 1_900), false);
    assert.equal(observe(0, 100), true);
    assert.equal(observe(0, 500), false);
  });
  it('finishes a complete answer after a short pause without waiting for Whisper', () => {
    const observe = createSpeechEndpointDetector();
    assert.equal(observe(0.01, 800, true), false);
    assert.equal(observe(0, 600, true), false);
    assert.equal(observe(0, 50, true), true);
  });
  it('requires the complete ordered phrase for the quick result', () => {
    assert.equal(isExactDialogueAnswer('We were at home.', 'We were at home'), true);
    assert.equal(isExactDialogueAnswer('We will at home', 'We were at home'), false);
    assert.equal(isExactDialogueAnswer('We were', 'We were at home'), false);
    assert.equal(isExactDialogueAnswer('Home at were we', 'We were at home'), false);
    assert.equal(isExactDialogueAnswer('I think so', 'I think I think so'), false);
    assert.equal(isExactDialogueAnswer("We'll go home", 'We will go home'), true);
    assert.equal(isExactDialogueAnswer('', ''), false);
  });
});
