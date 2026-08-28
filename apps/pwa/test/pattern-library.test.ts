import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPatternAudioScript, patternLibrary } from '../src/services/pattern-library.js';
import { createPatternPlaylistWav, getPatternPlaylistContentVersion } from '../src/services/pattern-playlist.js';

describe('phrase pattern library', () => {
  it('starts with one complete reusable pattern rather than placeholder lessons', () => {
    assert.equal(patternLibrary.length, 1);
    const pattern = patternLibrary[0]!;
    assert.equal(pattern.id, 'could-you-please');
    assert.equal(pattern.examples.length, 20);
    assert.ok(pattern.examples.every((example) => example.phrase.startsWith('Could you ')));
    assert.ok(pattern.examples.every((example) => example.phrase.endsWith(', please?')));
  });

  it('requires every current and future pattern to contain 20 useful substitutions', () => {
    for (const pattern of patternLibrary) {
      assert.equal(pattern.examples.length, 20, `${pattern.id} must contain 20 examples`);
      assert.equal(new Set(pattern.examples.map((example) => example.id)).size, 20);
      assert.equal(new Set(pattern.examples.map((example) => example.phrase)).size, 20);
    }
  });

  it('includes every practice phrase twice in the audio drill', () => {
    const pattern = patternLibrary[0]!;
    const script = createPatternAudioScript(pattern);
    for (const example of pattern.examples) assert.equal(script.split(example.phrase).length - 1, 2);
  });

  it('changes the offline playlist version when its phrases change', () => {
    const pattern = patternLibrary[0]!;
    const changed = { ...pattern, examples: pattern.examples.map((example, index) => index === 0 ? { ...example, phrase: `${example.phrase} Updated.` } : example) };
    assert.notEqual(getPatternPlaylistContentVersion(changed), getPatternPlaylistContentVersion(pattern));
  });

  it('builds one playable WAV with a repetition pause after every phrase', async () => {
    const first = createFakeAudioBuffer([0.5, -0.5], 2);
    const second = createFakeAudioBuffer([0.25], 2);
    const playlist = createPatternPlaylistWav([first, second], 1);
    const bytes = new Uint8Array(await playlist.arrayBuffer());
    const view = new DataView(bytes.buffer);

    assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF');
    assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WAVE');
    assert.equal(view.getUint32(24, true), 2);
    assert.equal(view.getUint32(40, true), 14);
    assert.equal(view.getInt16(44, true), 16_383);
    assert.equal(view.getInt16(46, true), -16_384);
    assert.equal(view.getInt16(48, true), 0);
    assert.equal(view.getInt16(50, true), 0);
  });
});

function createFakeAudioBuffer(samples: number[], sampleRate: number) {
  const data = Float32Array.from(samples);
  return {
    numberOfChannels: 1,
    sampleRate,
    length: data.length,
    getChannelData: () => data,
  };
}
