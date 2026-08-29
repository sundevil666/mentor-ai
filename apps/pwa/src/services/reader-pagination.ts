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
