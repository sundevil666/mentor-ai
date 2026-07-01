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
  upsertSessionHandoff,
} from 'src/services/api-client';
import { createActivityReason, inferActivitySuggestion } from 'src/services/activity-suggestion';
import { mentorDb } from 'src/services/indexed-db';
import {
  compactAcknowledgedSyncEvent,
  defaultRetentionPolicy,
  selectRecordsToPrune,
  type RetentionRecord,
} from 'src/services/storage-retention';
import { readPreferredWorkShift, savePreferredWorkShift } from 'src/services/user-preferences';

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
}

type QueuedLearningEvent = LearningEvent & {
  status: string;
  exerciseResults?: ExerciseResult[];
  speechResults?: SpeechResult[];
};

interface AppState {
  storageMode: StorageMode;
  isOfflineReady: boolean;
  isOnline: boolean;
  studentModel: StudentModel;
  session: LearningSessionState | null;
  latestRecommendation: Recommendation | null;
  statisticsSnapshots: StatisticsSnapshot[];
  activitySnapshots: ActivitySnapshot[];
  preferredWorkShift: WorkShift;
  pendingSyncEvents: number;
  lastSyncAt: string | null;
  lastRemoteProgressAt: string | null;
  isSyncRefreshing: boolean;
  updateNotifications: UpdateNotification[];
  sessionHandoffs: LearningSessionHandoff[];
  isHydrated: boolean;
}

