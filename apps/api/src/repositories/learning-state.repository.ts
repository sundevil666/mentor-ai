import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createRecommendationFromModel,
  demoStudent,
  initialStudentModel,
  type GeneratedLesson,
  type ExerciseResult,
  type LearningSessionHandoff,
  type LearningEvent,
  type Observation,
  type Recommendation,
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
};

export const learningStateRepository = {
  async read(user?: AuthenticatedUser): Promise<LearningStateRecord> {
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
    if (config.storageMode === 'demo') {
      Object.assign(demoState, cloneState(state));
      return;
    }

    const filePath = stateFilePath(user);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  },
};

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
