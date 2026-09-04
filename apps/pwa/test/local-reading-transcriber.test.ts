import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { localReadingChunkDurationMs, normalizeReadingAudio, resampleReadingAudio } from '../src/services/local-reading-transcriber.js';

describe('continuous local reading audio preparation', () => {
  it('uses short PCM batches without restarting capture', () => {
    assert.equal(localReadingChunkDurationMs, 1_200);
  });

  it('resamples tablet audio to the 16 kHz expected by Whisper', () => {
    const input = Float32Array.from({ length: 48_000 }, (_, index) => Math.sin(index / 20));
    const output = resampleReadingAudio(input, 48_000, 16_000);
    assert.equal(output.length, 16_000);
  });

  it('rejects silence before it reaches Whisper', () => {
    assert.equal(normalizeReadingAudio(new Float32Array(16_000)).usable, false);
  });

  it('keeps audible PCM and normalizes a quiet voice', () => {
    const input = Float32Array.from({ length: 16_000 }, (_, index) => Math.sin(index / 20) * 0.02);
    const result = normalizeReadingAudio(input);
    assert.equal(result.usable, true);
    assert.ok(result.gain > 1);
  });
});
