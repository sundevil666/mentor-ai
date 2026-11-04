type RestorableLessonSession = {
  id: string;
  completedAt?: string;
};

export function resolveRestoredLessonSessions<T extends RestorableLessonSession>(
  restoredSession: T | null,
  savedPausedSessions: T[],
  _updateResumeSessionId: string | null,
): { activeSession: T | null; pausedSessions: T[] } {
  const shouldResume = Boolean(
    restoredSession
    && !restoredSession.completedAt,
  );

  const pausedSessions = savedPausedSessions.filter((session) => !session.completedAt
    && (!shouldResume || session.id !== restoredSession?.id));

  return {
    activeSession: shouldResume ? restoredSession : null,
    pausedSessions,
  };
}

export function findResumableLessonSession<T extends RestorableLessonSession & {
  lesson: { id: string; lessonTemplateKey?: string };
}>(sessions: T[], templateKey: string): T | undefined {
  return [...sessions].reverse().find((session) => !session.completedAt
    && (session.lesson.lessonTemplateKey ?? session.lesson.id) === templateKey);
}
