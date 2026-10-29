import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sanitizeBookReadingAnalytics, storeBookReadingAnalytics } from '../dist/services/book-reading-analytics.service.js';
import { saveBookReadingAnalytics } from '../dist/controllers/reader-lookup.controller.js';

const evidence = {
  version: 1, bookId: 'book', deviceId: 'device', revision: 3,
  startedAt: '2026-10-29T10:00:00.000Z', updatedAt: '2026-10-29T11:00:00.000Z',
  readWords: 100, wordLookups: 2, passageLookups: 1, pronunciationRequests: 1,
  speechPageWords: 30, speechMatchedWords: 20,
  words: [{ text: 'door', translations: 2, pronunciations: 1 }],
  passages: [{ text: 'A short sentence.', count: 1 }], unmatchedSpeechWords: ['door'], examplesTruncated: false,
};

describe('book analytics API', () => {
  it('projects only bounded evidence and strips unrecognized client fields', () => {
    assert.deepEqual(sanitizeBookReadingAnalytics({ ...evidence, studentId: 'other', rawAudio: 'secret', readRanges: [1, 1000],
      words: [{ ...evidence.words[0], arbitrary: 'ignored' }] }), evidence);
  });

  it('rejects invalid, inconsistent and oversized evidence', () => {
    for (const patch of [{ revision: 0 }, { wordLookups: -1 }, { readWords: NaN }, { speechMatchedWords: 31 },
      { readWords: 10 }, { updatedAt: 'yesterday' }, { startedAt: '2027-01-01' },
      { passages: [{ text: 'x'.repeat(201), count: 1 }] }, { words: Array(101).fill(evidence.words[0]) },
      { wordLookups: 1 }, { unmatchedSpeechWords: ['door', 'door'] }]) {
      assert.equal(sanitizeBookReadingAnalytics({ ...evidence, ...patch }), null);
    }
  });

  it('validates before connecting to the database, and preserves DB failure as failure', async () => {
    const user = { id: 'authenticated-student' };
    await assert.rejects(storeBookReadingAnalytics(Array(11).fill(evidence), user, null), RangeError);
    await assert.rejects(storeBookReadingAnalytics([evidence, evidence], user, null), RangeError);
    await assert.rejects(storeBookReadingAnalytics([{ ...evidence, revision: 0 }], user, null), RangeError);
    await assert.rejects(storeBookReadingAnalytics([evidence], user, null), /unavailable/);
  });

  it('uses authenticated ownership and one conditional batch upsert without rewriting equal/older revisions', async () => {
    const calls = [];
    const database = { async query(sql, values) {
      calls.push({ sql, values });
      return { rows: values ? [{ book_id: 'book', device_id: 'device', revision: '3' }] : [] };
    } };
    assert.deepEqual(await storeBookReadingAnalytics([evidence], { id: 'owner' }, database),
      [{ bookId: 'book', deviceId: 'device', revision: 3 }]);
    assert.equal(calls.length, 2); // table initialization once, then one bulk statement
    assert.equal(calls[1].values[0], 'owner');
    assert.match(calls[1].sql, /WHERE book_reading_analytics.revision < EXCLUDED.revision/);
    assert.match(calls[1].sql, /PRIMARY|ON CONFLICT/);
    await storeBookReadingAnalytics([evidence], { id: 'owner' }, database);
    assert.equal(calls.length, 3); // no per-book SELECTs or schema query on every call
  });

  it('requires authentication even when development auth is not configured', async () => {
    let status;
    let body;
    const res = { status(value) { status = value; return this; }, json(value) { body = value; } };
    await saveBookReadingAnalytics({ body: { books: [evidence] } }, res, () => assert.fail('should not connect'));
    assert.equal(status, 401);
    assert.match(body.data.message, /Sign in/);
  });
});
