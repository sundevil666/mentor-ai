export interface ReaderPaginationGeometry {
  columnGap: number;
  columnWidth: number;
  pageWidth: number;
}

export function calculateReaderPaginationGeometry(input: {
  paperClientWidth: number;
  paperPaddingLeft: number;
  paperPaddingRight: number;
  viewportClientWidth: number;
}): ReaderPaginationGeometry {
  const pageWidth = Math.max(1, input.viewportClientWidth);
  const columnWidth = Math.max(1, input.paperClientWidth - input.paperPaddingLeft - input.paperPaddingRight);

  return {
    columnGap: Math.max(0, pageWidth - columnWidth),
    columnWidth,
    pageWidth,
  };
}

export function calculateReaderPageCount(input: {
  columnGap: number;
  pageWidth: number;
  paperPaddingLeft: number;
  paperPaddingRight: number;
  paperScrollWidth: number;
}) {
  const contentScrollWidth = input.paperScrollWidth - input.paperPaddingLeft - input.paperPaddingRight;
  return Math.max(1, Math.ceil((contentScrollWidth + input.columnGap - 1) / input.pageWidth));
}

export function calculateReaderResumeScrollTop(input: {
  viewportHeight: number;
  wordOffsetTop: number;
  scrollHeight: number;
}) {
  const viewportHeight = Math.max(0, input.viewportHeight);
  const maximumScrollTop = Math.max(0, input.scrollHeight - viewportHeight);
  const comfortableReadingOffset = viewportHeight * 0.28;
  return Math.max(0, Math.min(maximumScrollTop, input.wordOffsetTop - comfortableReadingOffset));
}
