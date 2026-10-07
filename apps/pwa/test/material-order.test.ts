import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { audioLibrary } from '../src/services/audio-library.js';
import { sortMaterialsNewestFirst } from '../src/services/material-order.js';
import { patternLibrary } from '../src/services/pattern-library.js';

describe('material ordering', () => {
  it('shows newly added catalog entries first', () => {
    assert.equal(audioLibrary[0]?.id, 'voa-learning-english-2025-03-21');
    assert.equal(patternLibrary[0]?.id, 'i-want-you-to');
  });

  it('sorts by addition date without mutating the source list', () => {
    const source = [
      { id: 'older', addedAt: '2026-09-01T00:00:00.000Z' },
      { id: 'newer', addedAt: '2026-10-01T00:00:00.000Z' },
    ];
    assert.deepEqual(sortMaterialsNewestFirst(source).map((item) => item.id), ['newer', 'older']);
    assert.deepEqual(source.map((item) => item.id), ['older', 'newer']);
  });
});
