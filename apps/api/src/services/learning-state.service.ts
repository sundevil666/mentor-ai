import {
  createLessonPlan,
  createRecommendationFromModel,
  generateLessonFromPlan,
  type LearningContext,
  type LearningEvent,
  type SyncStatus,
  type SynchronizationAcknowledgement,
} from '@mentor-ai/shared';
import { config } from '../config/env.js';
import { learningStateRepository } from '../repositories/learning-state.repository.js';

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
    const plan = createLessonPlan(state.studentModel, context, createdAt);
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

  async synchronize(events: LearningEvent[]) {
    const state = await learningStateRepository.read();
    const acceptedEventIds = new Set(state.acceptedEvents.map((event) => event.id));
    const acknowledgements: SynchronizationAcknowledgement[] = [];
    const newEvents: LearningEvent[] = [];

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

    await learningStateRepository.write({
      ...state,
      acceptedEvents: [...state.acceptedEvents, ...newEvents],
      acknowledgements: [...state.acknowledgements, ...acknowledgements],
    });

    return {
      acknowledgements,
      acceptedCount: acknowledgements.filter((acknowledgement) => acknowledgement.status === 'accepted').length,
      pendingAnalysis: newEvents.length > 0,
      studentModelVersion: state.studentModel.version,
      currentLesson: state.currentLesson,
      recommendations: state.recommendations,
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

function now(): string {
  return new Date().toISOString();
}
