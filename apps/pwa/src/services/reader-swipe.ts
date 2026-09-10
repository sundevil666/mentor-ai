export interface ReaderSwipePoint {
  clientX: number;
  clientY: number;
}

export type ReaderSwipeDirection = 'previous' | 'next' | null;

export interface ReaderWheelDelta {
  deltaX: number;
  deltaY: number;
  deltaMode?: number;
}

export function isReaderHorizontalDrag(
  start: ReaderSwipePoint,
  current: ReaderSwipePoint,
  activationDistance = 8,
) {
  const deltaX = current.clientX - start.clientX;
  const deltaY = current.clientY - start.clientY;
  return Math.abs(deltaX) >= activationDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
}

export function calculateReaderDragOffset(
  start: ReaderSwipePoint,
  current: ReaderSwipePoint,
  canGoPrevious: boolean,
  canGoNext: boolean,
) {
  const deltaX = current.clientX - start.clientX;
  const isBlockedAtEdge = (deltaX > 0 && !canGoPrevious) || (deltaX < 0 && !canGoNext);
  return deltaX * (isBlockedAtEdge ? 0.18 : 1);
}

export function detectReaderSwipe(
  start: ReaderSwipePoint,
  end: ReaderSwipePoint,
  minimumDistance = 48,
): ReaderSwipeDirection {
  const deltaX = end.clientX - start.clientX;
  const deltaY = end.clientY - start.clientY;

  if (Math.abs(deltaX) < minimumDistance || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return null;
  return deltaX < 0 ? 'next' : 'previous';
}

export function normalizeReaderWheelDelta(event: ReaderWheelDelta, pageHeight: number) {
  const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pageHeight : 1;
  return {
    deltaX: event.deltaX * multiplier,
    deltaY: event.deltaY * multiplier,
  };
}

export function isReaderHorizontalWheel(event: ReaderWheelDelta, pageHeight: number) {
  const { deltaX, deltaY } = normalizeReaderWheelDelta(event, pageHeight);
  return Math.abs(deltaX) >= 1 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1;
}

export function readerWheelDestination(
  pageIndex: number,
  pageCount: number,
  accumulatedDeltaX: number,
  minimumDistance = 42,
) {
  if (Math.abs(accumulatedDeltaX) < minimumDistance) return pageIndex;
  return Math.max(0, Math.min(pageCount - 1, pageIndex + (accumulatedDeltaX > 0 ? 1 : -1)));
}

export function shouldCommitReaderWheel(accumulatedDeltaX: number, minimumDistance = 42) {
  return Math.abs(accumulatedDeltaX) >= minimumDistance;
}
