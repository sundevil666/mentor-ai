import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createRecommendationFromModel,
  type ApplicationTelemetryEvent,
  demoStudent,
  initialStudentModel,
  type GeneratedLesson,
  type ContentProgress,
  type ContentEngagementEvent,
  type ExerciseResult,
  type LearningSessionHandoff,
  type LearningEvent,
  type LearningActivityEvent,
  type LearningActivityTotals,
  type Observation,
  type PersonalReadingBookArchive,
  type Recommendation,
  type ReaderVocabularyItem,
  type ReadingTranscriptChunk,
  type ReadingDeviceSession,
  type SpeechResult,
  type StatisticsSnapshot,
  type Student,
  type StudentModel,
  type SynchronizationAcknowledgement,
  type TeacherJournalEntry,
  type TeacherMemory,
} from '@mentor-ai/shared';
import { config } from '../config/env.js';
import { resolvePersonalStoragePath } from '../utils/storage-path.js';
import type { AuthenticatedUser } from '../services/auth.service.js';
import { getPostgresPool } from './postgres-client.js';

interface LearningStateRecord {
  student: Student;
  studentModel: StudentModel;
  currentLesson?: GeneratedLesson;
  recommendations: Recommendation[];
  acceptedEvents: LearningEvent[];
  exerciseResults: ExerciseResult[];
  speechResults: SpeechResult[];
  statisticsSnapshots: StatisticsSnapshot[];
  observations: Observation[];
  teacherJournal: TeacherJournalEntry[];
  teacherMemory: TeacherMemory[];
  acknowledgements: SynchronizationAcknowledgement[];
  sessionHandoffs: LearningSessionHandoff[];
  contentProgress: ContentProgress[];
  contentEngagementEvents: ContentEngagementEvent[];
  applicationTelemetryEvents: ApplicationTelemetryEvent[];
  readerVocabularyItems: ReaderVocabularyItem[];
  personalReadingBooks: PersonalReadingBookArchive[];
  readingTranscriptChunks: ReadingTranscriptChunk[];
  readingDeviceSessions: ReadingDeviceSession[];
  learningActivityEvents: LearningActivityEvent[];
  learningActivityTotals: LearningActivityTotals;
}

const demoState: LearningStateRecord = {
  student: demoStudent,
  studentModel: initialStudentModel,
  recommendations: [createRecommendationFromModel(initialStudentModel, initialStudentModel.updatedAt)],
  acceptedEvents: [],
  exerciseResults: [],
  speechResults: [],
  statisticsSnapshots: [],
  observations: [],
  teacherJournal: [],
  teacherMemory: [],
  acknowledgements: [],
  sessionHandoffs: [],
  contentProgress: [],
  contentEngagementEvents: [],
  applicationTelemetryEvents: [],
  readerVocabularyItems: [],
  personalReadingBooks: [],
  readingTranscriptChunks: [],
  readingDeviceSessions: [],
  learningActivityEvents: [],
  learningActivityTotals: { listeningSeconds: 0, readingSeconds: 0, speakingSeconds: 0, totalSeconds: 0, updatedAt: null },
};

