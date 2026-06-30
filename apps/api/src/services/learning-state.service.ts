import {
  createRecommendationFromModel,
  generateLessonFromPlan,
  summarizeResults,
  type ExerciseResult,
  type GeneratedLesson,
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

    if (state.currentLesson && isLessonSuitableForContext(state.currentLesson, context)) {
      return state.currentLesson;
    }

    const createdAt = now();
    const completedLessonIds = new Set(state.exerciseResults.map((result) => result.lessonId));
    const selectedLesson =
      context.lessonTemplateKey
        ? generateLessonFromPlan(aiTeacherService.planLesson(state.studentModel, context, createdAt), createdAt)
        : context.mode === 'listening'
        ? (await privateLessonRepository.findNextForMode(context.mode, completedLessonIds)) ??
          generateLessonFromPlan(aiTeacherService.planLesson(state.studentModel, context, createdAt), createdAt)
        : (await privateLessonRepository.findNextForStudent(state.studentModel, completedLessonIds)) ??
          generateLessonFromPlan(aiTeacherService.planLesson(state.studentModel, context, createdAt), createdAt);
    const lesson = context.mode === 'listening' ? ensureLongListeningLesson(selectedLesson) : selectedLesson;

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

function isLessonSuitableForContext(lesson: GeneratedLesson, context: LearningContext): boolean {
  if (context.lessonTemplateKey && lesson.lessonTemplateKey !== context.lessonTemplateKey) {
    return false;
  }

  if (context.selectedConcept && lesson.concept !== context.selectedConcept) {
    return false;
  }

  if (context.mode !== 'listening') {
    return true;
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

function ensureLongListeningLesson(lesson: GeneratedLesson): GeneratedLesson {
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
