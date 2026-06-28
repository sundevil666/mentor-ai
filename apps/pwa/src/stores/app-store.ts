import { defineStore } from 'pinia';
import {
  createEvidenceId,
  createLessonPlan,
  createObservationFromResults,
  createRecommendationFromModel,
  demoStudent,
  generateLessonFromPlan,
  initialStudentModel,
  scoreExercise,
  updateStudentModelFromResults,
  type Exercise,
  type ExerciseResult,
  type GeneratedLesson,
  type LearningEvent,
  type LearningContext,
  type Observation,
  type Recommendation,
  type StatisticsSnapshot,
  type StorageMode,
  type StudentModel,
} from '@mentor-ai/shared';
import { synchronizeLearningEvents } from 'src/services/api-client';
import { mentorDb } from 'src/services/indexed-db';

interface LearningSessionState {
  id: string;
  lesson: GeneratedLesson;
  currentExerciseIndex: number;
  startedAt: string;
  exerciseStartedAt: string;
  events: LearningEvent[];
  results: ExerciseResult[];
  observation?: Observation;
  recommendation?: Recommendation;
  completedAt?: string;
}

interface AppState {
  storageMode: StorageMode;
  isOfflineReady: boolean;
  studentModel: StudentModel;
  session: LearningSessionState | null;
  latestRecommendation: Recommendation | null;
  pendingSyncEvents: number;
  isHydrated: boolean;
}

