import {
  createRecommendationFromModel,
  generateLessonFromPlan,
  summarizeResults,
  type ExerciseResult,
  type LearningContext,
  type LearningEvent,
  type SyncStatus,
  type StudentModel,
  type SynchronizationAcknowledgement,
  type TeacherMemory,
} from '@mentor-ai/shared';
import { config } from '../config/env.js';
import { learningStateRepository } from '../repositories/learning-state.repository.js';
import { aiTeacherService } from './ai-teacher.service.js';

export const learningStateService = {
  async getStudentState() {
    const state = await learningStateRepository.read();

    return {
      student: state.student,
      studentModel: state.studentModel,
      recommendation: state.recommendations.at(-1) ?? createRecommendationFromModel(state.studentModel, now()),
    };
  },

  async getCurrentLesson(context: LearningContext = defaultLearningContext()) {
    const state = await learningStateRepository.read();

    if (state.currentLesson) {
      return state.currentLesson;
    }

    const createdAt = now();
    const plan = aiTeacherService.planLesson(state.studentModel, context, createdAt);
    const lesson = generateLessonFromPlan(plan, createdAt);

    await learningStateRepository.write({
      ...state,
      currentLesson: lesson,
    });

    return lesson;
  },

  async getRecommendations() {
    const state = await learningStateRepository.read();
    return state.recommendations;
  },

  async synchronize(events: LearningEvent[], exerciseResults: ExerciseResult[] = []) {
    const state = await learningStateRepository.read();
    const acceptedEventIds = new Set(state.acceptedEvents.map((event) => event.id));
    const acceptedResultIds = new Set(state.exerciseResults.map((result) => result.id));
    const acknowledgements: SynchronizationAcknowledgement[] = [];
    const newEvents: LearningEvent[] = [];
    const newResults = exerciseResults.filter((result) => {
      if (acceptedResultIds.has(result.id) || result.studentId !== state.student.id) {
        return false;
      }

      acceptedResultIds.add(result.id);
      return true;
    });

    for (const event of events) {
      const status = validateLearningEvent(event, state.student.id, acceptedEventIds);
      acknowledgements.push({
        eventId: event.id,
        status,
        reason: status === 'rejected' ? 'Event failed identity or shape validation.' : undefined,
      });

      if (status === 'accepted') {
        acceptedEventIds.add(event.id);
        newEvents.push(event);
      }
    }

    const analyzedState = analyzeExerciseResults(state.student.id, state.studentModel, newResults);
    const nextRecommendations =
      analyzedState.recommendation === undefined
        ? state.recommendations
        : [...state.recommendations, analyzedState.recommendation];
    const nextObservations = [...state.observations, ...analyzedState.observations];
    const nextTeacherMemory = promoteTeacherMemory(state.teacherMemory, nextObservations, state.student.id, now());

    await learningStateRepository.write({
      ...state,
      studentModel: analyzedState.studentModel,
      acceptedEvents: [...state.acceptedEvents, ...newEvents],
      exerciseResults: [...state.exerciseResults, ...newResults],
      statisticsSnapshots: [...state.statisticsSnapshots, ...analyzedState.statisticsSnapshots],
      observations: nextObservations,
      teacherJournal: [...state.teacherJournal, ...analyzedState.teacherJournal],
      teacherMemory: nextTeacherMemory,
      recommendations: nextRecommendations,
      acknowledgements: [...state.acknowledgements, ...acknowledgements],
    });

    return {
      acknowledgements,
      acceptedCount: acknowledgements.filter((acknowledgement) => acknowledgement.status === 'accepted').length,
      pendingAnalysis: false,
      studentModelVersion: analyzedState.studentModel.version,
      currentLesson: state.currentLesson,
      recommendations: nextRecommendations,
      statisticsSnapshots: analyzedState.statisticsSnapshots,
      observations: analyzedState.observations,
      teacherJournal: analyzedState.teacherJournal,
      teacherMemoryCount: nextTeacherMemory.length,
    };
  },

  getConfiguration() {
    return {
      storageMode: config.storageMode,
      supportedLanguages: ['en'],
      synchronizationProtocolVersion: 1,
      lessonSchemaVersion: 1,
      speech: {
        advancedPronunciationScoring: false,
      },
    };
  },
};

function validateLearningEvent(event: LearningEvent, studentId: string, acceptedEventIds: Set<string>): SyncStatus {
  if (acceptedEventIds.has(event.id)) {
    return 'duplicate';
  }

  if (
    event.studentId !== studentId ||
    event.id.trim().length === 0 ||
    event.sessionId.trim().length === 0 ||
    Number.isNaN(Date.parse(event.occurredAt))
  ) {
    return 'rejected';
  }

  return 'accepted';
}

function defaultLearningContext(): LearningContext {
  return {
    mode: 'home',
    isOffline: false,
    speechAvailable: true,
    availableMinutes: 6,
  };
}

function analyzeExerciseResults(studentId: string, studentModel: StudentModel, results: ExerciseResult[]) {
  if (results.length === 0) {
    return {
      studentModel,
      statisticsSnapshots: [],
      observations: [],
      teacherJournal: [],
      recommendation: undefined,
    };
  }

  const createdAt = now();
  const summary = summarizeResults(results);
  const firstResult = results[0];
  const reflection = aiTeacherService.reflectOnResults(studentId, studentModel, results, createdAt);

  return {
    studentModel: reflection.studentModel,
    statisticsSnapshots: [
      {
        id: `statistics-${firstResult.sessionId}-${createdAt}`,
        studentId,
        sessionId: firstResult.sessionId,
        lessonId: firstResult.lessonId,
        accuracy: summary.accuracy,
        averageResponseTimeMs: summary.averageResponseTimeMs,
        attempts: summary.attempts,
        completedExercises: summary.completedExercises,
        audioReplays: 0,
        speechAttempts: results.filter((result) => result.exerciseType === 'repeat-speaking').length,
        fatigueSignal: summary.fatigueSignal,
        createdAt,
      },
    ],
    observations: reflection.observations,
    teacherJournal: [reflection.journalEntry],
    recommendation: reflection.recommendation,
  };
}

function promoteTeacherMemory(
  existingMemory: TeacherMemory[],
  observations: ReturnType<typeof analyzeExerciseResults>['observations'],
  studentId: string,
  updatedAt: string,
): TeacherMemory[] {
  const memoryById = new Map(existingMemory.map((memory) => [memory.id, memory]));
  const observationsBySkill = new Map<string, typeof observations>();

  for (const observation of observations) {
    const matchingObservations = observationsBySkill.get(observation.skill) ?? [];
    matchingObservations.push(observation);
    observationsBySkill.set(observation.skill, matchingObservations);
  }

  for (const [skill, skillObservations] of observationsBySkill.entries()) {
    if (skillObservations.length < 2) {
      continue;
    }

    const memoryId = `memory-${studentId}-${skill}`;
    const existing = memoryById.get(memoryId);

    memoryById.set(memoryId, {
      id: memoryId,
      studentId,
      version: existing ? existing.version + 1 : 1,
      fact: `${skill} has repeated evidence and should inform future lesson planning.`,
      evidenceIds: Array.from(new Set(skillObservations.flatMap((observation) => observation.evidenceIds))),
      confidence: Math.min(0.9, 0.5 + skillObservations.length * 0.1),
      updatedAt,
    });
  }

  return Array.from(memoryById.values());
}

function now(): string {
  return new Date().toISOString();
}
