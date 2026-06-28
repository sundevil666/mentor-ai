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
  async read(): Promise<LearningStateRecord> {
    if (config.storageMode === 'demo') {
      return cloneState(demoState);
    }

    const filePath = stateFilePath();

    try {
      const file = await readFile(filePath, 'utf8');
      return normalizeState(JSON.parse(file) as Partial<LearningStateRecord>);
    } catch (error) {
      if (isMissingFileError(error)) {
        await learningStateRepository.write(demoState);
        return cloneState(demoState);
      }

      throw error;
    }
  },

  async write(state: LearningStateRecord): Promise<void> {
    if (config.storageMode === 'demo') {
      Object.assign(demoState, cloneState(state));
      return;
    }

    const filePath = stateFilePath();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  },
};

function stateFilePath(): string {
  return resolvePersonalStoragePath('learning-state.json');
}

function cloneState(state: LearningStateRecord): LearningStateRecord {
  return JSON.parse(JSON.stringify(state)) as LearningStateRecord;
}

function normalizeState(state: Partial<LearningStateRecord>): LearningStateRecord {
  return {
    student: state.student ?? demoState.student,
    studentModel: state.studentModel ?? demoState.studentModel,
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

function isMissingFileError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
