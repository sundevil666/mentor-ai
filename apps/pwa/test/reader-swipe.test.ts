import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateReaderDragOffset, detectReaderSwipe, isReaderHorizontalDrag } from '../src/services/reader-swipe.js';

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

test('horizontal movement starts following the finger before touch end', () => {
  assert.equal(isReaderHorizontalDrag({ clientX: 200, clientY: 200 }, { clientX: 185, clientY: 202 }), true);
  assert.equal(isReaderHorizontalDrag({ clientX: 200, clientY: 200 }, { clientX: 195, clientY: 202 }), false);
  assert.equal(isReaderHorizontalDrag({ clientX: 200, clientY: 200 }, { clientX: 185, clientY: 220 }), false);
});

test('drag offset follows the finger and resists unavailable edge pages', () => {
  const start = { clientX: 200, clientY: 200 };
  assert.equal(calculateReaderDragOffset(start, { clientX: 120, clientY: 202 }, true, true), -80);
  assert.ok(Math.abs(calculateReaderDragOffset(start, { clientX: 280, clientY: 202 }, false, true) - 14.4) < 0.001);
  assert.ok(Math.abs(calculateReaderDragOffset(start, { clientX: 120, clientY: 202 }, true, false) + 14.4) < 0.001);
});
