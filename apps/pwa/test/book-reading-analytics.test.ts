import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BookReadingAnalytics, BookReadingAnalyticsReceipt } from '@mentor-ai/shared';
import { applyBookAnalyticsEvent, bookAnalyticsBatch, bookAnalyticsIntervalMs, bookAnalyticsMaxBytes,
  flushBookAnalytics, newBookAnalytics, type BookAnalyticsOutbox, type LocalBookAnalytics } from '../src/services/book-reading-analytics-model.js';

const date = '2026-10-29T10:00:00.000Z';
const fresh = (bookId = 'book', student = 'student') => newBookAnalytics(student, bookId, 'device', date);
const lookup = (record: LocalBookAnalytics, text = 'word') => applyBookAnalyticsEvent(record,
  { kind: 'lookup', text, translation: true, pronunciation: false }, date);

class Outbox implements BookAnalyticsOutbox {
  records = [lookup(fresh())];
  attemptedAt: number | undefined;
  async list(studentId: string) { return structuredClone(this.records.filter((item) => item.studentId === studentId)); }
  async claimAttempt(_studentId: string, now: number) {
    if (this.attemptedAt !== undefined && now - this.attemptedAt < bookAnalyticsIntervalMs) return false;
    this.attemptedAt = now;
    return true;
  }
  async acknowledge(_studentId: string, receipts: BookReadingAnalyticsReceipt[]) {
    for (const receipt of receipts) {
      const record = this.records.find((item) => item.snapshot.bookId === receipt.bookId && item.snapshot.deviceId === receipt.deviceId);
      if (record) record.acknowledgedRevision = receipt.revision;
    }
  }
}
const acknowledge = async (books: BookReadingAnalytics[]) => books.map(({ bookId, deviceId, revision }) => ({ bookId, deviceId, revision }));

