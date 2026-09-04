import { defineStore } from 'pinia';
import {
  createEvidenceId,
  createLessonPlan,
  createObservationFromResults,
  createRecommendationFromModel,
  analyzePronunciationAttempt,
  demoStudent,
  generateLessonFromPlan,
  initialStudentModel,
  scoreExercise,
  updateStudentModelFromResults,
  type ActivitySnapshot,
  type DeviceSurface,
  type Exercise,
  type ExerciseResult,
  type GeneratedLesson,
  type LearningSessionHandoff,
  type LearningEvent,
  type LearningContext,
  type Observation,
  type Recommendation,
  type SpeechResult,
  type StatisticsSnapshot,
  type StorageMode,
  type StudentModel,
  type WorkShift,
} from '@mentor-ai/shared';
import {
  fetchCurrentLesson,
  fetchSessionHandoffs,
  fetchStudentState,
  synchronizeLearningEvidence,
  synchronizeStatisticsSnapshots,
  upsertSessionHandoff,
} from 'src/services/api-client';
import { createActivityReason, inferActivitySuggestion } from 'src/services/activity-suggestion';
import { createCurrentActivitySuggestion } from 'src/services/learning-context';
import { registerLearningBackgroundSync } from 'src/services/background-sync';
import { logDiagnostic } from 'src/services/diagnostics';
import { mentorDb } from 'src/services/indexed-db';
import {
  clearAuthSession,
  readAuthSession,
  saveAuthSession,
  type AuthSession,
} from 'src/services/auth';
import {
  compactAcknowledgedSyncEvent,
  defaultRetentionPolicy,
  selectRecordsToPrune,
  type RetentionRecord,
} from 'src/services/storage-retention';
import {
  readPreferredWorkShift,
  savePreferredWorkShift,
} from 'src/services/user-preferences';
import { formatDisplayDate } from 'src/services/date-format';
import { saveContentProgress } from 'src/services/content-progress';
import { recordLearningActivity } from 'src/services/learning-activity';
import {
  fetchMyShiftActivity,
  isMyShiftConnected,
  isMyShiftSyncDue,
  type MyShiftActivity,
} from 'src/services/my-shift';
import { cacheMyShiftActivity, readCachedMyShiftActivity } from 'src/services/my-shift-cache';
import { findOfflineLesson } from 'src/services/offline-library';
import { selectRetainedUpdateNotifications } from 'src/services/update-notification-retention';
import { resolveRestoredLessonSessions } from 'src/services/lesson-session-restoration';
import { rewindLessonSession } from 'src/services/lesson-step-navigation';

interface LearningSessionState {
  id: string;
  lesson: GeneratedLesson;
  context: LearningContext;
  currentExerciseIndex: number;
  startedAt: string;
  exerciseStartedAt: string;
  events: LearningEvent[];
  results: ExerciseResult[];
  speechResults: SpeechResult[];
  observation?: Observation;
  recommendation?: Recommendation;
  completedAt?: string;
}

export interface UpdateNotification {
  id: string;
  version: string;
  title: string;
  message: string;
  createdAt: string;
  viewedAt: string | null;
  readAt: string | null;
  kind?: 'app' | 'lessons';
}

type QueuedLearningEvent = LearningEvent & {
  status: string;
  exerciseResults?: ExerciseResult[];
  speechResults?: SpeechResult[];
};

interface AppState {
  storageMode: StorageMode;
  studentId: string;
  studentDisplayName: string;
  authSession: AuthSession | null;
  isOfflineReady: boolean;
  isOnline: boolean;
  studentModel: StudentModel;
  session: LearningSessionState | null;
  pausedSessions: LearningSessionState[];
  latestRecommendation: Recommendation | null;
  statisticsSnapshots: StatisticsSnapshot[];
  activitySnapshots: ActivitySnapshot[];
  preferredWorkShift: WorkShift;
  myShiftActivity: MyShiftActivity | null;
  myShiftSyncError: string | null;
  myShiftLastSyncAt: string | null;
  pendingSyncEvents: number;
  lastSyncAt: string | null;
  lastRemoteProgressAt: string | null;
  isSyncRefreshing: boolean;
  updateNotifications: UpdateNotification[];
  availableAppUpdate: { version: string; message?: string } | null;
  isAppUpdateInstalling: boolean;
  isAppUpdateRunningInBackground: boolean;
  sessionHandoffs: LearningSessionHandoff[];
  isHydrated: boolean;
}

const sessionStoreKey = 'active-session';
const pausedSessionStoreKey = 'paused-session';
const pausedSessionStoreKeyPrefix = 'paused-session:';
const sessionCheckpointKey = 'mentor-ai:active-session-checkpoint';
const updateResumeSessionKey = 'mentor-ai:resume-session-after-update';
let hydrationInFlight: Promise<void> | null = null;

function readSessionCheckpoint(): LearningSessionState | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const candidate = JSON.parse(localStorage.getItem(sessionCheckpointKey) ?? 'null') as Partial<LearningSessionState> | null;
    if (
      !candidate
      || typeof candidate.id !== 'string'
      || !candidate.lesson
      || !Array.isArray(candidate.lesson.exercises)
      || typeof candidate.currentExerciseIndex !== 'number'
      || candidate.currentExerciseIndex < 0
      || candidate.currentExerciseIndex >= candidate.lesson.exercises.length
      || !candidate.context
      || !Array.isArray(candidate.events)
      || !Array.isArray(candidate.results)
      || !Array.isArray(candidate.speechResults)
    ) {
      return null;
    }

    return candidate as LearningSessionState;
  } catch {
    return null;
  }
}

function writeSessionCheckpoint(session: LearningSessionState) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(sessionCheckpointKey, JSON.stringify(session));
  } catch {
    // IndexedDB remains the primary session store when synchronous storage is unavailable.
  }
}

function clearSessionCheckpoint() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(sessionCheckpointKey);
  } catch {
    // Ignore unavailable synchronous storage.
  }
}

function readUpdateResumeSessionId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(updateResumeSessionKey);
  } catch {
    return null;
  }
}

function writeUpdateResumeSessionId(sessionId: string) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(updateResumeSessionKey, sessionId);
  } catch {
    // The persisted session still remains available as a paused lesson.
  }
}