const sessionStoreKey = 'active-session';

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    storageMode: 'demo',
    isOfflineReady: true,
    studentModel: initialStudentModel,
    session: null,
    latestRecommendation: null,
    pendingSyncEvents: 0,
    isHydrated: false,
  }),

  getters: {
    currentExercise: (state): Exercise | null => state.session?.lesson.exercises[state.session.currentExerciseIndex] ?? null,
    isLessonComplete: (state): boolean => Boolean(state.session?.completedAt),
    pendingSyncCount: (state): number => state.pendingSyncEvents,
  },

  actions: {
    async hydrate() {
      const db = await mentorDb;
      const savedModel = await db.get('student-models', initialStudentModel.id);
      const savedSession = await db.get('learning-sessions', sessionStoreKey);
      const queuedEvents = await db.getAll('sync-queue');

      this.studentModel = (savedModel as StudentModel | undefined) ?? initialStudentModel;
      this.session = (savedSession as LearningSessionState | undefined) ?? null;
      this.latestRecommendation = this.session?.recommendation ?? createRecommendationFromModel(this.studentModel, now());
      this.pendingSyncEvents = queuedEvents.filter((event) => event.status === 'pending').length;
      this.isHydrated = true;
    },

    async startLesson(context: LearningContext = createDefaultLearningContext()) {
      const createdAt = now();
      const plan = createLessonPlan(this.studentModel, context, createdAt);
      const lesson = generateLessonFromPlan(plan, createdAt);
      const sessionId = sessionStoreKey;
      const firstExercise = lesson.exercises[0];
      const startedEvent = createLearningEvent(sessionId, lesson.id, undefined, 'lesson-started', createdAt);
      const firstExerciseEvent = createLearningEvent(sessionId, lesson.id, firstExercise?.id, 'exercise-started', createdAt);

      this.session = {
        id: sessionId,
        lesson,
        currentExerciseIndex: 0,
        startedAt: createdAt,
        exerciseStartedAt: createdAt,
        events: [startedEvent, firstExerciseEvent],
        results: [],
      };

      await this.persistSession();
    },

    async submitCurrentExercise(response: string) {
      if (!this.session || this.currentExercise === null) {
        return;
      }

      const submittedAt = now();
      const exercise = this.currentExercise;
      const finishedEvent = createLearningEvent(
        this.session.id,
        this.session.lesson.id,
        exercise.id,
        'exercise-finished',
        submittedAt,
        { response },
      );
      const result = createExerciseResult(
        this.session.id,
        this.session.lesson.id,
        exercise,
        response,
        submittedAt,
        Math.max(0, Date.parse(submittedAt) - Date.parse(this.session.exerciseStartedAt)),
        createEvidenceId(finishedEvent),
      );

      this.session.events.push(finishedEvent);
      this.session.results.push(result);

      const nextIndex = this.session.currentExerciseIndex + 1;

      if (nextIndex >= this.session.lesson.exercises.length) {
        await this.finishLesson(submittedAt);
        return;
      }

      const nextExercise = this.session.lesson.exercises[nextIndex];
      this.session.currentExerciseIndex = nextIndex;
      this.session.exerciseStartedAt = submittedAt;
      this.session.events.push(
        createLearningEvent(this.session.id, this.session.lesson.id, nextExercise.id, 'exercise-started', submittedAt),
      );

      await this.persistSession();
    },

    async replayAudio() {
      if (!this.session || this.currentExercise === null) {
        return;
      }

      this.session.events.push(
        createLearningEvent(this.session.id, this.session.lesson.id, this.currentExercise.id, 'audio-replayed', now()),
      );

      await this.persistSession();
    },

    async resetLocalLearning() {
      const db = await mentorDb;

      this.studentModel = initialStudentModel;
      this.session = null;
      this.latestRecommendation = createRecommendationFromModel(initialStudentModel, now());
      this.pendingSyncEvents = 0;

      await db.put('student-models', this.studentModel);
      await db.delete('learning-sessions', sessionStoreKey);
      await db.clear('sync-queue');
    },

    async finishLesson(completedAt: string) {
      if (!this.session) {
        return;
      }

      const lessonFinishedEvent = createLearningEvent(
        this.session.id,
        this.session.lesson.id,
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

      if (navigator.onLine) {
        await this.syncPendingEvents();
      }
    },

    async persistSession() {
      if (!this.session) {
        return;
      }

      const db = await mentorDb;
      await db.put('learning-sessions', this.session);
      await db.put('lessons', this.session.lesson);
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

      const snapshot: StatisticsSnapshot = {
        id: `statistics-${this.session.id}`,
        studentId: demoStudent.id,
        sessionId: this.session.id,
        lessonId: this.session.lesson.id,
        accuracy: completed.length === 0 ? 0 : correct / completed.length,
        averageResponseTimeMs: completed.length === 0 ? 0 : Math.round(responseTime / completed.length),
        attempts: completed.reduce((sum, result) => sum + result.attempts, 0),
        completedExercises: completed.length,
        audioReplays: this.session.events.filter((event) => event.type === 'audio-replayed').length,
        speechAttempts: this.session.events.filter((event) => event.type === 'speech-attempted').length,
        fatigueSignal: this.studentModel.fatigue,
        createdAt,
      };

      const db = await mentorDb;
      await db.put('statistics', { ...snapshot, userId: demoStudent.id });
    },

    async persistSyncQueue() {
      if (!this.session) {
        return;
      }

      const db = await mentorDb;

      for (const event of this.session.events) {
        await db.put('sync-queue', { ...event, status: 'pending' });
      }

      const queuedEvents = await db.getAll('sync-queue');
      this.pendingSyncEvents = queuedEvents.filter((event) => event.status === 'pending').length;
    },

    async syncPendingEvents() {
      const db = await mentorDb;
      const queuedEvents = await db.getAll('sync-queue');
      const pendingEvents = queuedEvents.filter((event) => event.status === 'pending') as Array<LearningEvent & { status: string }>;

      if (pendingEvents.length === 0) {
        this.pendingSyncEvents = 0;
        return;
      }

      try {
        const result = await synchronizeLearningEvents(pendingEvents);

        for (const acknowledgement of result.acknowledgements) {
          const queuedEvent = pendingEvents.find((event) => event.id === acknowledgement.eventId);

          if (queuedEvent) {
            await db.put('sync-queue', { ...queuedEvent, status: acknowledgement.status });
          }
        }

        const updatedQueue = await db.getAll('sync-queue');
        this.pendingSyncEvents = updatedQueue.filter((event) => event.status === 'pending').length;
      } catch {
        this.pendingSyncEvents = pendingEvents.length;
      }
    },
  },
});

function createDefaultLearningContext(): LearningContext {
  return {
    mode: 'home',
    isOffline: !navigator.onLine,
    speechAvailable: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    availableMinutes: 6,
  };
}

function createLearningEvent(
  sessionId: string,
  lessonId: string,
  exerciseId: string | undefined,
  type: LearningEvent['type'],
  occurredAt: string,
  data?: LearningEvent['data'],
): LearningEvent {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    studentId: demoStudent.id,
    sessionId,
    lessonId,
    exerciseId,
    type,
    occurredAt,
    data,
  };
}

function createExerciseResult(
  sessionId: string,
  lessonId: string,
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
    lessonId,
    exerciseId: exercise.id,
    exerciseType: exercise.type,
    targetSkill: exercise.targetSkill,
    response,
    correct: scoreExercise(exercise, response),
    attempts: 1,
    responseTimeMs,
    completionState: response.trim().length === 0 ? 'skipped' : 'completed',
    evidenceEventIds: [evidenceId],
    completedAt,
  };
}

function now(): string {
  return new Date().toISOString();
}