export const learningStateRepository = {
  async read(user?: AuthenticatedUser): Promise<LearningStateRecord> {
    if (user && getPostgresPool()) {
      const pool = getPostgresPool()!;
      await ensureLearningStatesTable();
      const result = await pool.query<{ state: Partial<LearningStateRecord> }>(
        'SELECT state FROM learning_states WHERE student_id = $1',
        [user.id],
      );
      if (result.rows[0]?.state) return normalizeState(result.rows[0].state, user);
      const initialState = createStateForUser(user);
      await writeDatabaseState(user.id, initialState);
      return initialState;
    }

    if (config.storageMode === 'demo') {
      return createStateForUser(user);
    }

    const filePath = stateFilePath(user);

    try {
      const file = await readFile(filePath, 'utf8');
      return normalizeState(JSON.parse(file) as Partial<LearningStateRecord>, user);
    } catch (error) {
      if (isMissingFileError(error)) {
        const initialState = createStateForUser(user);
        await learningStateRepository.write(initialState, user);
        return initialState;
      }

      throw error;
    }
  },

  async write(state: LearningStateRecord, user?: AuthenticatedUser): Promise<void> {
    if (user && getPostgresPool()) {
      await ensureLearningStatesTable();
      await writeDatabaseState(user.id, state);
      return;
    }

    if (config.storageMode === 'demo') {
      Object.assign(demoState, cloneState(state));
      return;
    }

    const filePath = stateFilePath(user);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  },

  async readStudentOverview(user?: AuthenticatedUser): Promise<Pick<LearningStateRecord,
    'student' | 'studentModel' | 'recommendations' | 'statisticsSnapshots'>> {
    if (user && getPostgresPool()) {
      const pool = getPostgresPool()!;
      await ensureLearningStatesTable();
      const result = await pool.query<{
        student: Student | null;
        student_model: StudentModel | null;
        recommendations: Recommendation[] | null;
        statistics_snapshots: StatisticsSnapshot[] | null;
      }>(
        `SELECT state->'student' AS student,
                state->'studentModel' AS student_model,
                state->'recommendations' AS recommendations,
                state->'statisticsSnapshots' AS statistics_snapshots
         FROM learning_states WHERE student_id = $1`,
        [user.id],
      );
      const row = result.rows[0];
      if (row?.student && row.student_model) {
        return {
          student: row.student,
          studentModel: row.student_model,
          recommendations: row.recommendations ?? [],
          statisticsSnapshots: row.statistics_snapshots ?? [],
        };
      }
    }

    const state = await learningStateRepository.read(user);
    return pickStudentOverview(state);
  },

  async readSessionHandoffsState(user?: AuthenticatedUser): Promise<{
    studentId: string;
    sessionHandoffs: LearningSessionHandoff[];
  }> {
    if (user && getPostgresPool()) {
      const pool = getPostgresPool()!;
      await ensureLearningStatesTable();
      const result = await pool.query<{
        student_id: string | null;
        session_handoffs: LearningSessionHandoff[] | null;
      }>(
        `SELECT state->'student'->>'id' AS student_id,
                state->'sessionHandoffs' AS session_handoffs
         FROM learning_states WHERE student_id = $1`,
        [user.id],
      );
      const row = result.rows[0];
      if (row?.student_id) {
        return { studentId: row.student_id, sessionHandoffs: row.session_handoffs ?? [] };
      }
    }

    const state = await learningStateRepository.read(user);
    return { studentId: state.student.id, sessionHandoffs: state.sessionHandoffs };
  },

  async readContentProgressState(user?: AuthenticatedUser): Promise<{
    studentId: string;
    contentProgress: ContentProgress[];
  }> {
    if (user && getPostgresPool()) {
      const pool = getPostgresPool()!;
      await ensureLearningStatesTable();
      const result = await pool.query<{
        student_id: string | null;
        content_progress: ContentProgress[] | null;
      }>(
        `SELECT state->'student'->>'id' AS student_id,
                state->'contentProgress' AS content_progress
         FROM learning_states WHERE student_id = $1`,
        [user.id],
      );
      const row = result.rows[0];
      if (row?.student_id) return { studentId: row.student_id, contentProgress: row.content_progress ?? [] };
    }

    const state = await learningStateRepository.read(user);
    return { studentId: state.student.id, contentProgress: state.contentProgress };
  },

  async writeContentProgress(contentProgress: ContentProgress[], user?: AuthenticatedUser): Promise<void> {
    if (user && getPostgresPool()) {
      const pool = getPostgresPool()!;
      await ensureLearningStatesTable();
      const result = await pool.query(
        `UPDATE learning_states
         SET state = jsonb_set(state, '{contentProgress}', $2::jsonb, true), updated_at = now()
         WHERE student_id = $1`,
        [user.id, JSON.stringify(contentProgress)],
      );
      if ((result.rowCount ?? 0) > 0) return;
    }

    const state = await learningStateRepository.read(user);
    await learningStateRepository.write({ ...state, contentProgress }, user);
  },

  async readLearningActivityState(user?: AuthenticatedUser): Promise<{
    studentId: string;
    learningActivityEvents: LearningActivityEvent[];
    learningActivityTotals: LearningActivityTotals;
    contentProgress: ContentProgress[];
    statisticsSnapshots: StatisticsSnapshot[];
  }> {
    if (user && getPostgresPool()) {
      const pool = getPostgresPool()!;
      await ensureLearningStatesTable();
      const result = await pool.query<{
        student_id: string | null;
        learning_activity_events: LearningActivityEvent[] | null;
        learning_activity_totals: LearningActivityTotals | null;
        content_progress: ContentProgress[] | null;
        statistics_snapshots: StatisticsSnapshot[] | null;
      }>(
        `SELECT state->'student'->>'id' AS student_id,
                state->'learningActivityEvents' AS learning_activity_events,
                state->'learningActivityTotals' AS learning_activity_totals,
                state->'contentProgress' AS content_progress,
                state->'statisticsSnapshots' AS statistics_snapshots
         FROM learning_states WHERE student_id = $1`,
        [user.id],
      );
      const row = result.rows[0];
      if (row?.student_id) {
        return {
          studentId: row.student_id,
          learningActivityEvents: row.learning_activity_events ?? [],
          learningActivityTotals: row.learning_activity_totals ?? { ...demoState.learningActivityTotals },
          contentProgress: row.content_progress ?? [],
          statisticsSnapshots: row.statistics_snapshots ?? [],
        };
      }
    }

    const state = await learningStateRepository.read(user);
    return {
      studentId: state.student.id,
      learningActivityEvents: state.learningActivityEvents,
      learningActivityTotals: state.learningActivityTotals,
      contentProgress: state.contentProgress,
      statisticsSnapshots: state.statisticsSnapshots,
    };
  },

  async readLearningActivitySummary(user?: AuthenticatedUser): Promise<{
    learningActivityTotals: LearningActivityTotals;
    contentProgress: ContentProgress[];
    statisticsSnapshots: StatisticsSnapshot[];
  }> {
    if (user && getPostgresPool()) {
      const pool = getPostgresPool()!;
      await ensureLearningStatesTable();
      const result = await pool.query<{
        learning_activity_totals: LearningActivityTotals | null;
        content_progress: ContentProgress[] | null;
        statistics_snapshots: StatisticsSnapshot[] | null;
      }>(
        `SELECT state->'learningActivityTotals' AS learning_activity_totals,
                state->'contentProgress' AS content_progress,
                state->'statisticsSnapshots' AS statistics_snapshots
         FROM learning_states WHERE student_id = $1`,
        [user.id],
      );
      const row = result.rows[0];
      if (row) {
        return {
          learningActivityTotals: row.learning_activity_totals ?? { ...demoState.learningActivityTotals },
          contentProgress: row.content_progress ?? [],
          statisticsSnapshots: row.statistics_snapshots ?? [],
        };
      }
    }

    const state = await learningStateRepository.read(user);
    return {
      learningActivityTotals: state.learningActivityTotals,
      contentProgress: state.contentProgress,
      statisticsSnapshots: state.statisticsSnapshots,
    };
  },

  async writeLearningActivityState(
    learningActivityEvents: LearningActivityEvent[],
    learningActivityTotals: LearningActivityTotals,
    user?: AuthenticatedUser,
  ): Promise<void> {
    if (user && getPostgresPool()) {
      const pool = getPostgresPool()!;
      await ensureLearningStatesTable();
      const result = await pool.query(
        `UPDATE learning_states
         SET state = jsonb_set(
               jsonb_set(state, '{learningActivityEvents}', $2::jsonb, true),
               '{learningActivityTotals}', $3::jsonb, true
             ),
             updated_at = now()
         WHERE student_id = $1`,
        [user.id, JSON.stringify(learningActivityEvents), JSON.stringify(learningActivityTotals)],
      );
      if ((result.rowCount ?? 0) > 0) return;
    }

    const state = await learningStateRepository.read(user);
    await learningStateRepository.write({ ...state, learningActivityEvents, learningActivityTotals }, user);
  },

  async readReadingResumeState(user?: AuthenticatedUser): Promise<{
    studentId: string;
    contentProgress: ContentProgress[];
    readingDeviceSessions: ReadingDeviceSession[];
  }> {
    if (user && getPostgresPool()) {
      const pool = getPostgresPool()!;
      await ensureLearningStatesTable();
      const result = await pool.query<{
        content_progress: ContentProgress[] | null;
        reading_device_sessions: ReadingDeviceSession[] | null;
      }>(
        `SELECT state->'contentProgress' AS content_progress,
                state->'readingDeviceSessions' AS reading_device_sessions
         FROM learning_states WHERE student_id = $1`,
        [user.id],
      );
      if (result.rows[0]) {
        return {
          studentId: user.id,
          contentProgress: result.rows[0].content_progress ?? [],
          readingDeviceSessions: result.rows[0].reading_device_sessions ?? [],
        };
      }
    }

    const state = await learningStateRepository.read(user);
    return {
      studentId: state.student.id,
      contentProgress: state.contentProgress,
      readingDeviceSessions: state.readingDeviceSessions,
    };
  },

  async writeReadingDeviceSessions(sessions: ReadingDeviceSession[], user?: AuthenticatedUser): Promise<void> {
    if (user && getPostgresPool()) {
      const pool = getPostgresPool()!;
      await ensureLearningStatesTable();
      const result = await pool.query(
        `UPDATE learning_states
         SET state = jsonb_set(state, '{readingDeviceSessions}', $2::jsonb, true), updated_at = now()
         WHERE student_id = $1`,
        [user.id, JSON.stringify(sessions)],
      );
      if ((result.rowCount ?? 0) > 0) return;
    }

    const state = await learningStateRepository.read(user);
    await learningStateRepository.write({ ...state, readingDeviceSessions: sessions }, user);
  },
};