function clearUpdateResumeSessionId() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(updateResumeSessionKey);
  } catch {
    // Ignore unavailable synchronous storage.
  }
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    storageMode: 'demo',
    studentId: demoStudent.id,
    studentDisplayName: demoStudent.displayName,
    authSession: readAuthSession(),
    isOfflineReady: true,
    isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
    studentModel: initialStudentModel,
    session: null,
    pausedSessions: [],
    latestRecommendation: null,
    statisticsSnapshots: [],
    activitySnapshots: [],
    preferredWorkShift: 'unknown',
    myShiftActivity: null,
    myShiftSyncError: null,
    myShiftLastSyncAt: null,
    pendingSyncEvents: 0,
    lastSyncAt: null,
    lastRemoteProgressAt: null,
    isSyncRefreshing: false,
    updateNotifications: [],
    availableAppUpdate: null,
    isAppUpdateInstalling: false,
    isAppUpdateRunningInBackground: false,
    sessionHandoffs: [],
    isHydrated: false,
  }),

  getters: {
    currentExercise: (state): Exercise | null => state.session?.lesson.exercises[state.session.currentExerciseIndex] ?? null,
    pausedSession: (state): LearningSessionState | null => state.pausedSessions[state.pausedSessions.length - 1] ?? null,
    isLessonComplete: (state): boolean => Boolean(state.session?.completedAt),
    pendingSyncCount: (state): number => state.pendingSyncEvents,
    lessonProgress: (state): number => {
      if (!state.session) {
        return 0;
      }

      const completedExercises = state.session.completedAt
        ? state.session.lesson.exercises.length
        : state.session.currentExerciseIndex;

      return Math.round((completedExercises / state.session.lesson.exercises.length) * 100);
    },
    completedLessonsCount: (state): number => state.statisticsSnapshots.length,
    latestStatistics: (state): StatisticsSnapshot | null => state.statisticsSnapshots[state.statisticsSnapshots.length - 1] ?? null,
    latestActivitySnapshot: (state): ActivitySnapshot | null => state.activitySnapshots[state.activitySnapshots.length - 1] ?? null,
    unreadUpdateNotificationCount: (state): number =>
      state.updateNotifications.filter((notification) => notification.readAt === null).length,
    latestUpdateNotification: (state): UpdateNotification | null => state.updateNotifications[0] ?? null,
    remoteSessionHandoffs: (state): LearningSessionHandoff[] => state.sessionHandoffs,
  },

  actions: {
    setAvailableAppUpdate(version: string, message?: string) {
      this.availableAppUpdate = { version, message };
    },

    setAppUpdateInstalling(isInstalling: boolean) {
      this.isAppUpdateInstalling = isInstalling;
    },

    setAppUpdateRunningInBackground(isUpdating: boolean) {
      this.isAppUpdateRunningInBackground = isUpdating;
    },

    async hydrate() {
      if (this.isHydrated) return;
      if (hydrationInFlight) {
        await hydrationInFlight;
        return;
      }

      hydrationInFlight = (async () => {
      const db = await mentorDb;
      const savedModel = await db.get('student-models', initialStudentModel.id);
      const savedSession = await db.get('learning-sessions', sessionStoreKey);
      const savedPausedSession = await db.get('learning-sessions', pausedSessionStoreKey);
      const learningSessionKeys = await db.getAllKeys('learning-sessions');
      const savedPausedSessions = await Promise.all(
        learningSessionKeys
          .filter((key): key is string => typeof key === 'string' && key.startsWith(pausedSessionStoreKeyPrefix))
          .map((key) => db.get('learning-sessions', key)),
      );
      const checkpointSession = readSessionCheckpoint();
      const updateResumeSessionId = readUpdateResumeSessionId();
      const statistics = await db.getAll('statistics');
      const activitySnapshots = await db.getAll('activity-snapshots');
      const queuedEvents = await db.getAll('sync-queue');
      const updateNotifications = await db.getAll('update-notifications');
      const myShiftCache = await readCachedMyShiftActivity();

      this.studentModel = (savedModel as StudentModel | undefined) ?? initialStudentModel;
      const restoredSession = checkpointSession ?? (savedSession as LearningSessionState | undefined) ?? null;
      const restoredSessions = resolveRestoredLessonSessions(
        restoredSession,
        [
          ...savedPausedSessions.filter((session): session is LearningSessionState => Boolean(session)),
          ...savedPausedSession ? [savedPausedSession as LearningSessionState] : [],
        ],
        updateResumeSessionId,
      );
      this.session = restoredSessions.activeSession ? toStorageRecord(restoredSessions.activeSession) : null;
      this.pausedSessions = deduplicatePausedSessions(restoredSessions.pausedSessions.map(toStorageRecord));
      clearSessionCheckpoint();
      clearUpdateResumeSessionId();
      if (!this.session) await db.delete('learning-sessions', sessionStoreKey);
      await this.persistPausedSessions();
      this.latestRecommendation = restoredSession?.recommendation ?? createRecommendationFromModel(this.studentModel, now());
      this.statisticsSnapshots = (statistics as StatisticsSnapshot[]).sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      );
      this.activitySnapshots = (activitySnapshots as ActivitySnapshot[]).sort((left, right) =>
        left.observedAt.localeCompare(right.observedAt),
      );
      this.preferredWorkShift = readPreferredWorkShift()
        ?? this.activitySnapshots[this.activitySnapshots.length - 1]?.workShift
        ?? 'unknown';
      this.pendingSyncEvents = queuedEvents.filter((event) => event.status === 'pending').length;
      this.updateNotifications = selectRetainedUpdateNotifications(updateNotifications as UpdateNotification[]);
      const retainedNotificationIds = new Set(this.updateNotifications.map((notification) => notification.id));
      for (const notification of updateNotifications as UpdateNotification[]) {
        if (!retainedNotificationIds.has(notification.id)) await db.delete('update-notifications', notification.id);
      }
      this.myShiftActivity = myShiftCache?.activity ?? null;
      this.myShiftLastSyncAt = myShiftCache?.synchronizedAt ?? null;
      this.isOnline = navigator.onLine;
      this.authSession = readAuthSession();
      if (this.authSession) {
        this.studentId = this.authSession.user.id;
        this.studentDisplayName = this.authSession.user.displayName;
      }
      this.isHydrated = true;

      logDiagnostic('app.hydrated', {
        hasActiveSession: this.session !== null,
        modelVersion: this.studentModel.version,
        pendingSyncEvents: this.pendingSyncEvents,
        storageMode: this.storageMode,
      });

      if (this.pendingSyncEvents > 0) {
        await this.registerBackgroundSync();
      }

      await this.pruneLocalStorage();

      if (this.isOnline) {
        await this.refreshMyShiftActivity(false);
        await this.refreshRemoteLearningState();
      }
      })();

      try {
        await hydrationInFlight;
      } finally {
        hydrationInFlight = null;
      }
    },

    setNetworkStatus(isOnline: boolean) {
      this.isOnline = isOnline;

      if (isOnline) {
        void this.refreshMyShiftActivity(false);
        void this.publishLocalProgressAfterReconnect();
      }
    },

    async publishLocalProgressAfterReconnect() {
      await this.publishSessionHandoff();
      await this.refreshRemoteLearningState();
    },

    async startLesson(context?: LearningContext, forceRefresh = false) {
      const createdAt = now();
      const learningContext =
        context ?? createDefaultLearningContext(this.activitySnapshots, this.preferredWorkShift, this.myShiftActivity);
      const lesson = await this.loadLesson(learningContext, createdAt, forceRefresh);
      const sessionId = createSessionId(createdAt);
      const firstExercise = lesson.exercises[0];
      const startedEvent = createLearningEvent(this.studentId, sessionId, lesson, undefined, 'lesson-started', createdAt);
      const firstExerciseEvent = createLearningEvent(
        this.studentId,
        sessionId,
        lesson,
        firstExercise?.id,
        'exercise-started',
        createdAt,
      );

      this.session = {
        id: sessionId,
        lesson,
        context: learningContext,
        currentExerciseIndex: 0,
        startedAt: createdAt,
        exerciseStartedAt: createdAt,
        events: [startedEvent, firstExerciseEvent],
        results: [],
        speechResults: [],
      };
      this.latestRecommendation = createRecommendationFromModel(this.studentModel, createdAt);

      await this.persistActivitySnapshot(createActivitySnapshot(this.studentId, learningContext, sessionId, createdAt));
      await this.persistSession();
      await this.publishSessionHandoff();
      logDiagnostic('lesson.started', {
        sessionId,
        lessonId: lesson.id,
        concept: lesson.concept,
        exerciseCount: lesson.exercises.length,
        online: navigator.onLine,
      });
    },

    async loadLesson(context: LearningContext, createdAt: string, forceRefresh = false): Promise<GeneratedLesson> {
      if (navigator.onLine) {
        try {
          const lesson = await fetchCurrentLesson(context, forceRefresh);
          logDiagnostic('lesson.loaded', { lessonId: lesson.id, source: 'api' });
          return lesson;
        } catch (error) {
          logDiagnostic('lesson.api_fallback', { reason: getErrorMessage(error) }, 'warn');
          // Keep offline-first practice usable when the API is temporarily unavailable.
        }
      }

      const offlineLesson = await findOfflineLesson(context);
      if (offlineLesson) {
        logDiagnostic('lesson.loaded', { lessonId: offlineLesson.id, source: 'offline-library' });
        return offlineLesson;
      }

      const plan = createLessonPlan(this.studentModel, context, createdAt);
      const lesson = generateLessonFromPlan(plan, createdAt);
      logDiagnostic('lesson.loaded', { lessonId: lesson.id, source: 'local' });
      return lesson;
    },

    async setPreferredWorkShift(workShift: WorkShift) {
      this.preferredWorkShift = workShift;
      savePreferredWorkShift(workShift);
    },

    async refreshMyShiftActivity(force = true) {
      if (!navigator.onLine || !isMyShiftConnected()) return;
      if (!force && !isMyShiftSyncDue(this.myShiftLastSyncAt)) return;

      const today = new Date();
      const from = toLocalDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
      const to = toLocalDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7));

      try {
        const activity = await fetchMyShiftActivity(from, to);
        const cached = await cacheMyShiftActivity(activity);
        this.myShiftActivity = activity;
        this.myShiftLastSyncAt = cached.synchronizedAt;
        this.myShiftSyncError = null;
      } catch (error) {
        this.myShiftSyncError = getErrorMessage(error);
        logDiagnostic('my_shift.sync_failed', { reason: this.myShiftSyncError }, 'warn');
      }
    },

    async submitCurrentExercise(response: string) {
      if (!this.session || this.currentExercise === null) {
        return;
      }

      const submittedAt = now();
      const exercise = this.currentExercise;
      const finishedEvent = createLearningEvent(
        this.studentId,
        this.session.id,
        this.session.lesson,
        exercise.id,
        'exercise-finished',
        submittedAt,
      );
      const result = createExerciseResult(
        this.studentId,
        this.session.id,
        this.session.lesson,
        exercise,
        response,
        submittedAt,
        Math.max(0, Date.parse(submittedAt) - Date.parse(this.session.exerciseStartedAt)),
        createEvidenceId(finishedEvent),
      );

      this.session.events.push(finishedEvent);
      this.session.results.push(result);
      logDiagnostic('exercise.completed', {
        sessionId: this.session.id,
        lessonId: this.session.lesson.id,
        exerciseId: exercise.id,
        correct: result.correct,
        responseTimeMs: result.responseTimeMs,
      });

      if (exercise.type === 'repeat-speaking' || exercise.type === 'dialogue-translation') {
        this.session.speechResults.push(
          createSpeechResult(
            this.studentId,
            this.session.id,
            exercise,
            response,
            submittedAt,
            Math.max(0, Date.parse(submittedAt) - Date.parse(this.session.exerciseStartedAt)),
            response.trim().length > 0,
          ),
        );
        this.session.events.push(
          createLearningEvent(
            this.studentId,
            this.session.id,
            this.session.lesson,
            exercise.id,
            'speech-attempted',
            submittedAt,
          ),
        );
      }

      const nextIndex = this.session.currentExerciseIndex + 1;

      if (nextIndex >= this.session.lesson.exercises.length) {
        await this.finishLesson(submittedAt);
        return;
      }

      const nextExercise = this.session.lesson.exercises[nextIndex];
      this.session.currentExerciseIndex = nextIndex;
      this.session.exerciseStartedAt = submittedAt;
      this.session.events.push(
        createLearningEvent(
          this.studentId,
          this.session.id,
          this.session.lesson,
          nextExercise.id,
          'exercise-started',
          submittedAt,
        ),
      );

      await this.persistSession();
      await this.publishSessionHandoff();
    },

    async replayAudio() {
      if (!this.session || this.currentExercise === null) {
        return;
      }

      this.session.events.push(
        createLearningEvent(
          this.studentId,
          this.session.id,
          this.session.lesson,
          this.currentExercise.id,
          'audio-replayed',
          now(),
        ),
      );

      await this.persistSession();
      await this.publishSessionHandoff();
    },

    async completeListeningStep() {
      if (!this.session || this.currentExercise === null) {
        return;
      }

      const exercise = this.currentExercise;

      if (
        exercise.type !== 'listening-text' &&
        !(this.session.context.mode === 'listening' && exercise.targetSkill === 'listening')
      ) {
        return;
      }

      await this.submitCurrentExercise(exercise.expectedResponse ?? exercise.audioText ?? 'listened');
    },

    async returnToLessonChoice() {
      if (!this.session) {
        return;
      }

      if (!this.session.completedAt) {
        this.pausedSessions = upsertPausedSession(this.pausedSessions, this.session);
      }
      this.session = null;
      clearSessionCheckpoint();
      const db = await mentorDb;
      await this.persistPausedSessions();
      await db.delete('learning-sessions', sessionStoreKey);
    },

    async returnToPreviousExercise() {
      if (!this.session) {
        return false;
      }

      const revisitedAt = now();
      const exerciseId = rewindLessonSession(this.session, revisitedAt);

      if (!exerciseId) {
        return false;
      }

      this.session.events.push(
        createLearningEvent(
          this.studentId,
          this.session.id,
          this.session.lesson,
          exerciseId,
          'exercise-started',
          revisitedAt,
        ),
      );
      await this.persistSession();
      await this.publishSessionHandoff();
      return true;
    },

    async resumePausedLesson(expectedSessionId?: string) {
      const pausedSession = expectedSessionId
        ? this.pausedSessions.find((session) => session.id === expectedSessionId)
        : this.pausedSessions[this.pausedSessions.length - 1];
      if (!pausedSession) return false;
      this.session = toStorageRecord(pausedSession);
      this.pausedSessions = this.pausedSessions.filter((session) => session.id !== pausedSession.id);
      await this.persistPausedSessions();
      await this.persistSession();
      await this.publishSessionHandoff();
      return true;
    },

    async dismissPausedLesson(sessionId: string) {
      if (!this.pausedSessions.some((session) => session.id === sessionId)) return false;
      this.pausedSessions = this.pausedSessions.filter((session) => session.id !== sessionId);
      await this.persistPausedSessions();
      return true;
    },

    async persistPausedSessions() {
      const db = await mentorDb;
      const keys = await db.getAllKeys('learning-sessions');
      for (const key of keys) {
        if (key === pausedSessionStoreKey || (typeof key === 'string' && key.startsWith(pausedSessionStoreKeyPrefix))) {
          await db.delete('learning-sessions', key);
        }
      }
      for (const session of this.pausedSessions) {
        await db.put('learning-sessions', toStorageRecord(session), `${pausedSessionStoreKeyPrefix}${session.id}`);
      }
    },

    async resetLocalLearning() {
      this.studentModel = initialStudentModel;
      this.session = null;
      this.pausedSessions = [];
      clearSessionCheckpoint();
      this.latestRecommendation = createRecommendationFromModel(initialStudentModel, now());
      this.pendingSyncEvents = 0;
      this.statisticsSnapshots = [];
      this.activitySnapshots = [];
      this.preferredWorkShift = 'unknown';
      this.lastSyncAt = null;
      this.lastRemoteProgressAt = null;
      this.isSyncRefreshing = false;
      savePreferredWorkShift('unknown');

      const db = await mentorDb;
      await db.put('student-models', toStorageRecord(this.studentModel));
      await db.clear('learning-sessions');
      await db.clear('statistics');
      await db.clear('activity-snapshots');
      await db.clear('sync-queue');
      await db.clear('concept-evidence');
      this.sessionHandoffs = [];
    },

    async signIn(session: AuthSession) {
      saveAuthSession(session);
      this.authSession = session;
      this.studentId = session.user.id;
      this.studentDisplayName = session.user.displayName;
      await this.refreshRemoteLearningState();
    },

    async signOut() {
      clearAuthSession();
      this.authSession = null;
      this.studentId = demoStudent.id;
      this.studentDisplayName = demoStudent.displayName;
    },

    async recordUpdateNotification(version: string, message?: string) {
      const createdAt = now();
      const id = `update-${version}`;
      const db = await mentorDb;
      const existing = (await db.get('update-notifications', id)) as UpdateNotification | undefined;

      if (existing) {
        return existing;
      }

      const notification: UpdateNotification = {
        id,
        version,
        title: 'App updated',
        message: message ?? createUpdateMessage(version, createdAt),
        createdAt,
        viewedAt: null,
        readAt: null,
        kind: 'app',
      };

      await this.saveUpdateNotification(notification);

      return notification;
    },

    async recordLessonUpdateNotification(downloadedLessons: number, downloadedStories: number, downloadedAudio: number, eventId: string) {
      const createdAt = now();
      const id = `lessons-${eventId}`;
      const existing = this.updateNotifications.find((notification) => notification.id === id);
      if (existing) return existing;
      const notification: UpdateNotification = {
        id,
        version: 'offline',
        title: 'Offline content updated',
        message: `${downloadedLessons} lesson${downloadedLessons === 1 ? '' : 's'}, ${downloadedAudio} audio program${downloadedAudio === 1 ? '' : 's'} and ${downloadedStories} audio ${downloadedStories === 1 ? 'story' : 'stories'} downloaded and available offline.`,
        createdAt,
        viewedAt: null,
        readAt: null,
        kind: 'lessons',
      };
      await this.saveUpdateNotification(notification);
      return notification;
    },

    async saveUpdateNotification(notification: UpdateNotification) {
      const db = await mentorDb;
      await db.put('update-notifications', notification);
      const next = [notification, ...this.updateNotifications.filter((item) => item.id !== notification.id)];
      this.updateNotifications = selectRetainedUpdateNotifications(next);
      const retainedIds = new Set(this.updateNotifications.map((item) => item.id));
      for (const removed of next) {
        if (!retainedIds.has(removed.id)) await db.delete('update-notifications', removed.id);
      }
    },

    async prepareForAppUpdate() {
      await this.persistSession();

      if (this.session) writeUpdateResumeSessionId(this.session.id);

      return this.session
        ? {
            lessonSessionId: this.session.id,
            lessonTitle: this.session.lesson.title,
            exerciseNumber: Math.min(this.session.currentExerciseIndex + 1, this.session.lesson.exercises.length),
            exerciseCount: this.session.lesson.exercises.length,
          }
        : {};
    },

    async markUpdateNotificationRead(id: string) {
      const notification = this.updateNotifications.find((item) => item.id === id);

      if (!notification || notification.readAt) {
        return;
      }

      const updated: UpdateNotification = {
        ...notification,
        viewedAt: notification.viewedAt ?? now(),
        readAt: now(),
      };
      const next = this.updateNotifications.map((item) => item.id === id ? updated : item);
      this.updateNotifications = selectRetainedUpdateNotifications(next);
      const retainedIds = new Set(this.updateNotifications.map((item) => item.id));
      const db = await mentorDb;

      await db.put('update-notifications', updated);
      for (const removed of next) {
        if (!retainedIds.has(removed.id)) await db.delete('update-notifications', removed.id);
      }
    },

    async markAllUpdateNotificationsRead() {
      const unread = this.updateNotifications.filter((notification) => notification.readAt === null);

      if (unread.length === 0) {
        return;
      }

      const readAt = now();
      const next = this.updateNotifications.map((notification) => notification.readAt ? notification : {
        ...notification,
        viewedAt: notification.viewedAt ?? readAt,
        readAt,
      });
      this.updateNotifications = selectRetainedUpdateNotifications(next);
      const retainedIds = new Set(this.updateNotifications.map((notification) => notification.id));
      const db = await mentorDb;

      for (const notification of next) await db.put('update-notifications', notification);
      for (const notification of next) {
        if (!retainedIds.has(notification.id)) await db.delete('update-notifications', notification.id);
      }
    },

    async finishLesson(completedAt: string) {
      if (!this.session) {
        return;
      }

      const activeSession = this.session;

      const lessonFinishedEvent = createLearningEvent(
        this.studentId,
        activeSession.id,
        activeSession.lesson,
        undefined,
        'lesson-finished',
        completedAt,
      );
      const updatedModel = updateStudentModelFromResults(this.studentModel, activeSession.results, completedAt);
      const observation = createObservationFromResults(this.studentId, activeSession.results, completedAt);
      const recommendation = createRecommendationFromModel(updatedModel, completedAt);
      const completedSession: LearningSessionState = {
        ...activeSession,
        events: [...activeSession.events, lessonFinishedEvent],
        completedAt,
        observation,
        recommendation,
      };
      this.studentModel = updatedModel;
      this.latestRecommendation = recommendation;

      if (this.session?.id === completedSession.id) {
        this.session = completedSession;
      }

      const statisticsPersistence = this.persistStatistics(completedAt, completedSession);
      await this.persistSession(completedSession);
      await this.persistStudentModel();
      await statisticsPersistence;
      await this.persistSyncQueue(completedSession);

      await this.pruneLocalStorage();

      if (navigator.onLine) {
        void this.syncPendingEvents();
      }

      logDiagnostic('lesson.completed', {
        sessionId: completedSession.id,
        lessonId: completedSession.lesson.id,
        exerciseCount: completedSession.results.length,
        modelVersion: this.studentModel.version,
        pendingSyncEvents: this.pendingSyncEvents,
      });
    },

    async persistSession(completedSession?: LearningSessionState) {
      const sourceSession = completedSession ?? this.session;
      if (!sourceSession) {
        return;
      }

      const session = toStorageRecord(sourceSession);
      writeSessionCheckpoint(session);
      const db = await mentorDb;
      await db.put('learning-sessions', session, sessionStoreKey);
      await db.put('lessons', session.lesson);
      await saveContentProgress({
        studentId: this.studentId,
        category: 'lesson',
        contentId: session.lesson.id,
        position: session.currentExerciseIndex,
        furthestPosition: session.currentExerciseIndex,
        duration: session.lesson.exercises.length,
        completed: Boolean(session.completedAt),
        updatedAt: session.completedAt ?? now(),
      });
    },

    async persistStudentModel() {
      const db = await mentorDb;
      await db.put('student-models', toStorageRecord(this.studentModel));
    },

    async persistStatistics(createdAt: string, completedSession?: LearningSessionState) {
      const sourceSession = completedSession ?? this.session;
      if (!sourceSession) {
        return;
      }

      const completed = sourceSession.results.filter((result) => result.completionState === 'completed');
      const correct = completed.filter((result) => result.correct).length;
      const responseTime = completed.reduce((sum, result) => sum + result.responseTimeMs, 0);
      const pronunciationIssues = sourceSession.speechResults.flatMap((result) => result.pronunciationIssues);
      const activeSeconds = Math.max(
        0,
        Math.min(
          Math.round((Date.parse(createdAt) - Date.parse(sourceSession.startedAt)) / 1000),
          Math.round(sourceSession.lesson.estimatedMinutes * 60 * 2),
        ),
      );
      const spokenWords = sourceSession.speechResults.reduce(
        (total, result) => total + countWords(result.heardText ?? ''),
        0,
      );

      const snapshot: StatisticsSnapshot = {
        id: `statistics-${sourceSession.id}-${createdAt}`,
        studentId: this.studentId,
        sessionId: sourceSession.id,
        lessonId: sourceSession.lesson.id,
        accuracy: completed.length === 0 ? 0 : correct / completed.length,
        averageResponseTimeMs: completed.length === 0 ? 0 : Math.round(responseTime / completed.length),
        attempts: completed.reduce((sum, result) => sum + result.attempts, 0),
        completedExercises: completed.length,
        audioReplays: sourceSession.events.filter((event) => event.type === 'audio-replayed').length,
        speechAttempts: sourceSession.events.filter((event) => event.type === 'speech-attempted').length,
        pronunciationIssueCount: pronunciationIssues.length,
        pronunciationFocus: Array.from(new Set(pronunciationIssues.map((issue) => issue.word))).slice(0, 4),
        activeSeconds,
        listeningSeconds: sourceSession.context.mode === 'listening' ? activeSeconds : 0,
        spokenWords,
        lessonTemplateKey: sourceSession.lesson.lessonTemplateKey,
        fatigueSignal: this.studentModel.fatigue,
        learningMode: sourceSession.context.mode,
        workShift: sourceSession.context.workShift,
        shiftTiming: sourceSession.context.shiftTiming,
        dayType: sourceSession.context.dayType,
        activityPace: sourceSession.context.activityPace,
        createdAt,
      };

      this.statisticsSnapshots = [
        ...this.statisticsSnapshots.filter((item) => item.id !== snapshot.id),
        snapshot,
      ];

      const db = await mentorDb;
      await db.put('statistics', toStorageRecord({ ...snapshot, userId: this.studentId }));
      if (activeSeconds > 0 && (sourceSession.context.mode === 'listening' || sourceSession.context.mode === 'speaking')) {
        await recordLearningActivity({
          studentId: this.studentId,
          kind: sourceSession.context.mode,
          contentId: sourceSession.lesson.id,
          activeSeconds,
          endedAt: createdAt,
        });
      }
      await db.put('concept-evidence', toStorageRecord({
        id: `concept-${sourceSession.id}-${createdAt}`,
        studentId: this.studentId,
        lessonId: sourceSession.lesson.id,
        concept: sourceSession.lesson.concept,
        activityType: sourceSession.lesson.activityType,
        teacherDecision: sourceSession.lesson.teacherDecision,
        results: sourceSession.results,
        createdAt,
      }));
      await this.persistActivitySnapshot({
        ...createActivitySnapshot(this.studentId, sourceSession.context, sourceSession.id, createdAt),
        lessonCompleted: true,
        completedExercises: snapshot.completedExercises,
        accuracy: snapshot.accuracy,
        averageResponseTimeMs: snapshot.averageResponseTimeMs,
      });
    },

    async persistActivitySnapshot(snapshot: ActivitySnapshot) {
      const db = await mentorDb;
      await db.put('activity-snapshots', toStorageRecord(snapshot));
      this.activitySnapshots = [...this.activitySnapshots.filter((item) => item.id !== snapshot.id), snapshot]
        .sort((left, right) => left.observedAt.localeCompare(right.observedAt))
        .slice(-80);
    },

    async persistSyncQueue(completedSession?: LearningSessionState) {
      const sourceSession = completedSession ?? this.session;
      if (!sourceSession) {
        return;
      }

      const db = await mentorDb;

      for (const event of sourceSession.events) {
        await db.put('sync-queue', toStorageRecord({
          ...event,
          status: 'pending',
          exerciseResults: sourceSession.results,
          speechResults: sourceSession.speechResults,
        }));
      }

      const queuedEvents = await db.getAll('sync-queue');
      this.pendingSyncEvents = queuedEvents.filter((event) => event.status === 'pending').length;

      if (this.pendingSyncEvents > 0) {
        await this.registerBackgroundSync();
      }
    },

    async syncPendingEvents() {
      const db = await mentorDb;
      const queuedEvents = await db.getAll('sync-queue');
      const pendingEvents = queuedEvents.filter((event) => event.status === 'pending') as QueuedLearningEvent[];

      if (pendingEvents.length === 0) {
        this.pendingSyncEvents = 0;
        return;
      }

      try {
        const result = await synchronizeLearningEvidence(
          pendingEvents.map(toLearningEvent),
          collectExerciseResults(pendingEvents, this.session?.results),
          collectSpeechResults(pendingEvents, this.session?.speechResults),
        );

        await this.applySharedStudentState(result.studentModel, result.recommendation);
        await this.mergeStatisticsSnapshots(result.statisticsSnapshots);

        for (const acknowledgement of result.acknowledgements) {
          const queuedEvent = pendingEvents.find((event) => event.id === acknowledgement.eventId);

          if (queuedEvent) {
            await db.put(
              'sync-queue',
              compactAcknowledgedSyncEvent({ ...queuedEvent, status: acknowledgement.status }),
            );
          }
        }

        await this.pruneLocalStorage();

        const updatedQueue = await db.getAll('sync-queue');
        this.pendingSyncEvents = updatedQueue.filter((event) => event.status === 'pending').length;
        this.lastSyncAt = now();
        logDiagnostic('sync.completed', {
          acceptedCount: result.acceptedCount,
          pendingSyncEvents: this.pendingSyncEvents,
          modelVersion: result.studentModelVersion,
        });
      } catch (error) {
        this.pendingSyncEvents = pendingEvents.length;
        logDiagnostic('sync.failed', {
          pendingSyncEvents: pendingEvents.length,
          reason: getErrorMessage(error),
        }, 'warn');
        await this.registerBackgroundSync();
      }
    },

    async registerBackgroundSync() {
      try {
        await registerLearningBackgroundSync();
      } catch {
        return;
      }
    },

    async refreshRemoteLearningState(): Promise<boolean> {
      if (!this.isOnline || this.isSyncRefreshing) {
        return false;
      }

      const previousModelVersion = this.studentModel.version;
      const previousRemoteProgressAt = getLatestHandoffUpdate(this.sessionHandoffs);

      this.isSyncRefreshing = true;

      try {
        await this.syncPendingEvents();
        await this.refreshSharedStudentState();
        await this.refreshSessionHandoffs();

        const nextRemoteProgressAt = getLatestHandoffUpdate(this.sessionHandoffs);
        const hasRemoteProgress =
          this.studentModel.version > previousModelVersion ||
          (nextRemoteProgressAt !== null && nextRemoteProgressAt !== previousRemoteProgressAt);

        if (hasRemoteProgress) {
          this.lastRemoteProgressAt = now();
        }

        return hasRemoteProgress;
      } finally {
        this.isSyncRefreshing = false;
      }
    },

    async refreshSharedStudentState() {
      try {
        const state = await fetchStudentState();
        this.studentId = state.student.id;
        this.studentDisplayName = state.student.displayName;
        const localStatisticsForAccount = this.statisticsSnapshots
          .filter((snapshot) => snapshot.studentId === this.studentId || snapshot.studentId === demoStudent.id)
          .map((snapshot) => ({ ...snapshot, studentId: this.studentId }));
        const sharedStatistics = await synchronizeStatisticsSnapshots(localStatisticsForAccount);
        await this.applySharedStudentState(state.studentModel, state.recommendation);
        await this.replaceStatisticsSnapshotsFromServer([...sharedStatistics, ...(state.statisticsSnapshots ?? [])]);
      } catch {
        return;
      }
    },

    async replaceStatisticsSnapshotsFromServer(snapshots: StatisticsSnapshot[]) {
      const merged = new Map<string, StatisticsSnapshot>();
      for (const snapshot of snapshots) {
        if (snapshot.studentId === this.studentId && snapshot.id) merged.set(snapshot.id, snapshot);
      }
      const db = await mentorDb;
      await db.clear('statistics');
      for (const snapshot of merged.values()) await db.put('statistics', toStorageRecord(snapshot));
      this.statisticsSnapshots = [...merged.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },

    async applySharedStudentState(studentModel: StudentModel, recommendation: Recommendation) {
      if (studentModel.studentId !== this.studentId || studentModel.version < this.studentModel.version) {
        return;
      }

      this.studentModel = studentModel;
      this.latestRecommendation = recommendation;
      await this.persistStudentModel();
    },

    async mergeStatisticsSnapshots(snapshots: StatisticsSnapshot[]) {
      const merged = new Map(this.statisticsSnapshots.map((snapshot) => [snapshot.id, snapshot]));
      const db = await mentorDb;
      for (const snapshot of snapshots) {
        if (snapshot.studentId !== this.studentId || !snapshot.id) continue;
        merged.set(snapshot.id, snapshot);
        await db.put('statistics', toStorageRecord(snapshot));
      }
      this.statisticsSnapshots = [...merged.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },

    async refreshSessionHandoffs() {
      try {
        this.sessionHandoffs = (await fetchSessionHandoffs()).filter(
          (handoff) => handoff.studentId === this.studentId && handoff.currentExerciseIndex < handoff.lesson.exercises.length,
        );
      } catch {
        return;
      }
    },

    async publishSessionHandoff() {
      if (!this.session || !this.isOnline || this.session.completedAt) {
        return;
      }

      const handoff = createSessionHandoff(this.studentId, this.session);

      try {
        const savedHandoff = await upsertSessionHandoff(handoff);
        this.sessionHandoffs = [
          savedHandoff,
          ...this.sessionHandoffs.filter((item) => item.id !== savedHandoff.id),
        ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      } catch {
        return;
      }
    },

    async continueSessionHandoff(handoff: LearningSessionHandoff) {
      if (handoff.studentId !== this.studentId) {
        return;
      }

      this.session = {
        id: handoff.events[0]?.sessionId ?? createSessionId(handoff.startedAt),
        lesson: handoff.lesson,
        context: handoff.context,
        currentExerciseIndex: handoff.currentExerciseIndex,
        startedAt: handoff.startedAt,
        exerciseStartedAt: handoff.exerciseStartedAt,
        events: handoff.events,
        results: handoff.results,
        speechResults: handoff.speechResults,
      };

      await this.persistSession();
      await this.publishSessionHandoff();
    },

    async pruneLocalStorage() {
      const db = await mentorDb;
      const currentLessonId = this.session?.lesson.id;
      const protectedLessonIds = new Set(currentLessonId ? [currentLessonId] : []);

      await pruneStore(db, 'lessons', defaultRetentionPolicy.maxLessons, protectedLessonIds);
      await pruneStore(db, 'statistics', defaultRetentionPolicy.maxStatisticsSnapshots);
      await pruneStore(db, 'activity-snapshots', defaultRetentionPolicy.maxActivitySnapshots);
      await pruneStore(db, 'concept-evidence', defaultRetentionPolicy.maxConceptEvidence);

      const queuedEvents = (await db.getAll('sync-queue')) as QueuedLearningEvent[];
      const pendingEventIds = new Set(queuedEvents.filter((event) => event.status === 'pending').map((event) => event.id));

      for (const event of queuedEvents) {
        const compactEvent = compactAcknowledgedSyncEvent(event);

        if (compactEvent !== event) {
          await db.put('sync-queue', compactEvent);
        }
      }

      const acknowledgedEvents = (await db.getAll('sync-queue')).filter(
        (event) => (event as RetentionRecord).status !== 'pending',
      ) as RetentionRecord[];

      for (const event of selectRecordsToPrune(
        acknowledgedEvents,
        defaultRetentionPolicy.maxAcknowledgedSyncEvents,
        pendingEventIds,
      )) {
        await db.delete('sync-queue', event.id);
      }

      this.statisticsSnapshots = ((await db.getAll('statistics')) as StatisticsSnapshot[]).sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      );
      this.activitySnapshots = ((await db.getAll('activity-snapshots')) as ActivitySnapshot[]).sort((left, right) =>
        left.observedAt.localeCompare(right.observedAt),
      );
      this.pendingSyncEvents = ((await db.getAll('sync-queue')) as QueuedLearningEvent[]).filter(
        (event) => event.status === 'pending',
      ).length;
    },
  },
});

