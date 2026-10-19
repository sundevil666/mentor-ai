import assert from 'node:assert/strict';
import { it } from 'node:test';
import { groupAudioCollections } from '../src/services/audio-collections.js';
import { storyLibrary } from '../src/services/story-library.js';

it('groups all Peter Pan chapters in book order while preserving standalone stories', () => {
  const entries = groupAudioCollections(storyLibrary);
  const book = entries.find((entry) => entry.collectionId === 'peter-pan');
  assert.equal(book?.items.length, 17);
  assert.deepEqual(book?.items.map((item) => item.collection?.position), Array.from({ length: 17 }, (_, index) => index + 1));
  assert.equal(entries.flatMap((entry) => entry.items).length, storyLibrary.length);
  assert.ok(entries.some((entry) => !entry.collectionId));
});

it('uses explicit entity identity, sorts chapters, and leaves single tracks uncollapsed', () => {
  const tracks = [
    { id: '2', title: 'Second', collection: { id: 'book', title: 'Book', position: 2 } },
    { id: 'solo', title: 'Book' },
    { id: '1', title: 'First', collection: { id: 'book', title: 'Book', position: 1 } },
    { id: 'single', title: 'Single', collection: { id: 'other', title: 'Other', position: 1 } },
  ];
  const entries = groupAudioCollections(tracks);
  assert.deepEqual(entries.map((entry) => entry.items.map((item) => item.id)), [['1', '2'], ['solo'], ['single']]);
  assert.equal(entries[2]?.collectionId, undefined);
  assert.equal(tracks[0]?.id, '2');
});
