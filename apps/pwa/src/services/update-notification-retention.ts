export interface RetainableUpdateNotification {
  id: string;
  createdAt: string;
  readAt: string | null;
}

export const minimumReadUpdateNotifications = 5;

export function selectRetainedUpdateNotifications<T extends RetainableUpdateNotification>(
  notifications: T[],
  readLimit = minimumReadUpdateNotifications,
): T[] {
  const sorted = [...notifications].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const retainedReadIds = new Set(
    sorted.filter((notification) => notification.readAt !== null).slice(0, readLimit).map((notification) => notification.id),
  );

  return sorted.filter((notification) => notification.readAt === null || retainedReadIds.has(notification.id));
}
