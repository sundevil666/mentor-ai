import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { lookupReaderText, normalizeLookupText } from '../dist/services/reader-lookup.service.js';

describe('reader text lookup', () => {
  it('normalizes selected words and phrases before translation', () => {
    assert.equal(normalizeLookupText('  could\n  you   help  '), 'could you help');
    assert.equal(normalizeLookupText(null), '');
  });

  it('rejects an empty selection before making a translation request', async () => {
    await assert.rejects(() => lookupReaderText('   '), /Select an English word or phrase/);
  });

  it('rejects oversized selections before making a translation request', async () => {
    await assert.rejects(() => lookupReaderText('a'.repeat(501)), /no more than 500 characters/);
  });
});
