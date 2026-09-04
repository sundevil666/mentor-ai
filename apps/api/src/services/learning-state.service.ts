import {
  type ApplicationTelemetryEvent,
  createRecommendationFromModel,
  generateLessonFromPlan,
  summarizeResults,
  type ExerciseResult,
  type GeneratedLesson,
  type LearningSessionHandoff,
  type ContentProgress,
  type ContentEngagementEvent,
  type LearningContext,
  type LearningEvent,
  type LearningActivityEvent,
  type LearningActivityTotals,
  type PersonalReadingBookArchive,
  type ReaderVocabularyItem,
  type ReadingTranscriptChunk,
  type SpeechResult,
  type StatisticsSnapshot,
  type SyncStatus,
  type StudentModel,
  type SynchronizationAcknowledgement,
  type TeacherMemory,
} from '@mentor-ai/shared';
import { config } from '../config/env.js';
import { learningStateRepository } from '../repositories/learning-state.repository.js';
import { privateLessonRepository } from '../repositories/private-lesson.repository.js';
import type { AuthenticatedUser } from './auth.service.js';
import { aiTeacherService } from './ai-teacher.service.js';

export const learningStateService = {
  async getStudentState(user?: AuthenticatedUser) {
    const state = await learningStateRepository.read(user);

    return {
      student: state.student,
      studentModel: state.studentModel,
      recommendation: state.recommendations.at(-1) ?? createRecommendationFromModel(state.studentModel, now()),
    };
  },

  async getCurrentLesson(
    context: LearningContext = defaultLearningContext(),
    user?: AuthenticatedUser,
    forceRefresh = false,
  ) {
    const state = await learningStateRepository.read(user);

    if (!forceRefresh && state.currentLesson && isLessonSuitableForContext(state.currentLesson, context)) {
      return state.currentLesson;
    }

    const createdAt = now();
    const completedLessonIds = new Set(state.exerciseResults.map((result) => result.lessonId));
    const selectedLesson =
      context.lessonTemplateKey
        ? generateLessonFromPlan(aiTeacherService.planLesson(state.studentModel, context, createdAt), createdAt)
        : context.mode === 'listening' || context.mode === 'speaking'
        ? (await privateLessonRepository.findNextForMode(context.mode, completedLessonIds)) ??
          generateLessonFromPlan(aiTeacherService.planLesson(state.studentModel, context, createdAt), createdAt)
        : (await privateLessonRepository.findNextForStudent(state.studentModel, completedLessonIds)) ??
          generateLessonFromPlan(aiTeacherService.planLesson(state.studentModel, context, createdAt), createdAt);
    const lesson = context.mode === 'listening' ? ensureLongListeningLesson(selectedLesson) : selectedLesson;

    await learningStateRepository.write({
      ...state,
      currentLesson: lesson,
    }, user);

    return lesson;
  },

  async getRecommendations(user?: AuthenticatedUser) {
    const state = await learningStateRepository.read(user);
    return state.recommendations;
  },

  async listSessionHandoffs(user?: AuthenticatedUser) {
    const state = await learningStateRepository.read(user);
    return state.sessionHandoffs.filter((handoff) => handoff.studentId === state.student.id);
  },

  async listContentProgress(user?: AuthenticatedUser) {
    const state = await learningStateRepository.read(user);
    return state.contentProgress.filter((progress) => progress.studentId === state.student.id);
  },

  async mergeContentProgress(incoming: ContentProgress[], user?: AuthenticatedUser) {
    const state = await learningStateRepository.read(user);
    const merged = new Map(state.contentProgress.map((progress) => [progress.id, progress]));

    for (const candidate of incoming) {
      if (candidate.studentId !== state.student.id || !candidate.contentId || !Number.isFinite(candidate.position)) continue;
      const safe = sanitizeContentProgress(candidate);
      const current = merged.get(safe.id);
      merged.set(safe.id, current ? mergeProgress(current, safe) : safe);
    }

    const contentProgress = [...merged.values()];
    await learningStateRepository.write({ ...state, contentProgress }, user);
    return contentProgress;
  },

  async mergeContentEngagementEvents(incoming: ContentEngagementEvent[], user?: AuthenticatedUser) {
    const state = await learningStateRepository.read(user);
    const merged = new Map(state.contentEngagementEvents.map((event) => [event.id, event]));

    for (const candidate of incoming) {
      const safe = sanitizeContentEngagementEvent(candidate, state.student.id);
      if (safe && !merged.has(safe.id)) merged.set(safe.id, safe);
    }

    const contentEngagementEvents = [...merged.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    await learningStateRepository.write({ ...state, contentEngagementEvents }, user);
    return contentEngagementEvents.filter((event) => event.studentId === state.student.id);
  },

  async mergeLearningActivityEvents(incoming: LearningActivityEvent[], user?: AuthenticatedUser) {
    const state = await learningStateRepository.read(user);
    const merged = new Map(state.learningActivityEvents.map((event) => [event.id, event]));
    const learningActivityTotals = { ...state.learningActivityTotals };
    const acknowledgedIds: string[] = [];
    for (const candidate of incoming) {
      const safe = sanitizeLearningActivityEvent(candidate, state.student.id);
      if (!safe) continue;
      acknowledgedIds.push(safe.id);
      if (!merged.has(safe.id)) {
        merged.set(safe.id, safe);
        learningActivityTotals[`${safe.kind}Seconds`] += safe.activeSeconds;
        learningActivityTotals.totalSeconds += safe.activeSeconds;
        if (!learningActivityTotals.updatedAt || safe.endedAt > learningActivityTotals.updatedAt) learningActivityTotals.updatedAt = safe.endedAt;
      }
    }
    const learningActivityEvents = [...merged.values()]
      .sort((left, right) => left.endedAt.localeCompare(right.endedAt))
      .slice(-50_000);
    await learningStateRepository.write({ ...state, learningActivityEvents, learningActivityTotals }, user);
    return { acknowledgedIds, totals: summarizeLearningActivity(learningActivityTotals, state.contentProgress, state.statisticsSnapshots) };
  },

  async mergeApplicationTelemetryEvents(incoming: ApplicationTelemetryEvent[], user?: AuthenticatedUser) {
    const state = await learningStateRepository.read(user);
    const merged = new Map(state.applicationTelemetryEvents.map((event) => [event.id, event]));
    for (const candidate of incoming) {
      const safe = sanitizeApplicationTelemetryEvent(candidate, state.student.id);
      if (safe && !merged.has(safe.id)) merged.set(safe.id, safe);
    }
    const applicationTelemetryEvents = [...merged.values()]
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
      .slice(-10_000);
    await learningStateRepository.write({ ...state, applicationTelemetryEvents }, user);
    return applicationTelemetryEvents;
  },

  async mergeReaderVocabularyItems(incoming: ReaderVocabularyItem[], user?: AuthenticatedUser) {
    const state = await learningStateRepository.read(user);
    const merged = new Map(state.readerVocabularyItems.map((item) => [item.id, item]));
    for (const candidate of incoming) {
      const safe = sanitizeReaderVocabularyItem(candidate, state.student.id);
      if (!safe) continue;
      const current = merged.get(safe.id);
      if (!current || safe.lookupCount > current.lookupCount || safe.lastLookedUpAt > current.lastLookedUpAt) merged.set(safe.id, safe);
    }
    const readerVocabularyItems = [...merged.values()].sort((left, right) => right.lastLookedUpAt.localeCompare(left.lastLookedUpAt));
    const repeatedItems = readerVocabularyItems.filter((item) => item.lookupCount >= 2).slice(0, 20);
    const vocabularySignals = repeatedItems.map((item) => ({
      id: `reader-vocabulary-weakness:${item.id}`,
      skill: 'vocabulary' as const,
      description: `Repeatedly translated while reading: “${item.text}”.`,
      evidenceIds: [item.id],
      confidence: Math.min(0.95, 0.55 + item.lookupCount * 0.05),
      observedAt: item.lastLookedUpAt,
    }));
    const reviewPriorities = repeatedItems.slice(0, 10).map((item) => ({
      id: `reader-vocabulary-review:${item.id}`,
      skill: 'vocabulary' as const,
      target: item.text,
      reason: `Looked up ${item.lookupCount} times while reading.`,
      dueAt: item.lastLookedUpAt,
    }));
    const studentModel = repeatedItems.length === 0 ? state.studentModel : {
      ...state.studentModel,
      version: state.studentModel.version + 1,
      knownWeaknesses: [
        ...state.studentModel.knownWeaknesses.filter((signal) => !signal.id.startsWith('reader-vocabulary-weakness:')),
        ...vocabularySignals,
      ],
      reviewPriorities: [
        ...state.studentModel.reviewPriorities.filter((priority) => !priority.id.startsWith('reader-vocabulary-review:')),
        ...reviewPriorities,
      ],
      updatedAt: now(),
    };
    await learningStateRepository.write({ ...state, studentModel, readerVocabularyItems }, user);
    return readerVocabularyItems.filter((item) => item.studentId === state.student.id);
  },

  async mergePersonalReadingBooks(incoming: PersonalReadingBookArchive[], user?: AuthenticatedUser) {
    const state = await learningStateRepository.read(user);
    const merged = new Map(state.personalReadingBooks.map((archive) => [archive.book.id, archive]));
    for (const candidate of incoming.slice(0, 50)) {
      const safe = sanitizePersonalReadingBook(candidate);
      if (!safe) continue;
      const current = merged.get(safe.book.id);
      if (!current || safe.book.updatedAt >= current.book.updatedAt) merged.set(safe.book.id, safe);
    }
    const personalReadingBooks = [...merged.values()]
      .sort((left, right) => right.book.updatedAt.localeCompare(left.book.updatedAt))
      .slice(0, 50);
    await learningStateRepository.write({ ...state, personalReadingBooks }, user);
    return personalReadingBooks;
  },

  async saveReadingTranscriptChunk(candidate: ReadingTranscriptChunk, user?: AuthenticatedUser) {
    const state = await learningStateRepository.read(user);
    const safe = sanitizeReadingTranscriptChunk(candidate, state.student.id);
    if (!safe) throw new Error('Invalid reading transcript.');
    const readingTranscriptChunks = [
      ...state.readingTranscriptChunks.filter((chunk) => chunk.id !== safe.id),
      safe,
    ].sort((left, right) => left.capturedAt.localeCompare(right.capturedAt)).slice(-2_000);
    await learningStateRepository.write({ ...state, readingTranscriptChunks }, user);
    return safe;
  },

  async upsertSessionHandoff(handoff: LearningSessionHandoff, user?: AuthenticatedUser) {
    const state = await learningStateRepository.read(user);

    if (handoff.studentId !== state.student.id) {
      throw new Error('Session handoff failed identity validation.');
    }

    const safeHandoff = sanitizeSessionHandoff(handoff);
    const previous = state.sessionHandoffs.find((item) => item.id === safeHandoff.id);
    const resolvedHandoff = previous && previous.lesson.id === safeHandoff.lesson.id
      ? mergeSessionHandoff(previous, safeHandoff)
      : safeHandoff;
    const sessionHandoffs = [
      ...state.sessionHandoffs.filter((item) => item.id !== resolvedHandoff.id),
      resolvedHandoff,
    ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    await learningStateRepository.write({
      ...state,
      sessionHandoffs,
    }, user);

    return resolvedHandoff;
  },

  async synchronize(
    events: LearningEvent[],
    exerciseResults: ExerciseResult[] = [],
    speechResults: SpeechResult[] = [],
    user?: AuthenticatedUser,
  ) {
    const state = await learningStateRepository.read(user);
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
    }, user);

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

  async getConfiguration() {
    const lessonLibrary = await privateLessonRepository.getLibraryMetadata();

    return {
      storageMode: config.storageMode,
      supportedLanguages: ['en'],
      synchronizationProtocolVersion: 1,
      lessonSchemaVersion: 1,
      lessonLibrary,
      speech: {
        advancedPronunciationScoring: false,
      },
    };
  },
};

function sanitizeLearningActivityEvent(candidate: LearningActivityEvent, studentId: string): LearningActivityEvent | null {
  if (!candidate || candidate.studentId !== studentId || typeof candidate.id !== 'string'
    || !['listening', 'reading', 'speaking'].includes(candidate.kind)
    || typeof candidate.contentId !== 'string' || candidate.contentId.length === 0
    || !Number.isFinite(candidate.activeSeconds) || candidate.activeSeconds < 1 || candidate.activeSeconds > 60
    || Number.isNaN(Date.parse(candidate.startedAt)) || Number.isNaN(Date.parse(candidate.endedAt))
    || typeof candidate.sourceDeviceId !== 'string') return null;
  return { ...candidate, activeSeconds: Math.round(candidate.activeSeconds) };
}

function summarizeLearningActivity(
  activityTotals: LearningActivityTotals,
  progress: ContentProgress[],
  statisticsSnapshots: StatisticsSnapshot[],
): LearningActivityTotals {
  const totals = { ...activityTotals };

  // Existing synchronized resume progress provides a conservative one-time
  // baseline for activity completed before active-time tracking was released.
  const listeningBaseline = progress.filter((item) => item.category === 'audio')
    .reduce((sum, item) => sum + Math.max(0, item.furthestPosition), 0);
  const readingWords = progress.filter((item) => item.category === 'reading')
    .reduce((sum, item) => sum + Math.max(0, item.furthestPosition), 0);
  const lessonListeningBaseline = statisticsSnapshots.reduce((sum, snapshot) => sum + Math.max(0, snapshot.listeningSeconds ?? 0), 0);
  const lessonSpeakingBaseline = statisticsSnapshots.filter((snapshot) => snapshot.learningMode === 'speaking')
    .reduce((sum, snapshot) => sum + Math.max(0, snapshot.activeSeconds ?? 0), 0);
  totals.listeningSeconds = Math.max(totals.listeningSeconds, Math.round(listeningBaseline + lessonListeningBaseline));
  totals.readingSeconds = Math.max(totals.readingSeconds, Math.round(readingWords / 200 * 60));
  totals.speakingSeconds = Math.max(totals.speakingSeconds, Math.round(lessonSpeakingBaseline));
  totals.totalSeconds = totals.listeningSeconds + totals.readingSeconds + totals.speakingSeconds;
  return totals;
}

function isLessonSuitableForContext(lesson: GeneratedLesson, context: LearningContext): boolean {
  if (context.lessonTemplateKey && lesson.lessonTemplateKey !== context.lessonTemplateKey) {
    return false;
  }

  if (context.selectedConcept && lesson.concept !== context.selectedConcept) {
    return false;
  }

  if (context.mode === 'speaking') {
    return isSpeakingLesson(lesson);
  }

  if (context.mode !== 'listening') {
    return lesson.lessonTemplateKey === undefined || lesson.lessonTemplateKey !== 'commute-listening';
  }

  const firstExercise = lesson.exercises[0];

  return (
    lesson.targetSkills.includes('listening') &&
    Boolean(
      firstExercise &&
        (firstExercise.type === 'listening-text' ||
          (firstExercise.targetSkill === 'listening' &&
            typeof firstExercise.audioText === 'string' &&
            firstExercise.audioText.trim().length > 0)),
    )
  );
}

function isSpeakingLesson(lesson: GeneratedLesson): boolean {
  const firstExercise = lesson.exercises[0];
  const secondExercise = lesson.exercises[1];

  return (
    !isListeningLesson(lesson) &&
    (firstExercise?.type === 'repeat-speaking' ||
      (firstExercise?.type === 'review' && secondExercise?.type === 'repeat-speaking') ||
      /\bspeaking\b/i.test(`${lesson.id} ${lesson.title} ${lesson.activityType}`))
  );
}

function isListeningLesson(lesson: GeneratedLesson): boolean {
  return lesson.exercises.some(
    (exercise) =>
      exercise.type === 'listening-text' ||
      (exercise.targetSkill === 'listening' && typeof exercise.audioText === 'string' && exercise.audioText.trim().length > 0),
  );
}

function ensureLongListeningLesson(lesson: GeneratedLesson): GeneratedLesson {
  if (lesson.lessonTemplateKey && lesson.lessonTemplateKey !== 'commute-listening') {
    return lesson;
  }

  const firstExercise = lesson.exercises[0];

  if (!firstExercise || firstExercise.targetSkill !== 'listening') {
    return lesson;
  }

  const audioText = firstExercise.audioText ?? '';

  if (countWords(audioText) >= 1100) {
    return lesson;
  }

  const longListeningText = createTenMinuteListeningText();

  return {
    ...lesson,
    estimatedMinutes: Math.max(lesson.estimatedMinutes, 10),
    purpose: lesson.purpose || 'Listen to a longer practical text while reading along.',
    exercises: [
      {
        ...firstExercise,
        type: 'listening-text',
        prompt: 'Listen and read',
        microLesson: 'Follow the highlighted words while you listen. Use word and sentence controls to repeat unclear parts.',
        successTip: 'Continue when you have listened and followed the full text.',
        expectedResponse: 'listened',
        options: undefined,
        audioText: longListeningText,
      },
      ...lesson.exercises.slice(1),
    ],
  };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function createTenMinuteListeningText(): string {
  const baseSentences = [
    'This morning I am going to work, and I want to use my travel time for English.',
    'I leave home with my bag, my phone, and my headphones.',
    'The street is quiet, but the bus stop is already a little busy.',
    'I check the time and I see that I have ten minutes before the bus arrives.',
    'I decide to listen to a simple English story and read the text at the same time.',
    'When I hear a new word, I do not stop immediately.',
    'First, I listen to the whole sentence and try to understand the main idea.',
    'Then I replay the sentence and look at the word again.',
    'This helps me connect the sound, the spelling, and the meaning.',
    'On the bus, I sit near the window and lower the volume a little.',
    'I can hear the voice clearly, but I can also hear the world around me.',
    'The speaker talks about a normal day, simple plans, and small choices.',
    'I hear phrases like I will take the bus, I need a coffee, and I will start work soon.',
    'These phrases are useful because I can say them in my own life.',
    'I repeat some words quietly in my head, but I do not need to speak loudly.',
    'The goal is not to understand every word perfectly.',
    'The goal is to stay with the text, catch the rhythm, and understand more each time.',
    'After two minutes, the story feels easier.',
    'I notice the same words again and again: morning, bus, work, listen, today, and later.',
    'Repeated words become friendly because my ears meet them many times.',
    'When the bus turns onto the main road, I move to the next paragraph.',
    'The text talks about a person planning a small English routine.',
    'The person listens for ten minutes in the morning and reads for five minutes in the evening.',
    'This routine is small, but it is easy to repeat.',
    'A small routine every day is stronger than a hard lesson once a month.',
    'I like this idea because I am often tired after work.',
    'If I only have a little energy, I can still listen and read.',
    'If I have more energy, I can repeat sentences and answer questions.',
    'The voice says that progress can feel slow, but listening grows quietly.',
    'One day a phrase is difficult, and later the same phrase feels normal.',
    'I look at the highlighted words and follow them with my eyes.',
    'When the highlight moves, I know exactly where the voice is.',
    'If I lose my place, I go back one sentence and listen again.',
    'If one word is unclear, I go back one word and hear it again.',
    'This makes listening active, but still calm.',
    'Near the end of the ride, I understand the story better than at the beginning.',
    'I can remember the main idea: use small moments, listen often, and read while listening.',
    'I do not need perfect grammar in my head while I listen.',
    'I need attention, patience, and a simple text that I can finish.',
    'When I arrive at work, I stop the audio and save my progress.',
    'Later, I can return to the same text and it will feel easier.',
    'The same listening text can teach me new sounds on the first day and confidence on the second day.',
    'Every replay is useful evidence because it shows what my ears are training.',
    'Today I listened, read, and stayed with English for ten minutes.',
    'That is real practice, and it counts.',
  ];

  return Array.from({ length: 4 }, (_, index) => {
    const round = index + 1;
    return `Part ${round}. ${baseSentences.join(' ')}`;
  }).join('\n\n');
}

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

function sanitizeContentEngagementEvent(
  event: ContentEngagementEvent,
  studentId: string,
): ContentEngagementEvent | undefined {
  const allowedTypes = new Set(['started', 'finished', 'full-play', 'feedback-selected']);
  const allowedCategories = new Set(['lesson', 'video', 'audio', 'reading', 'vocabulary']);
  const allowedFeedback = new Set([
    'clear',
    'mostly-clear',
    'needs-explanation',
    'too-difficult',
    'enjoy-listening',
    'enjoy-format',
    'not-my-format',
  ]);
  if (
    event.studentId !== studentId ||
    !event.id ||
    !event.contentId ||
    !event.sourceDeviceId ||
    !allowedCategories.has(event.category) ||
    !allowedTypes.has(event.type) ||
    !Number.isFinite(Date.parse(event.createdAt)) ||
    (event.type === 'feedback-selected' && (!event.feedback || !allowedFeedback.has(event.feedback)))
  ) return undefined;

  return {
    id: event.id.slice(0, 160),
    studentId,
    category: event.category,
    contentId: event.contentId.slice(0, 160),
    type: event.type,
    feedback: event.type === 'feedback-selected' ? event.feedback : undefined,
    sourceDeviceId: event.sourceDeviceId.slice(0, 160),
    createdAt: event.createdAt,
  };
}

function sanitizeApplicationTelemetryEvent(
  event: ApplicationTelemetryEvent,
  studentId: string,
): ApplicationTelemetryEvent | undefined {
  const allowedTypes = new Set(['app-opened', 'route-viewed', 'online', 'offline', 'runtime-error', 'unhandled-rejection']);
  const allowedSeverities = new Set(['info', 'warning', 'error', 'critical']);
  if (
    event.studentId !== studentId ||
    !event.id ||
    !event.sessionId ||
    !event.sourceDeviceId ||
    !event.appVersion ||
    !allowedTypes.has(event.type) ||
    !allowedSeverities.has(event.severity) ||
    !Number.isFinite(Date.parse(event.occurredAt))
  ) return undefined;

  return {
    id: event.id.slice(0, 160),
    studentId,
    sessionId: event.sessionId.slice(0, 160),
    sourceDeviceId: event.sourceDeviceId.slice(0, 160),
    type: event.type,
    severity: event.severity,
    route: event.route?.slice(0, 160),
    errorCode: event.errorCode?.slice(0, 160),
    appVersion: event.appVersion.slice(0, 80),
    occurredAt: event.occurredAt,
  };
}

function sanitizeContentProgress(progress: ContentProgress): ContentProgress {
  const duration = progress.duration && Number.isFinite(progress.duration) ? Math.max(0, progress.duration) : undefined;
  const position = Math.max(0, duration ? Math.min(progress.position, duration) : progress.position);
  return {
    ...progress,
    id: `${progress.category}:${progress.contentId}`,
    position,
    furthestPosition: Math.max(position, progress.furthestPosition || 0),
    duration,
    completed: Boolean(progress.completed),
  };
}

function sanitizeReaderVocabularyItem(item: ReaderVocabularyItem, studentId: string): ReaderVocabularyItem | undefined {
  const text = typeof item.text === 'string' ? item.text.replace(/\s+/g, ' ').trim().slice(0, 500) : '';
  const translation = typeof item.translation === 'string' ? item.translation.replace(/\s+/g, ' ').trim().slice(0, 1_000) : '';
  if (
    item.studentId !== studentId ||
    !item.id ||
    !item.bookId ||
    !text ||
    !translation ||
    !Number.isFinite(Date.parse(item.firstLookedUpAt)) ||
    !Number.isFinite(Date.parse(item.lastLookedUpAt))
  ) return undefined;
  return {
    id: item.id.slice(0, 700),
    studentId,
    bookId: item.bookId.slice(0, 160),
    chapterId: item.chapterId?.slice(0, 160),
    text,
    normalizedText: text.toLocaleLowerCase('en'),
    kind: /\s/.test(text) ? 'phrase' : 'word',
    translation,
    phonetic: item.phonetic?.replace(/\s+/g, ' ').trim().slice(0, 160) || undefined,
    lookupCount: Math.max(1, Math.min(10_000, Math.floor(item.lookupCount || 1))),
    firstLookedUpAt: item.firstLookedUpAt,
    lastLookedUpAt: item.lastLookedUpAt,
  };
}

function sanitizeReadingTranscriptChunk(item: ReadingTranscriptChunk, studentId: string): ReadingTranscriptChunk | undefined {
  const text = typeof item.text === 'string' ? item.text.replace(/\s+/g, ' ').trim().slice(0, 2_000) : '';
  if (
    item.studentId !== studentId ||
    !item.id ||
    !item.bookId ||
    !text ||
    !Number.isInteger(item.pageIndex) ||
    item.pageIndex < 0 ||
    !Number.isFinite(Date.parse(item.capturedAt)) ||
    (item.recognitionEngine !== 'device-whisper' && item.recognitionEngine !== 'cloud-whisper' && item.recognitionEngine !== 'browser')
  ) return undefined;
  return {
    id: item.id.slice(0, 180),
    studentId,
    bookId: item.bookId.slice(0, 160),
    pageIndex: item.pageIndex,
    text,
    capturedAt: item.capturedAt,
    recognitionEngine: item.recognitionEngine,
  };
}

function sanitizePersonalReadingBook(archive: PersonalReadingBookArchive): PersonalReadingBookArchive | undefined {
  if (!archive?.book?.id || !archive.source?.id || !Array.isArray(archive.chapters) || !Array.isArray(archive.pages)) return undefined;
  const book = archive.book;
  if (
    (book.format !== 'epub' && book.format !== 'txt') ||
    book.rightsConfirmed !== true ||
    book.language !== 'en' ||
    !Number.isFinite(Date.parse(book.importedAt)) ||
    !Number.isFinite(Date.parse(book.updatedAt)) ||
    archive.pages.length > 10_000 ||
    archive.chapters.length > 10_000
  ) return undefined;
  const pages = archive.pages.filter((page) => page.bookId === book.id && typeof page.text === 'string');
  const chapters = archive.chapters.filter((chapter) => chapter.bookId === book.id);
  const textSize = pages.reduce((sum, page) => sum + page.text.length, 0);
  if (pages.length !== archive.pages.length || chapters.length !== archive.chapters.length || textSize > 30 * 1024 * 1024) return undefined;
  return JSON.parse(JSON.stringify({ source: archive.source, book, chapters, pages })) as PersonalReadingBookArchive;
}

export function mergeProgress(current: ContentProgress, incoming: ContentProgress): ContentProgress {
  const furthestPosition = Math.max(current.furthestPosition, incoming.furthestPosition);
  const winner = incoming.furthestPosition > current.furthestPosition
    ? incoming
    : incoming.furthestPosition < current.furthestPosition
      ? current
      : incoming.updatedAt >= current.updatedAt ? incoming : current;
  return {
    ...winner,
    position: furthestPosition,
    furthestPosition,
    duration: Math.max(current.duration ?? 0, incoming.duration ?? 0) || undefined,
    completed: current.completed || incoming.completed,
    updatedAt: current.updatedAt >= incoming.updatedAt ? current.updatedAt : incoming.updatedAt,
  };
}

function mergeSessionHandoff(current: LearningSessionHandoff, incoming: LearningSessionHandoff): LearningSessionHandoff {
  if (incoming.currentExerciseIndex > current.currentExerciseIndex) return incoming;
  if (incoming.currentExerciseIndex < current.currentExerciseIndex) return current;
  if (incoming.results.length > current.results.length) return incoming;
  if (incoming.results.length < current.results.length) return current;
  return incoming.updatedAt >= current.updatedAt ? incoming : current;
}
