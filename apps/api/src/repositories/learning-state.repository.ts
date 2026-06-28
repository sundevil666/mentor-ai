import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createRecommendationFromModel,
  demoStudent,
  initialStudentModel,
  type GeneratedLesson,
  type ExerciseResult,
  type LearningEvent,
  type Observation,
  type Recommendation,
  type StatisticsSnapshot,
  type Student,
  type StudentModel,
  type SynchronizationAcknowledgement,
  type TeacherJournalEntry,
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
  statisticsSnapshots: StatisticsSnapshot[];
  observations: Observation[];
  teacherJournal: TeacherJournalEntry[];
  acknowledgements: SynchronizationAcknowledgement[];
}

const demoState: LearningStateRecord = {
  student: demoStudent,
  studentModel: initialStudentModel,
  recommendations: [createRecommendationFromModel(initialStudentModel, initialStudentModel.updatedAt)],
  acceptedEvents: [],
  exerciseResults: [],
  statisticsSnapshots: [],
  observations: [],
  teacherJournal: [],
  acknowledgements: [],
};

export const learningStateRepository = {
  async read(): Promise<LearningStateRecord> {
    if (config.storageMode === 'demo') {
      return cloneState(demoState);
    }

    const filePath = stateFilePath();

    try {
      const file = await readFile(filePath, 'utf8');
      return JSON.parse(file) as LearningStateRecord;
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

function isMissingFileError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
