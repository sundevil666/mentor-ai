import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPatternAudioScript, patternLibrary } from '../src/services/pattern-library.js';

describe('phrase pattern library', () => {
  it('starts with one complete reusable pattern rather than placeholder lessons', () => {
    assert.equal(patternLibrary.length, 1);
    const pattern = patternLibrary[0]!;
    assert.equal(pattern.id, 'could-you-please');
    assert.ok(pattern.examples.length >= 6);
    assert.ok(pattern.examples.every((example) => example.phrase.startsWith('Could you ')));
    assert.ok(pattern.examples.every((example) => example.phrase.endsWith(', please?')));
  });

  it('includes every practice phrase twice in the audio drill', () => {
    const pattern = patternLibrary[0]!;
    const script = createPatternAudioScript(pattern);
    for (const example of pattern.examples) assert.equal(script.split(example.phrase).length - 1, 2);
  });
});
