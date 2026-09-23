import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateReaderPageCount, calculateReaderPaginationGeometry, calculateReaderResumeScrollTop, chooseReaderPersistedWordIndex, chooseReaderSpeechAnchor, chooseReaderSpeechStartAnchor, chooseReaderStopWordIndex, shouldRecordCompletedReaderPage } from '../src/services/reader-pagination.js';

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

test('saving after a swipe uses the first word on the newly opened page', () => {
  assert.equal(chooseReaderStopWordIndex({
    currentPageIndex: 4,
    highlightedWordIndex: 87,
    highlightedWordPageIndex: 3,
    pageWordIndex: 88,
  }), 88);
});

test('saving keeps the active highlight when it belongs to the current page', () => {
  assert.equal(chooseReaderStopWordIndex({
    currentPageIndex: 4,
    highlightedWordIndex: 93,
    highlightedWordPageIndex: 4,
    pageWordIndex: 88,
  }), 93);
});

test('closing preserves the exact saved stop instead of replacing it with the page start', () => {
  assert.equal(chooseReaderPersistedWordIndex({
    pageWordIndex: 80,
    resumeWordIndex: 93,
  }), 93);
});

test('closing falls back to the visible page when no exact stop exists', () => {
  assert.equal(chooseReaderPersistedWordIndex({
    pageWordIndex: 80,
    resumeWordIndex: -1,
  }), 80);
});

test('moving forward to a restored marker does not count the earlier page as read', () => {
  assert.equal(shouldRecordCompletedReaderPage({
    currentPageIndex: 3,
    destinationPageIndex: 4,
    resumePageIndex: 4,
  }), false);
});

test('moving forward after reaching the restored marker counts the completed page', () => {
  assert.equal(shouldRecordCompletedReaderPage({
    currentPageIndex: 4,
    destinationPageIndex: 5,
    resumePageIndex: 4,
  }), true);
});

test('normal forward paging without a restored marker still counts the completed page', () => {
  assert.equal(shouldRecordCompletedReaderPage({
    currentPageIndex: 3,
    destinationPageIndex: 4,
    resumePageIndex: -1,
  }), true);
});

test('speech follows the destination page before a smooth scroll finishes', () => {
  assert.equal(chooseReaderSpeechAnchor({
    destinationPageWordIndex: 120,
    visibleWordIndex: 96,
    currentAnchor: 101,
  }), 120);
});

test('speech anchor falls back safely when page geometry is unavailable', () => {
  assert.equal(chooseReaderSpeechAnchor({
    destinationPageWordIndex: -1,
    visibleWordIndex: 96,
    currentAnchor: 101,
  }), 96);
  assert.equal(chooseReaderSpeechAnchor({
    destinationPageWordIndex: -1,
    visibleWordIndex: -1,
    currentAnchor: 101,
  }), 101);
});

test('restarting speech keeps confirmed progress within the current page', () => {
  assert.equal(chooseReaderSpeechStartAnchor({
    currentPageIndex: 4,
    currentAnchor: 119,
    currentAnchorPageIndex: 4,
    selectedWordIndex: -1,
    selectedWordPageIndex: -1,
    visibleWordIndex: 96,
  }), 119);
});

test('speech starts from an explicitly selected word on the current page', () => {
  assert.equal(chooseReaderSpeechStartAnchor({
    currentPageIndex: 4,
    currentAnchor: 119,
    currentAnchorPageIndex: 4,
    selectedWordIndex: 127,
    selectedWordPageIndex: 4,
    visibleWordIndex: 96,
  }), 127);
});

test('starting speech uses the visible page when saved speech progress belongs elsewhere', () => {
  assert.equal(chooseReaderSpeechStartAnchor({
    currentPageIndex: 4,
    currentAnchor: 87,
    currentAnchorPageIndex: 3,
    selectedWordIndex: -1,
    selectedWordPageIndex: -1,
    visibleWordIndex: 96,
  }), 96);
});
