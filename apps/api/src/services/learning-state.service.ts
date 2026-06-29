import {
  createRecommendationFromModel,
  generateLessonFromPlan,
  summarizeResults,
  type ExerciseResult,
  type LearningSessionHandoff,
  type LearningContext,
  type LearningEvent,
  type SpeechResult,
  type SyncStatus,
  type StudentModel,
  type SynchronizationAcknowledgement,
  type TeacherMemory,
} from '@mentor-ai/shared';
import { config } from '../config/env.js';
import { learningStateRepository } from '../repositories/learning-state.repository.js';
import { privateLessonRepository } from '../repositories/private-lesson.repository.js';
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
    const completedLessonIds = new Set(state.exerciseResults.map((result) => result.lessonId));
    const lesson =
      (await privateLessonRepository.findNextForStudent(state.studentModel, completedLessonIds)) ??
      generateLessonFromPlan(aiTeacherService.planLesson(state.studentModel, context, createdAt), createdAt);

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

  async listSessionHandoffs() {
    const state = await learningStateRepository.read();
    return state.sessionHandoffs.filter((handoff) => handoff.studentId === state.student.id);
  },

  async upsertSessionHandoff(handoff: LearningSessionHandoff) {
    const state = await learningStateRepository.read();

    if (handoff.studentId !== state.student.id) {
      throw new Error('Session handoff failed identity validation.');
    }

    const safeHandoff = sanitizeSessionHandoff(handoff);
    const sessionHandoffs = [
      ...state.sessionHandoffs.filter((item) => item.id !== safeHandoff.id),
      safeHandoff,
    ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    await learningStateRepository.write({
      ...state,
      sessionHandoffs,
    });

    return safeHandoff;
  },

  async synchronize(events: LearningEvent[], exerciseResults: ExerciseResult[] = [], speechResults: SpeechResult[] = []) {
    const state = await learningStateRepository.read();
    const acceptedEventIds = new Set(state.acceptedEvents.map((event) => event.id));
    const acceptedResultIds = new Set(state.exerciseResults.map((result) => result.id));
    const acceptedSpeechResultIds = new Set(state.speechResults.map((result) => result.id));
    const acknowledgements: SynchronizationAcknowledgement[] = [];
    const newEvents: LearningEvent[] = [];
    const newResults = exerciseResults
      .filter((result) => {
        if (acceptedResultIds.has(result.id) || result.studentId !== state.student.id) {
          return false;
        }

        acceptedResultIds.add(result.id);
        return true;
      })
      .map(sanitizeExerciseResult);
    const newSpeechResults = speechResults
      .filter((result) => {
        if (acceptedSpeechResultIds.has(result.id) || result.studentId !== state.student.id) {
          return false;
        }

        acceptedSpeechResultIds.add(result.id);
        return true;
      })
      .map(sanitizeSpeechResult);

    for (const event of events) {
      const status = validateLearningEvent(event, state.student.id, acceptedEventIds);
      acknowledgements.push({
        eventId: event.id,
        status,
        reason: status === 'rejected' ? 'Event failed identity or shape validation.' : undefined,
      });

      if (status === 'accepted') {
        acceptedEventIds.add(event.id);
        newEvents.push(sanitizeLearningEvent(event));
      }
    }

    const analyzedState = analyzeExerciseResults(state.student.id, state.studentModel, newResults, newSpeechResults);
    const nextRecommendations =
      analyzedState.recommendation === undefined
        ? state.recommendations
        : [...state.recommendations, analyzedState.recommendation];
    const nextObservations = [...state.observations, ...analyzedState.observations];
    const nextTeacherMemory = promoteTeacherMemory(state.teacherMemory, nextObservations, state.student.id, now());

    const finishedCurrentLesson = newEvents.some(
      (event) => event.type === 'lesson-finished' && event.lessonId === state.currentLesson?.id,
    );

    await learningStateRepository.write({
      ...state,
      studentModel: analyzedState.studentModel,
      currentLesson: finishedCurrentLesson ? undefined : state.currentLesson,
      acceptedEvents: [...state.acceptedEvents, ...newEvents],
      exerciseResults: [...state.exerciseResults, ...newResults],
      speechResults: [...state.speechResults, ...newSpeechResults],
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
      student: state.student,
      studentModel: analyzedState.studentModel,
      studentModelVersion: analyzedState.studentModel.version,
      currentLesson: state.currentLesson,
      recommendation: nextRecommendations.at(-1) ?? createRecommendationFromModel(analyzedState.studentModel, now()),
      recommendations: nextRecommendations,
      statisticsSnapshots: analyzedState.statisticsSnapshots,
      observations: analyzedState.observations,
      teacherJournal: analyzedState.teacherJournal,
      teacherMemoryCount: nextTeacherMemory.length,
      acceptedSpeechResults: newSpeechResults.length,
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

function sanitizeLearningEvent(event: LearningEvent): LearningEvent {
  const { data: _data, ...safeEvent } = event;
  void _data;
  return safeEvent;
}

function sanitizeExerciseResult(result: ExerciseResult): ExerciseResult {
  const { response: _response, ...safeResult } = result as ExerciseResult & { response?: unknown };
  void _response;
  return safeResult;
}

function sanitizeSpeechResult(result: SpeechResult): SpeechResult {
  const {
    rawAudio: _rawAudio,
    recording: _recording,
    transcript: _transcript,
    ...safeResult
  } = result as SpeechResult & {
    rawAudio?: unknown;
    recording?: unknown;
    transcript?: unknown;
  };
  void _rawAudio;
  void _recording;
  void _transcript;

  return safeResult;
}

function sanitizeSessionHandoff(handoff: LearningSessionHandoff): LearningSessionHandoff {
  return {
    ...handoff,
    events: handoff.events.map(sanitizeLearningEvent),
    results: handoff.results.map(sanitizeExerciseResult),
    speechResults: handoff.speechResults.map(sanitizeSpeechResult),
  };
}

function defaultLearningContext(): LearningContext {
  return {
    mode: 'home',
    isOffline: false,
    speechAvailable: true,
    availableMinutes: 6,
  };
}

function analyzeExerciseResults(
  studentId: string,
  studentModel: StudentModel,
  results: ExerciseResult[],
  speechResults: SpeechResult[] = [],
) {
  if (results.length === 0) {
    return {
      studentModel,
      statisticsSnapshots: [],
      observations: [],
      teacherJournal: [],
      recommendation: undefined,
    };
  }

  const baseTime = Date.now();
  let nextStudentModel = studentModel;
  const statisticsSnapshots = [];
  const observations = [];
  const teacherJournal = [];
  let recommendation;

  for (const [index, sessionResults] of groupResultsByLessonSession(results).entries()) {
    const createdAt = new Date(baseTime + index).toISOString();
    const summary = summarizeResults(sessionResults);
    const firstResult = sessionResults[0];
    const reflection = aiTeacherService.reflectOnResults(studentId, nextStudentModel, sessionResults, createdAt);
    const sessionSpeechResults = speechResults.filter((result) => result.sessionId === firstResult.sessionId);
    const pronunciationIssues = sessionSpeechResults.flatMap((result) => result.pronunciationIssues);

    nextStudentModel = reflection.studentModel;
    observations.push(...reflection.observations);
    teacherJournal.push(reflection.journalEntry);
    recommendation = reflection.recommendation;
    statisticsSnapshots.push({
      id: `statistics-${firstResult.sessionId}-${createdAt}`,
      studentId,
      sessionId: firstResult.sessionId,
      lessonId: firstResult.lessonId,
      accuracy: summary.accuracy,
      averageResponseTimeMs: summary.averageResponseTimeMs,
      attempts: summary.attempts,
      completedExercises: summary.completedExercises,
      audioReplays: 0,
      speechAttempts: sessionResults.filter((result) => result.exerciseType === 'repeat-speaking').length,
      pronunciationIssueCount: pronunciationIssues.length,
      pronunciationFocus: Array.from(new Set(pronunciationIssues.map((issue) => issue.word))).slice(0, 4),
      fatigueSignal: summary.fatigueSignal,
      createdAt,
    });
  }

  return {
    studentModel: nextStudentModel,
    statisticsSnapshots,
    observations,
    teacherJournal,
    recommendation,
  };
}

function groupResultsByLessonSession(results: ExerciseResult[]): ExerciseResult[][] {
  const groups = new Map<string, ExerciseResult[]>();

  for (const result of results) {
    const groupKey = `${result.sessionId}:${result.lessonId}`;
    const sessionResults = groups.get(groupKey) ?? [];
    sessionResults.push(result);
    groups.set(groupKey, sessionResults);
  }

  return Array.from(groups.values());
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
