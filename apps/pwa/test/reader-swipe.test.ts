import assert from 'node:assert/strict';
import test from 'node:test';
import { detectReaderSwipe } from '../src/services/reader-swipe.js';

test('a horizontal swipe left advances exactly one reader page', () => {
  assert.equal(detectReaderSwipe({ clientX: 300, clientY: 200 }, { clientX: 190, clientY: 205 }), 'next');
});

test('a horizontal swipe right returns exactly one reader page', () => {
  assert.equal(detectReaderSwipe({ clientX: 120, clientY: 200 }, { clientX: 230, clientY: 195 }), 'previous');
});

test('short taps and primarily vertical gestures do not turn a page', () => {
  assert.equal(detectReaderSwipe({ clientX: 200, clientY: 200 }, { clientX: 165, clientY: 202 }), null);
  assert.equal(detectReaderSwipe({ clientX: 200, clientY: 100 }, { clientX: 140, clientY: 220 }), null);
});
