import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { convertArpabetToIpa, lookupReaderPhonetic, lookupReaderText, normalizeLookupText } from '../dist/services/reader-lookup.service.js';
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

  it('uses the fast Datamuse IPA without waiting for the slower dictionary', async () => {
    const originalFetch = globalThis.fetch;
    let dictionaryRequested = false;
    globalThis.fetch = async (url) => {
      if (String(url).includes('dictionaryapi.dev')) {
        dictionaryRequested = true;
        return new Response(null, { status: 503 });
      }
      return new Response(JSON.stringify([{ word: 'this', tags: ['pron', 'ipa_pron:ðˈɪs'] }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    try {
      assert.deepEqual(await lookupReaderPhonetic('This'), { text: 'This', phonetic: '/ðˈɪs/' });
      assert.equal(dictionaryRequested, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('converts the pronunciation fallback to IPA when Datamuse omits its IPA tag', () => {
    assert.equal(convertArpabetToIpa('DH IH1 S'), '/ðˈɪs/');
    assert.equal(convertArpabetToIpa('N OW1 T B UH2 K'), '/nˈoʊtbˌʊk/');
  });

  it('publishes the phonetic lookup through the Vercel reader endpoint', () => {
    const vercelConfig = JSON.parse(readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8'));
    const readerRoute = vercelConfig.routes.find((route) => route.dest === '/api/reader?action=$1');
    const serverlessReader = readFileSync(new URL('../../../api/reader.js', import.meta.url), 'utf8');

    assert.match('/api/reader/phonetic', new RegExp(readerRoute.src));
    assert.match(serverlessReader, /action === 'phonetic'/);
    assert.match(serverlessReader, /lookupReaderPhonetic\(body\?\.text\)/);
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
