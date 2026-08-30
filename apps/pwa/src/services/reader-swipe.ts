export interface ReaderSwipePoint {
  clientX: number;
  clientY: number;
}

export type ReaderSwipeDirection = 'previous' | 'next' | null;

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
