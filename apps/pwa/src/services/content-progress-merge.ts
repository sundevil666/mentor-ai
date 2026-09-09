import type { ContentProgress } from '@mentor-ai/shared';

export function mergeContentProgressForStorage(current: ContentProgress | undefined, remote: ContentProgress) {
  if (!current) return remote;
  const newest = current.updatedAt > remote.updatedAt ? current : remote;
  return {
    ...newest,
    furthestPosition: Math.max(current.furthestPosition, remote.furthestPosition),
    duration: Math.max(current.duration ?? 0, remote.duration ?? 0) || undefined,
    completed: current.completed || remote.completed,
  };
}