async function pruneStore(
  db: Awaited<typeof mentorDb>,
  storeName:
    | 'lessons'
    | 'statistics'
    | 'activity-snapshots'
    | 'concept-evidence',
  maxRecords: number,
  protectedIds: ReadonlySet<string> = new Set(),
) {
  const records = (await db.getAll(storeName)) as RetentionRecord[];

  for (const record of selectRecordsToPrune(records, maxRecords, protectedIds)) {
    await db.delete(storeName, record.id);
  }
}

function createDefaultLearningContext(
  snapshots: ActivitySnapshot[] = [],
  preferredWorkShift: WorkShift = 'unknown',
  myShiftActivity: MyShiftActivity | null = null,
): LearningContext {
  const suggestion = createCurrentActivitySuggestion(preferredWorkShift, snapshots, new Date(), myShiftActivity);

  return {
    mode: suggestion.mode,
    isOffline: !navigator.onLine,
    speechAvailable: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    availableMinutes: suggestion.availableMinutes,
    workShift: suggestion.workShift,
    dayType: suggestion.dayType,
    activityPace: suggestion.activityPace,
    startedHour: suggestion.localHour,
    activityReason: suggestion.reason,
    shiftTiming: suggestion.shiftTiming,
  };
}

function toLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createSessionHandoff(studentId: string, session: LearningSessionState): LearningSessionHandoff {
  return {
    id: `handoff-${studentId}-${getCurrentDeviceSurface()}`,
    studentId,
    sourceDevice: getCurrentDeviceSurface(),
    lesson: session.lesson,
    context: session.context,
    currentExerciseIndex: session.currentExerciseIndex,
    startedAt: session.startedAt,
    exerciseStartedAt: session.exerciseStartedAt,
    events: session.events,
    results: session.results,
    speechResults: session.speechResults,
    updatedAt: now(),
  };
}

