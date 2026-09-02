import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cloudReadingStepMs, cloudReadingWindowSeconds, encodePcmWav, resampleMono } from '../src/services/cloud-reading-transcriber.js';

describe('online reading audio preparation', () => {
  it('uses overlapping continuous windows for responsive contextual recognition', () => {
    assert.equal(cloudReadingWindowSeconds, 3);
    assert.equal(cloudReadingStepMs, 1_500);
    assert.ok(cloudReadingWindowSeconds * 1_000 > cloudReadingStepMs);
  });

  it('resamples tablet audio to the 16 kHz expected by Whisper', () => {
    const input = Float32Array.from({ length: 48_000 }, (_, index) => Math.sin(index / 20));
    const output = resampleMono(input, 48_000, 16_000);
    assert.equal(output.length, 16_000);
  });

  it('encodes mono PCM with a valid WAV header', () => {
    const wav = encodePcmWav(Float32Array.from([0, 0.5, -0.5]), 16_000);
    assert.equal(new TextDecoder().decode(wav.subarray(0, 4)), 'RIFF');
    assert.equal(new TextDecoder().decode(wav.subarray(8, 12)), 'WAVE');
    assert.equal(wav.length, 50);
  });
});
