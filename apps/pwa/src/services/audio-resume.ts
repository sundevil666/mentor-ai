// Completion is historical: it must not discard a later replay's position.
export function resolveAudioResumePosition(position: number, duration: number): number {
  if (!Number.isFinite(position) || position < 0) return 0;
  if (Number.isFinite(duration) && duration > 0 && position >= duration - 0.5) return 0;
  return position;
}