function getCurrentDeviceSurface(): DeviceSurface {
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches) {
    return 'mobile';
  }

  return 'desktop';
}

function toStorageRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function upsertPausedSession(
  sessions: LearningSessionState[],
  session: LearningSessionState,
): LearningSessionState[] {
  const templateKey = session.lesson.lessonTemplateKey;
  return [
    ...sessions.filter((candidate) => candidate.lesson.lessonTemplateKey !== templateKey),
    toStorageRecord(session),
  ];
}

function deduplicatePausedSessions(sessions: LearningSessionState[]): LearningSessionState[] {
  return sessions.reduce<LearningSessionState[]>(upsertPausedSession, []);
}

function createActivitySnapshot(
  studentId: string,
  context: LearningContext,
  sessionId: string,
  observedAt: string,
): ActivitySnapshot {
  const observedDate = new Date(observedAt);
  const localHour = context.startedHour ?? observedDate.getHours();
  const weekday = observedDate.getDay();
  const dayType = context.dayType ?? (weekday === 0 || weekday === 6 ? 'weekend' : 'weekday');
  const fallbackSuggestion = inferActivitySuggestion(observedDate, context.workShift ?? 'unknown');
  const activityPace = context.activityPace ?? fallbackSuggestion.activityPace;
  const suggestedMode = context.mode;
  const shiftTiming = context.shiftTiming ?? fallbackSuggestion.shiftTiming;

  return {
    id: `activity-${sessionId}-${observedAt}`,
    studentId,
    sessionId,
    observedAt,
    localHour,
    weekday,
    dayType,
    workShift: context.workShift ?? 'unknown',
    shiftTiming,
    activityPace,
    suggestedMode,
    availableMinutes: context.availableMinutes,
    reason:
      context.activityReason ??
      createActivityReason(dayType, context.workShift ?? 'unknown', activityPace, false, weekday, localHour),
  };
}

