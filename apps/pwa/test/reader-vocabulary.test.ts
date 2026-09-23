import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ReaderVocabularyItem } from '@mentor-ai/shared';
import { isReaderVocabularyBatchAcknowledged, mergeVocabularyContexts } from '../src/services/reader-vocabulary-model.js';

const baseItem: ReaderVocabularyItem = {
  id: 'reader-vocabulary:student:charge',
  studentId: 'student',
  bookId: 'book',
  text: 'charge',
  normalizedText: 'charge',
  kind: 'word',
  translation: '',
  lookupCount: 1,
  syncMode: 'delta-v1',
  syncBatchId: 'batch-one',
  firstLookedUpAt: '2026-09-20T10:00:00.000Z',
  lastLookedUpAt: '2026-09-20T10:00:00.000Z',
};

describe('reader vocabulary outbox', () => {
  it('deletes only a batch acknowledged with the same idempotency key', () => {
    assert.equal(isReaderVocabularyBatchAcknowledged(baseItem, { ...baseItem, syncBatchId: 'batch-one' }), true);
    assert.equal(isReaderVocabularyBatchAcknowledged(baseItem, { ...baseItem, syncBatchId: 'newer-batch', appliedSyncBatchIds: ['batch-one', 'newer-batch'] }), true);
    assert.equal(isReaderVocabularyBatchAcknowledged(baseItem, { ...baseItem, syncBatchId: 'older-batch' }), false);
    assert.equal(isReaderVocabularyBatchAcknowledged(baseItem), false);
  });

  it('combines repeated context and retains only five recent examples', () => {
    const context = {
      text: 'He was charged with theft.',
      bookId: 'book',
      lookupCount: 1,
      firstLookedUpAt: '2026-09-20T10:00:00.000Z',
      lastLookedUpAt: '2026-09-20T10:00:00.000Z',
    };
    let contexts = mergeVocabularyContexts([], context);
    contexts = mergeVocabularyContexts(contexts, { ...context, lastLookedUpAt: '2026-09-21T10:00:00.000Z' });
    assert.equal(contexts[0]?.lookupCount, 2);
    for (let index = 0; index < 6; index += 1) {
      contexts = mergeVocabularyContexts(contexts, {
        ...context,
        text: `Example ${index}.`,
        lastLookedUpAt: `2026-09-2${index + 1}T12:00:00.000Z`,
      });
    }

    assert.equal(contexts.length, 5);
    assert.equal(contexts.some((candidate) => candidate.text === context.text), false);
    assert.equal(contexts.find((candidate) => candidate.text === 'Example 0.'), undefined);
  });
});
