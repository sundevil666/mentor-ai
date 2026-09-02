type RestorableLessonSession = {
  id: string;
  completedAt?: string;
};

export function resolveRestoredLessonSessions<T extends RestorableLessonSession>(
  restoredSession: T | null,
  savedPausedSessions: T[],
  updateResumeSessionId: string | null,
): { activeSession: T | null; pausedSessions: T[] } {
  const shouldResumeAfterUpdate = Boolean(
    restoredSession
    && !restoredSession.completedAt
    && restoredSession.id === updateResumeSessionId,
  );

  const pausedSessions = savedPausedSessions.filter((session) => !session.completedAt);
  if (restoredSession && !restoredSession.completedAt && !shouldResumeAfterUpdate) {
    const existingIndex = pausedSessions.findIndex((session) => session.id === restoredSession.id);
    if (existingIndex >= 0) pausedSessions.splice(existingIndex, 1);
    pausedSessions.push(restoredSession);
  }

  return {
    activeSession: shouldResumeAfterUpdate ? restoredSession : null,
    pausedSessions,
  };
}