describe('durable book analytics', () => {
  it('attributes word and passage translations and pronunciation requests to the book', () => {
    let record = lookup(fresh(), '  Door ');
    record = lookup(record, 'door');
    record = lookup(record, 'The whole sentence.');
    record = applyBookAnalyticsEvent(record, { kind: 'lookup', text: 'door', translation: false, pronunciation: true }, date);
    assert.equal(record.snapshot.wordLookups, 2);
    assert.equal(record.snapshot.passageLookups, 1);
    assert.equal(record.snapshot.pronunciationRequests, 1);
    assert.deepEqual(record.snapshot.words, [{ text: 'door', translations: 2, pronunciations: 1 }]);
    assert.equal(record.snapshot.passages[0]?.text, 'the whole sentence.');
    assert.equal(fresh().snapshot.wordLookups, 0);
  });

  it('counts unique observed positions, not furthest position or repeated page visits', () => {
    const first = applyBookAnalyticsEvent(fresh(), { kind: 'read', indexes: [900, 901, 902] }, date);
    const reread = applyBookAnalyticsEvent(first, { kind: 'read', indexes: [901, 902, -1, NaN] }, date);
    assert.equal(first.snapshot.readWords, 3);
    assert.deepEqual(reread, first);
    const next = applyBookAnalyticsEvent(first, { kind: 'read', indexes: [903, 904] }, date);
    assert.equal(next.snapshot.readWords, 5);
    assert.deepEqual(next.readRanges, [[900, 904]]);
  });

  it('keeps non-matches distinct from pronunciation errors and handles repagination without double counts', () => {
    const event = { kind: 'speech' as const, indexes: [10, 11, 12], missed: [{ index: 11, word: 'Door' }] };
    let record = applyBookAnalyticsEvent(fresh(), event, date);
    assert.equal(record.snapshot.speechPageWords, 3);
    assert.equal(record.snapshot.speechMatchedWords, 2);
    assert.equal(record.snapshot.readWords, 2);
    assert.deepEqual(record.snapshot.unmatchedSpeechWords, ['door']);
    assert.deepEqual(applyBookAnalyticsEvent(record, event, date), record);
    record = applyBookAnalyticsEvent(record, { kind: 'speech', indexes: [11, 12, 13], missed: [] }, date);
    assert.equal(record.snapshot.speechMatchedWords, 4);
    assert.equal(record.snapshot.speechPageWords, 4);
    assert.equal(record.snapshot.readWords, 4);
  });

  it('bounds examples while retaining complete counters', () => {
    let record = fresh();
    for (let i = 0; i < 120; i++) record = lookup(record, `word${i}`);
    for (let i = 0; i < 30; i++) record = lookup(record, `sentence number ${i}`);
    assert.equal(record.snapshot.words.length, 100);
    assert.equal(record.snapshot.passages.length, 20);
    assert.equal(record.snapshot.wordLookups, 120);
    assert.equal(record.snapshot.passageLookups, 30);
    assert.equal(record.snapshot.examplesTruncated, true);
  });

  it('keeps failed batches and allows only one attempt in 24 hours, including after restart', async () => {
    const store = new Outbox();
    let calls = 0;
    const fail = async () => { calls++; throw new Error('Database unavailable'); };
    await assert.rejects(flushBookAnalytics(store, 'student', 1000, fail));
    assert.equal(store.records[0]!.acknowledgedRevision, 0);
    assert.equal(await flushBookAnalytics(store, 'student', 1001, fail), 0);
    assert.equal(await flushBookAnalytics(store, 'student', 1000 + bookAnalyticsIntervalMs - 1, fail), 0);
    assert.equal(calls, 1);
    assert.equal(await flushBookAnalytics(store, 'student', 1000 + bookAnalyticsIntervalMs, acknowledge), 1);
    assert.equal(bookAnalyticsBatch(store.records).length, 0);
    assert.equal(store.records[0]!.snapshot.wordLookups, 1); // offline working summary survives acknowledgement
  });

  it('retains concurrent edits and ignores unrelated/future receipts', async () => {
    const store = new Outbox();
    await flushBookAnalytics(store, 'student', 2000, async (books) => {
      store.records[0] = lookup(store.records[0]!);
      return [...await acknowledge(books), { bookId: 'other', deviceId: 'device', revision: 100 }];
    });
    assert.equal(store.records[0]!.acknowledgedRevision, 1);
    assert.equal(bookAnalyticsBatch(store.records)[0]?.revision, 2);
    const other = new Outbox();
    assert.equal(await flushBookAnalytics(other, 'student', 2000, async () => [{ bookId: 'book', deviceId: 'device', revision: 999 }]), 0);
    assert.equal(other.records[0]!.acknowledgedRevision, 0);
  });

  it('bounds batches by books and UTF-8 bytes and keeps excess queued', () => {
    const records = Array.from({ length: 12 }, (_, i) => lookup(fresh(String(i))));
    assert.equal(bookAnalyticsBatch(records).length, 10);
    const heavy = records.map((record) => {
      record.snapshot.passages = Array.from({ length: 20 }, (_, i) => ({ text: 'я'.repeat(198) + i, count: 1 }));
      return record;
    });
    const batch = bookAnalyticsBatch(heavy);
    assert.ok(batch.length < heavy.length);
    assert.ok(new TextEncoder().encode(JSON.stringify({ books: batch })).length <= bookAnalyticsMaxBytes);
  });

  it('does no work for another account or an empty queue', async () => {
    const store = new Outbox();
    let calls = 0;
    assert.equal(await flushBookAnalytics(store, 'other', 1, async () => { calls++; return []; }), 0);
    assert.equal(calls, 0);
    assert.equal(store.attemptedAt, undefined);
  });
});


it('keeps the largest individual snapshot sendable and prevents concurrent daily requests', async () => {
  let record = fresh();
  for (let i = 0; i < 100; i++) record = lookup(record, '界'.repeat(77) + i);
  record = applyBookAnalyticsEvent(record, { kind: 'speech', indexes: Array.from({ length: 100 }, (_, i) => i),
    missed: Array.from({ length: 100 }, (_, i) => ({ index: i, word: '界'.repeat(77) + i })) }, date);
  for (let i = 0; i < 20; i++) record = lookup(record, '界'.repeat(190) + ' ' + i);
  assert.ok(new TextEncoder().encode(JSON.stringify(record.snapshot)).length <= 48_000);
  assert.equal(bookAnalyticsBatch([record]).length, 1);
  assert.equal(record.snapshot.examplesTruncated, true);
  const store = new Outbox();
  let calls = 0;
  const send = async (books: BookReadingAnalytics[]) => { calls++; return acknowledge(books); };
  await Promise.all([flushBookAnalytics(store, 'student', 1, send), flushBookAnalytics(store, 'student', 1, send)]);
  assert.equal(calls, 1);
});