function createUpdateMessage(version: string, createdAt: string): string {
  return `Mentor AI was updated to version ${version} on ${formatDisplayDate(createdAt)}.`;
}

function createLearningEvent(
  studentId: string,
  sessionId: string,
  lesson: GeneratedLesson,
  exerciseId: string | undefined,
  type: LearningEvent['type'],
  occurredAt: string,
  data?: LearningEvent['data'],
): LearningEvent {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    studentId,
    sessionId,
    lessonId: lesson.id,
    exerciseId,
    type,
    occurredAt,
    concept: lesson.concept,
    activityType: lesson.activityType,
    teacherDecision: lesson.teacherDecision.levelDecision,
    retentionRisk: lesson.teacherDecision.levelDecision === 'decrease' ? 'medium' : 'low',
    reviewUrgency: lesson.activityType === 'recovery-check' ? 'now' : 'none',
    avoidancePattern: 'none',
    data,
  };
}

function createExerciseResult(
  studentId: string,
  sessionId: string,
  lesson: GeneratedLesson,
  exercise: Exercise,
  response: string,
  completedAt: string,
  responseTimeMs: number,
  evidenceId: string,
): ExerciseResult {
  return {
    id: `result-${exercise.id}-${Date.now()}`,
    studentId,
    sessionId,
    lessonId: lesson.id,
    exerciseId: exercise.id,
    exerciseType: exercise.type,
    targetSkill: exercise.targetSkill,
    concept: lesson.concept,
    activityType: lesson.activityType,
    conceptLevel: lesson.conceptLevel,
    correct: scoreExercise(exercise, response),
    attempts: 1,
    responseTimeMs,
    hintCount: 0,
    skipped: response.trim().length === 0,
    abandoned: false,
    repeatedMistake: false,
    readingComprehensionScore: lesson.concept === 'reading' ? (scoreExercise(exercise, response) ? 1 : 0) : undefined,
    unknownWords: lesson.concept === 'reading' && !scoreExercise(exercise, response) ? ['cafe'] : [],
    vocabularyRecallStatus:
      lesson.concept === 'vocabulary' ? (scoreExercise(exercise, response) ? 'recalled' : 'fragile') : undefined,
    teacherDecision: lesson.teacherDecision.levelDecision,
    reasonForLevelDecision: lesson.teacherDecision.reason,
    lastPracticedAt: completedAt,
    daysSincePractice: 0,
    avoidancePattern: 'none',
    retentionRisk: lesson.activityType === 'recovery-check' ? 'medium' : 'low',
    reviewUrgency: lesson.activityType === 'recovery-check' ? 'now' : 'none',
    completionState: response.trim().length === 0 ? 'skipped' : 'completed',
    evidenceEventIds: [evidenceId],
    completedAt,
  };
}

