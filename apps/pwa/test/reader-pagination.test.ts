import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateReaderPageCount, calculateReaderPaginationGeometry, calculateReaderResumeScrollTop } from '../src/services/reader-pagination.js';

test('reader columns advance by exactly one viewport after accounting for nested padding', () => {
  const geometry = calculateReaderPaginationGeometry({
    viewportClientWidth: 390,
    paperClientWidth: 360,
    paperPaddingLeft: 15,
    paperPaddingRight: 15,
  });

  assert.deepEqual(geometry, {
    columnGap: 60,
    columnWidth: 330,
    pageWidth: 390,
  });
  assert.equal(geometry.columnWidth + geometry.columnGap, geometry.pageWidth);
});

test('reader geometry remains aligned when a wider sidebar narrows the page', () => {
  const geometry = calculateReaderPaginationGeometry({
    viewportClientWidth: 274,
    paperClientWidth: 244,
    paperPaddingLeft: 15,
    paperPaddingRight: 15,
  });

  assert.equal(geometry.columnWidth + geometry.columnGap, 274);
});

test('reader page count excludes paper padding from the horizontal column track', () => {
  assert.equal(calculateReaderPageCount({
    columnGap: 60,
    pageWidth: 390,
    paperPaddingLeft: 15,
    paperPaddingRight: 15,
    paperScrollWidth: 1_920,
  }), 5);
});

test('normal reader places the exact resume word near the upper reading line', () => {
  assert.equal(calculateReaderResumeScrollTop({
    viewportHeight: 600,
    wordOffsetTop: 1_200,
    scrollHeight: 3_000,
  }), 1_032);
});

test('normal reader resume scrolling stays inside the document bounds', () => {
  assert.equal(calculateReaderResumeScrollTop({ viewportHeight: 600, wordOffsetTop: 80, scrollHeight: 3_000 }), 0);
  assert.equal(calculateReaderResumeScrollTop({ viewportHeight: 600, wordOffsetTop: 2_950, scrollHeight: 3_000 }), 2_400);
});
