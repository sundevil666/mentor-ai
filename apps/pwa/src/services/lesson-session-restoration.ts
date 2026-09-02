type RestorableLessonSession = {
  id: string;
  completedAt?: string;
};

export function resolveRestoredLessonSessions<T extends RestorableLessonSession>(
  restoredSession: T | null,
  savedPausedSession: T | null,
  updateResumeSessionId: string | null,
): { activeSession: T | null; pausedSession: T | null } {
  const shouldResumeAfterUpdate = Boolean(
    restoredSession
    && !restoredSession.completedAt
    && restoredSession.id === updateResumeSessionId,
  );

  return {
    activeSession: shouldResumeAfterUpdate ? restoredSession : null,
    pausedSession: shouldResumeAfterUpdate
      ? savedPausedSession
      : restoredSession && !restoredSession.completedAt
        ? restoredSession
        : savedPausedSession,
  };
}
