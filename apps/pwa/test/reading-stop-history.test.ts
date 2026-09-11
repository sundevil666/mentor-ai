import assert from 'node:assert/strict';
import test from 'node:test';
import { addReadingStopHistoryEntry, parseReadingStopHistory, readingStopHistoryLimit, type ReadingStopHistoryEntry } from '../src/services/reading-stop-history.js';

test('shows the newest saved reading place first', () => {
  const history = addReadingStopHistoryEntry([
    { id: 'old', wordIndex: 4, word: 'first', savedAt: '2026-09-11T08:00:00.000Z' },
  ], { id: 'new', wordIndex: 18, word: 'latest', savedAt: '2026-09-11T09:00:00.000Z' });

  assert.deepEqual(history.map((entry) => entry.word), ['latest', 'first']);
});

test('restores a valid history in reverse chronological order and rejects damaged data', () => {
  const raw = JSON.stringify([
    { id: 'new', wordIndex: 18, word: 'latest', savedAt: '2026-09-11T09:00:00.000Z' },
    { id: 'broken', wordIndex: -1, word: '', savedAt: 'not-a-date' },
    { id: 'old', wordIndex: 4, word: 'first', savedAt: '2026-09-11T08:00:00.000Z' },
  ]);

  assert.deepEqual(parseReadingStopHistory(raw).map((entry) => entry.id), ['new', 'old']);
  assert.deepEqual(parseReadingStopHistory('{broken'), []);
});

test('keeps a small bounded reading history', () => {
  let history: ReadingStopHistoryEntry[] = [];
  for (let index = 0; index < readingStopHistoryLimit + 5; index += 1) {
    history = addReadingStopHistoryEntry(history, {
      id: String(index), wordIndex: index, word: `word-${index}`, savedAt: new Date(index * 1_000).toISOString(),
    });
  }
  assert.equal(history.length, readingStopHistoryLimit);
  assert.equal(history[0]?.word, `word-${readingStopHistoryLimit + 4}`);
});
