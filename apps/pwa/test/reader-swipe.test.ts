import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateReaderDragOffset, detectReaderSwipe, isReaderHorizontalDrag, isReaderHorizontalWheel, normalizeReaderWheelDelta, readerWheelDestination, shouldCommitReaderWheel } from '../src/services/reader-swipe.js';

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

test('trackpad navigation accepts horizontal gestures and leaves vertical scrolling alone', () => {
  assert.equal(isReaderHorizontalWheel({ deltaX: 24, deltaY: 3 }, 700), true);
  assert.equal(isReaderHorizontalWheel({ deltaX: 4, deltaY: 28 }, 700), false);
  assert.equal(isReaderHorizontalWheel({ deltaX: 0.4, deltaY: 0 }, 700), false);
});

test('trackpad deltas use browser delta mode units', () => {
  assert.deepEqual(normalizeReaderWheelDelta({ deltaX: 3, deltaY: 1, deltaMode: 1 }, 700), { deltaX: 48, deltaY: 16 });
  assert.deepEqual(normalizeReaderWheelDelta({ deltaX: 1, deltaY: 0, deltaMode: 2 }, 700), { deltaX: 700, deltaY: 0 });
});

test('one trackpad gesture turns at most one page and respects book edges', () => {
  assert.equal(readerWheelDestination(4, 10, 41), 4);
  assert.equal(readerWheelDestination(4, 10, 42), 5);
  assert.equal(readerWheelDestination(4, 10, -80), 3);
  assert.equal(readerWheelDestination(9, 10, 500), 9);
  assert.equal(readerWheelDestination(0, 10, -500), 0);
});

test('a trackpad gesture commits as soon as it crosses the paging threshold', () => {
  assert.equal(shouldCommitReaderWheel(41.9), false);
  assert.equal(shouldCommitReaderWheel(42), true);
  assert.equal(shouldCommitReaderWheel(-90), true);
});
