import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { readReadingPageSummaries, readingPageSpeechSyncIntervalMs, saveReadingPageSummary, syncReadingPageSpeech } from '../src/services/reading-page-speech-outbox.js';

class StorageMemory implements Storage {
  readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
const storage = new StorageMemory();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
afterEach(() => storage.clear());

const missed = { pageIndex: 0, totalWords: 2, correctWords: 1, missedWords: [{ index: 1, word: 'wrong' }] };

describe('daily page speech outbox', () => {
  it('keeps failed data and waits a full day before one retry', async () => {
    saveReadingPageSummary('student', 'book', missed);
    let calls = 0;
    const send = async () => { calls += 1; throw new Error('DB unavailable'); };
    await assert.rejects(syncReadingPageSpeech('student', 1_000, send));
    assert.equal(calls, 1);
    assert.equal(await syncReadingPageSpeech('student', 1_000 + readingPageSpeechSyncIntervalMs - 1, send), 0);
    assert.equal(calls, 1);
    assert.deepEqual(readReadingPageSummaries('student', 'book')['0'], missed);
    assert.equal(await syncReadingPageSpeech('student', 1_000 + readingPageSpeechSyncIntervalMs, async (pages) => { calls += 1; return pages; }), 1);
    assert.equal(calls, 2);
    assert.deepEqual(readReadingPageSummaries('student', 'book'), {});
  });

  it('sends one bounded request for multiple books and removes only acknowledged pages', async () => {
    saveReadingPageSummary('student', 'a', missed);
    saveReadingPageSummary('student', 'b', { ...missed, pageIndex: 1 });
    let calls = 0;
    assert.equal(await syncReadingPageSpeech('student', 5_000, async (pages) => {
      calls += 1;
      assert.equal(pages.length, 2);
      return pages.filter((page) => page.bookId === 'a');
    }), 1);
    assert.equal(calls, 1);
    assert.deepEqual(readReadingPageSummaries('student', 'a'), {});
    assert.equal(Object.keys(readReadingPageSummaries('student', 'b')).length, 1);
  });

  it('retains a page changed while the request is in flight', async () => {
    saveReadingPageSummary('student-changing', 'book', missed);
    await syncReadingPageSpeech('student-changing', 8_000, async (pages) => {
      saveReadingPageSummary('student-changing', 'book', { ...missed, correctWords: 2, missedWords: [], totalWords: 2 });
      return pages;
    });
    assert.equal(readReadingPageSummaries('student-changing', 'book')['0']?.correctWords, 2);
  });

  it('limits a daily upload to one 50-page request and keeps the rest queued', async () => {
    for (let pageIndex = 0; pageIndex < 51; pageIndex += 1) {
      saveReadingPageSummary('student-batch', 'book', { ...missed, pageIndex });
    }
    let calls = 0;
    assert.equal(await syncReadingPageSpeech('student-batch', 10_000, async (pages) => {
      calls += 1;
      assert.equal(pages.length, 50);
      return pages;
    }), 50);
    assert.equal(calls, 1);
    assert.equal(Object.keys(readReadingPageSummaries('student-batch', 'book')).length, 1);
  });

  it('does not requeue an unchanged page after server acknowledgement', async () => {
    saveReadingPageSummary('student-ack', 'book', missed);
    await syncReadingPageSpeech('student-ack', 11_000, async (pages) => pages);
    saveReadingPageSummary('student-ack', 'book', missed);
    assert.deepEqual(readReadingPageSummaries('student-ack', 'book'), {});
    saveReadingPageSummary('student-ack', 'book', { ...missed, correctWords: 2, missedWords: [] });
    assert.equal(readReadingPageSummaries('student-ack', 'book')['0']?.correctWords, 2);
  });

  it('does not attempt a request while offline', async () => {
    saveReadingPageSummary('student-offline', 'book', missed);
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } });
    let calls = 0;
    assert.equal(await syncReadingPageSpeech('student-offline', 9_000, async (pages) => { calls += 1; return pages; }), 0);
    assert.equal(calls, 0);
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  });
});