function pickStudentOverview(state: LearningStateRecord) {
  return {
    student: state.student,
    studentModel: state.studentModel,
    recommendations: state.recommendations,
    statisticsSnapshots: state.statisticsSnapshots,
  };
}

let ensureTablePromise: Promise<void> | undefined;

function ensureLearningStatesTable(): Promise<void> {
  ensureTablePromise ??= (async () => {
    const pool = getPostgresPool();
    if (!pool) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS learning_states (
        student_id TEXT PRIMARY KEY,
        state JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  })();
  return ensureTablePromise;
}

async function writeDatabaseState(studentId: string, state: LearningStateRecord): Promise<void> {
  const pool = getPostgresPool();
  if (!pool) return;
  await pool.query(
    `INSERT INTO learning_states (student_id, state, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (student_id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
    [studentId, JSON.stringify(state)],
  );
}

function stateFilePath(user?: AuthenticatedUser): string {
  if (!user) {
    return resolvePersonalStoragePath('learning-state.json');
  }

  return resolvePersonalStoragePath('users', sanitizePathSegment(user.id), 'learning-state.json');
}

function cloneState(state: LearningStateRecord): LearningStateRecord {
  return JSON.parse(JSON.stringify(state)) as LearningStateRecord;
}

function normalizeState(state: Partial<LearningStateRecord>, user?: AuthenticatedUser): LearningStateRecord {
  const defaultState = createStateForUser(user);

  return {
    student: state.student ?? defaultState.student,
    studentModel: state.studentModel ?? defaultState.studentModel,
    currentLesson: state.currentLesson,
    recommendations: state.recommendations ?? [],
    acceptedEvents: state.acceptedEvents ?? [],
    exerciseResults: state.exerciseResults ?? [],
    speechResults: state.speechResults ?? [],
    statisticsSnapshots: state.statisticsSnapshots ?? [],
    observations: state.observations ?? [],
    teacherJournal: state.teacherJournal ?? [],
    teacherMemory: state.teacherMemory ?? [],
    acknowledgements: state.acknowledgements ?? [],
    sessionHandoffs: state.sessionHandoffs ?? [],
    contentProgress: state.contentProgress ?? [],
    contentEngagementEvents: state.contentEngagementEvents ?? [],
    applicationTelemetryEvents: state.applicationTelemetryEvents ?? [],
    readerVocabularyItems: state.readerVocabularyItems ?? [],
    personalReadingBooks: state.personalReadingBooks ?? [],
    readingTranscriptChunks: state.readingTranscriptChunks ?? [],
    readingDeviceSessions: state.readingDeviceSessions ?? [],
    learningActivityEvents: state.learningActivityEvents ?? [],
    learningActivityTotals: state.learningActivityTotals ?? defaultState.learningActivityTotals,
  };
}

function createStateForUser(user?: AuthenticatedUser): LearningStateRecord {
  if (!user) {
    return cloneState(demoState);
  }

  const state = cloneState(demoState);
  state.student = {
    ...state.student,
    id: user.id,
    displayName: user.displayName,
  };
  state.studentModel = {
    ...state.studentModel,
    id: `${user.id}-model`,
    studentId: user.id,
  };
  state.recommendations = state.recommendations.map((recommendation) => ({
    ...recommendation,
    studentId: user.id,
  }));

  return state;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 80);
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