const sessionStoreKey = 'active-session';

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    storageMode: 'demo',
    isOfflineReady: true,
    isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
    studentModel: initialStudentModel,
    session: null,
    latestRecommendation: null,
    statisticsSnapshots: [],
    activitySnapshots: [],
    preferredWorkShift: 'unknown',
    pendingSyncEvents: 0,
    lastSyncAt: null,
    lastRemoteProgressAt: null,
    isSyncRefreshing: false,
    updateNotifications: [],
    sessionHandoffs: [],
    isHydrated: false,
  }),

  getters: {
    currentExercise: (state): Exercise | null => state.session?.lesson.exercises[state.session.currentExerciseIndex] ?? null,
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
    latestStatistics: (state): StatisticsSnapshot | null => state.statisticsSnapshots.at(-1) ?? null,
    latestActivitySnapshot: (state): ActivitySnapshot | null => state.activitySnapshots.at(-1) ?? null,
    unreadUpdateNotificationCount: (state): number =>
      state.updateNotifications.filter((notification) => notification.readAt === null).length,
    latestUpdateNotification: (state): UpdateNotification | null => state.updateNotifications[0] ?? null,
    remoteSessionHandoffs: (state): LearningSessionHandoff[] => state.sessionHandoffs,
  },

  actions: {
    async hydrate() {
      const db = await mentorDb;
      const savedModel = await db.get('student-models', initialStudentModel.id);
      const savedSession = await db.get('learning-sessions', sessionStoreKey);
      const statistics = await db.getAll('statistics');
      const activitySnapshots = await db.getAll('activity-snapshots');
      const queuedEvents = await db.getAll('sync-queue');
      const updateNotifications = await db.getAll('update-notifications');

      this.studentModel = (savedModel as StudentModel | undefined) ?? initialStudentModel;
      this.session = (savedSession as LearningSessionState | undefined) ?? null;
      this.latestRecommendation = this.session?.recommendation ?? createRecommendationFromModel(this.studentModel, now());
      this.statisticsSnapshots = (statistics as StatisticsSnapshot[]).sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      );
      this.activitySnapshots = (activitySnapshots as ActivitySnapshot[]).sort((left, right) =>
        left.observedAt.localeCompare(right.observedAt),
      );
      this.preferredWorkShift = readPreferredWorkShift() ?? this.activitySnapshots.at(-1)?.workShift ?? 'unknown';
      this.pendingSyncEvents = queuedEvents.filter((event) => event.status === 'pending').length;
      this.updateNotifications = (updateNotifications as UpdateNotification[]).sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      );
      this.isOnline = navigator.onLine;
      this.isHydrated = true;

      await this.pruneLocalStorage();

      if (this.isOnline) {
        await this.refreshRemoteLearningState();
      }
    },

    setNetworkStatus(isOnline: boolean) {
      this.isOnline = isOnline;

      if (isOnline) {
        void this.refreshRemoteLearningState();
      }
    },

    async startLesson(context?: LearningContext) {
      const createdAt = now();
      const learningContext = context ?? createDefaultLearningContext(this.activitySnapshots, this.preferredWorkShift);
      const lesson = await this.loadLesson(learningContext, createdAt);
      const sessionId = sessionStoreKey;
      const firstExercise = lesson.exercises[0];
      const startedEvent = createLearningEvent(sessionId, lesson, undefined, 'lesson-started', createdAt);
      const firstExerciseEvent = createLearningEvent(sessionId, lesson, firstExercise?.id, 'exercise-started', createdAt);

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

      await this.persistActivitySnapshot(createActivitySnapshot(learningContext, sessionId, createdAt));
      await this.persistSession();
      await this.publishSessionHandoff();
    },

    async loadLesson(context: LearningContext, createdAt: string): Promise<GeneratedLesson> {
      if (navigator.onLine) {
        try {
          return await fetchCurrentLesson(context);
        } catch (_error) {
          // Keep offline-first practice usable when the API is temporarily unavailable.
        }
      }

      const plan = createLessonPlan(this.studentModel, context, createdAt);
      return generateLessonFromPlan(plan, createdAt);
    },

    async setPreferredWorkShift(workShift: WorkShift) {
      this.preferredWorkShift = workShift;
      savePreferredWorkShift(workShift);
    },

    async submitCurrentExercise(response: string) {
      if (!this.session || this.currentExercise === null) {
        return;
      }

      const submittedAt = now();
      const exercise = this.currentExercise;
      const finishedEvent = createLearningEvent(
        this.session.id,
        this.session.lesson,
        exercise.id,
        'exercise-finished',
        submittedAt,
      );
      const result = createExerciseResult(
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

      if (exercise.type === 'repeat-speaking') {
        this.session.speechResults.push(
          createSpeechResult(
            this.session.id,
            exercise,
            response,
            submittedAt,
            Math.max(0, Date.parse(submittedAt) - Date.parse(this.session.exerciseStartedAt)),
            response.trim().length > 0,
          ),
        );
        this.session.events.push(
          createLearningEvent(this.session.id, this.session.lesson, exercise.id, 'speech-attempted', submittedAt),
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
        createLearningEvent(this.session.id, this.session.lesson, nextExercise.id, 'exercise-started', submittedAt),
      );

      await this.persistSession();
      await this.publishSessionHandoff();
    },

    async replayAudio() {
      if (!this.session || this.currentExercise === null) {
        return;
      }

      this.session.events.push(
        createLearningEvent(this.session.id, this.session.lesson, this.currentExercise.id, 'audio-replayed', now()),
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

      const db = await mentorDb;
      this.session = null;
      await db.delete('learning-sessions', sessionStoreKey);
    },

    async resetLocalLearning() {
      const db = await mentorDb;

      this.studentModel = initialStudentModel;
      this.session = null;
      this.latestRecommendation = createRecommendationFromModel(initialStudentModel, now());
      this.pendingSyncEvents = 0;
      this.statisticsSnapshots = [];
      this.activitySnapshots = [];
      this.preferredWorkShift = 'unknown';
      this.lastSyncAt = null;
      this.lastRemoteProgressAt = null;
      this.isSyncRefreshing = false;
      savePreferredWorkShift('unknown');

      await db.put('student-models', this.studentModel);
      await db.delete('learning-sessions', sessionStoreKey);
      await db.clear('statistics');
      await db.clear('activity-snapshots');
      await db.clear('sync-queue');
      await db.clear('concept-evidence');
      this.sessionHandoffs = [];
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
      };

      await db.put('update-notifications', notification);
      this.updateNotifications = [notification, ...this.updateNotifications];

      return notification;
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
      const db = await mentorDb;

      await db.delete('update-notifications', updated.id);
      this.updateNotifications = this.updateNotifications.filter((item) => item.id !== id);
    },

    async markAllUpdateNotificationsRead() {
      const unread = this.updateNotifications.filter((notification) => notification.readAt === null);

      if (unread.length === 0) {
        return;
      }

      const db = await mentorDb;

      for (const notification of unread) {
        await db.delete('update-notifications', notification.id);
      }

      this.updateNotifications = this.updateNotifications.filter((notification) => notification.readAt !== null);
    },

    async finishLesson(completedAt: string) {
      if (!this.session) {
        return;
      }

      const lessonFinishedEvent = createLearningEvent(
        this.session.id,
        this.session.lesson,
        undefined,
        'lesson-finished',
        completedAt,
      );
      const updatedModel = updateStudentModelFromResults(this.studentModel, this.session.results, completedAt);
      const observation = createObservationFromResults(demoStudent.id, this.session.results, completedAt);
      const recommendation = createRecommendationFromModel(updatedModel, completedAt);

      this.session.events.push(lessonFinishedEvent);
      this.session.completedAt = completedAt;
      this.session.observation = observation;
      this.session.recommendation = recommendation;
      this.studentModel = updatedModel;
      this.latestRecommendation = recommendation;

      await this.persistSession();
      await this.persistStudentModel();
      await this.persistStatistics(completedAt);
      await this.persistSyncQueue();
      await this.pruneLocalStorage();

      if (navigator.onLine) {
        await this.syncPendingEvents();
      }
    },

    async persistSession() {
      if (!this.session) {
        return;
      }

      const db = await mentorDb;
      const session = toStorageRecord(this.session);
      await db.put('learning-sessions', session);
      await db.put('lessons', session.lesson);
    },

    async persistStudentModel() {
      const db = await mentorDb;
      await db.put('student-models', this.studentModel);
    },

    async persistStatistics(createdAt: string) {
      if (!this.session) {
        return;
      }

      const completed = this.session.results.filter((result) => result.completionState === 'completed');
      const correct = completed.filter((result) => result.correct).length;
      const responseTime = completed.reduce((sum, result) => sum + result.responseTimeMs, 0);
      const pronunciationIssues = this.session.speechResults.flatMap((result) => result.pronunciationIssues);

      const snapshot: StatisticsSnapshot = {
        id: `statistics-${this.session.id}-${createdAt}`,
        studentId: demoStudent.id,
        sessionId: this.session.id,
        lessonId: this.session.lesson.id,
        accuracy: completed.length === 0 ? 0 : correct / completed.length,
        averageResponseTimeMs: completed.length === 0 ? 0 : Math.round(responseTime / completed.length),
        attempts: completed.reduce((sum, result) => sum + result.attempts, 0),
        completedExercises: completed.length,
        audioReplays: this.session.events.filter((event) => event.type === 'audio-replayed').length,
        speechAttempts: this.session.events.filter((event) => event.type === 'speech-attempted').length,
        pronunciationIssueCount: pronunciationIssues.length,
        pronunciationFocus: Array.from(new Set(pronunciationIssues.map((issue) => issue.word))).slice(0, 4),
        fatigueSignal: this.studentModel.fatigue,
        learningMode: this.session.context.mode,
        workShift: this.session.context.workShift,
        shiftTiming: this.session.context.shiftTiming,
        dayType: this.session.context.dayType,
        activityPace: this.session.context.activityPace,
        createdAt,
      };

      const db = await mentorDb;
      await db.put('statistics', { ...snapshot, userId: demoStudent.id });
      await db.put('concept-evidence', {
        id: `concept-${this.session.id}-${createdAt}`,
        studentId: demoStudent.id,
        lessonId: this.session.lesson.id,
        concept: this.session.lesson.concept,
        activityType: this.session.lesson.activityType,
        teacherDecision: this.session.lesson.teacherDecision,
        results: this.session.results,
        createdAt,
      });
      this.statisticsSnapshots = [...this.statisticsSnapshots, snapshot];
      await this.persistActivitySnapshot({
        ...createActivitySnapshot(this.session.context, this.session.id, createdAt),
        lessonCompleted: true,
        completedExercises: snapshot.completedExercises,
        accuracy: snapshot.accuracy,
        averageResponseTimeMs: snapshot.averageResponseTimeMs,
      });
    },

    async persistActivitySnapshot(snapshot: ActivitySnapshot) {
      const db = await mentorDb;
      await db.put('activity-snapshots', snapshot);
      this.activitySnapshots = [...this.activitySnapshots.filter((item) => item.id !== snapshot.id), snapshot]
        .sort((left, right) => left.observedAt.localeCompare(right.observedAt))
        .slice(-80);
    },

    async persistSyncQueue() {
      if (!this.session) {
        return;
      }

      const db = await mentorDb;

      for (const event of this.session.events) {
        await db.put('sync-queue', {
          ...event,
          status: 'pending',
          exerciseResults: this.session.results,
          speechResults: this.session.speechResults,
        });
      }

      const queuedEvents = await db.getAll('sync-queue');
      this.pendingSyncEvents = queuedEvents.filter((event) => event.status === 'pending').length;
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
      } catch {
        this.pendingSyncEvents = pendingEvents.length;
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
        await this.applySharedStudentState(state.studentModel, state.recommendation);
      } catch {
        return;
      }
    },

    async applySharedStudentState(studentModel: StudentModel, recommendation: Recommendation) {
      if (studentModel.studentId !== demoStudent.id || studentModel.version < this.studentModel.version) {
        return;
      }

      this.studentModel = studentModel;
      this.latestRecommendation = recommendation;
      await this.persistStudentModel();
    },

    async refreshSessionHandoffs() {
      try {
        this.sessionHandoffs = (await fetchSessionHandoffs()).filter(
          (handoff) => handoff.studentId === demoStudent.id && handoff.currentExerciseIndex < handoff.lesson.exercises.length,
        );
      } catch {
        return;
      }
    },

    async publishSessionHandoff() {
      if (!this.session || !this.isOnline || this.session.completedAt) {
        return;
      }

      const handoff = createSessionHandoff(this.session);

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
      if (handoff.studentId !== demoStudent.id) {
        return;
      }

      this.session = {
        id: sessionStoreKey,
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
): LearningContext {
  const suggestion = inferActivitySuggestion(new Date(), preferredWorkShift, snapshots);

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

function createSessionHandoff(session: LearningSessionState): LearningSessionHandoff {
  return {
    id: `handoff-${demoStudent.id}-${getCurrentDeviceSurface()}`,
    studentId: demoStudent.id,
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

function createActivitySnapshot(context: LearningContext, sessionId: string, observedAt: string): ActivitySnapshot {
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
    studentId: demoStudent.id,
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
  const date = new Date(createdAt);
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `Mentor AI was updated to version ${version} on ${formattedDate} at ${formattedTime}.`;
}

function createLearningEvent(
  sessionId: string,
  lesson: GeneratedLesson,
  exerciseId: string | undefined,
  type: LearningEvent['type'],
  occurredAt: string,
  data?: LearningEvent['data'],
): LearningEvent {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    studentId: demoStudent.id,
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
    studentId: demoStudent.id,
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
    studentId: demoStudent.id,
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
  return handoffs.map((handoff) => handoff.updatedAt).sort().at(-1) ?? null;
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
