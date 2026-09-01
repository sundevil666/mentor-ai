export interface ReaderSwipePoint {
  clientX: number;
  clientY: number;
}

export type ReaderSwipeDirection = 'previous' | 'next' | null;

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