function createSpeechResult(
  studentId: string,
  sessionId: string,
  exercise: Exercise,
  response: string,
  completedAt: string,
  responseStartDelayMs: number,
  speechDetected: boolean,
): SpeechResult {
  const expectedText = exercise.audioText ?? exercise.expectedResponse ?? exercise.prompt.replace(/^Repeat:\s*/i, '');
  const pronunciationIssues = speechDetected ? analyzePronunciationAttempt(expectedText, response, completedAt) : [];

  return {
    id: `speech-${exercise.id}-${Date.now()}`,
    studentId,
    sessionId,
    exerciseId: exercise.id,
    speechAvailable: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    speechDetected,
    expectedText,
    heardText: response,
    pronunciationIssues,
    responseStartDelayMs,
    completedAt,
  };
}

function collectExerciseResults(events: QueuedLearningEvent[], fallbackResults: ExerciseResult[] = []): ExerciseResult[] {
  return uniqueById(events.flatMap((event) => event.exerciseResults ?? fallbackResults));
}

function collectSpeechResults(events: QueuedLearningEvent[], fallbackResults: SpeechResult[] = []): SpeechResult[] {
  return uniqueById(events.flatMap((event) => event.speechResults ?? fallbackResults));
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function getLatestHandoffUpdate(handoffs: LearningSessionHandoff[]): string | null {
  const sortedDates = handoffs.map((handoff) => handoff.updatedAt).sort();
  return sortedDates[sortedDates.length - 1] ?? null;
}

function toLearningEvent(event: QueuedLearningEvent): LearningEvent {
  return {
    id: event.id,
    studentId: event.studentId,
    sessionId: event.sessionId,
    lessonId: event.lessonId,
    exerciseId: event.exerciseId,
    type: event.type,
    occurredAt: event.occurredAt,
    concept: event.concept,
    activityType: event.activityType,
    teacherDecision: event.teacherDecision,
    retentionRisk: event.retentionRisk,
    reviewUrgency: event.reviewUrgency,
    avoidancePattern: event.avoidancePattern,
    data: event.data,
  };
}

function now(): string {
  return new Date().toISOString();
}

function countWords(value: string): number {
  return value.trim().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

function createSessionId(createdAt: string): string {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 12);

  return `session-${createdAt.replace(/\D/g, '')}-${randomPart}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
