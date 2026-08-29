import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { lookupReaderPhonetic, lookupReaderText, normalizeLookupText } from '../dist/services/reader-lookup.service.js';
import {
  countTranslationCharacters,
  createTranslationUsage,
  getUsagePeriod,
} from '../dist/services/translation-usage.service.js';

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

  it('falls back to Datamuse IPA when the primary dictionary is unavailable', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).includes('dictionaryapi.dev')) return new Response(null, { status: 503 });
      return new Response(JSON.stringify([{ word: 'gripping', tags: ['adj', 'ipa_pron:grˈɪpɪŋ'] }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    try {
      assert.deepEqual(await lookupReaderPhonetic('gripping'), { text: 'gripping', phonetic: '/grˈɪpɪŋ/' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('translation usage limit', () => {
  it('counts Unicode code points the same way Google bills text input', () => {
    assert.equal(countTranslationCharacters('gripping'), 8);
    assert.equal(countTranslationCharacters('A😀'), 2);
  });

  it('reports the monthly safe-limit percentage and remaining characters', () => {
    assert.deepEqual(createTranslationUsage('2026-08', 112_500, true), {
      period: '2026-08',
      usedCharacters: 112_500,
      limitCharacters: 450_000,
      remainingCharacters: 337_500,
      percentUsed: 25,
      configured: true,
      exhausted: false,
    });
    assert.equal(getUsagePeriod(new Date('2026-08-29T12:00:00Z')), '2026-08');
  });
});
