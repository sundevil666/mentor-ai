export type StorageMode = 'demo' | 'personal';

export type EnglishLevel = 'beginner' | 'intermediate' | 'advanced';

export type SkillArea = 'vocabulary' | 'grammar' | 'listening' | 'speaking' | 'review';

export type LearningMode = 'bus' | 'walking' | 'home' | 'listening' | 'speaking' | 'review' | 'recovery';

export type ExerciseType =
  | 'vocabulary-recall'
  | 'word-order'
  | 'listening-comprehension'
  | 'repeat-speaking'
  | 'review';

export type LearningEventType =
  | 'lesson-started'
  | 'lesson-finished'
  | 'exercise-started'
  | 'exercise-finished'
  | 'audio-replayed'
  | 'speech-attempted'
  | 'manual-feedback'
  | 'synchronization';

export type CompletionState = 'completed' | 'skipped' | 'abandoned';

export type SyncStatus = 'pending' | 'accepted' | 'rejected';

export interface UserProfile {
  id: string;
  displayName: string;
  level: EnglishLevel;
}

export interface Student {
  id: string;
  displayName: string;
  targetLanguage: 'en';
  level: EnglishLevel;
  preferences: StudentPreferences;
}

export interface StudentPreferences {
  preferredLearningMode: LearningMode;
  speechEnabled: boolean;
  targetLessonMinutes: number;
}

export interface StudentModel {
  id: string;
  studentId: string;
  version: number;
  level: EnglishLevel;
  vocabulary: SkillState;
  grammar: SkillState;
  listening: SkillState;
  speaking: SkillState;
  knownWeaknesses: LearningSignal[];
  knownStrengths: LearningSignal[];
  reviewPriorities: ReviewPriority[];
  activeLearningGoals: LearningGoal[];
  confidence: SignalScore;
  fatigue: SignalScore;
  updatedAt: string;
}

export interface SkillState {
  score: SignalScore;
  confidence: SignalScore;
  evidenceCount: number;
  lastPracticedAt?: string;
}

export interface SignalScore {
  value: number;
  confidence: number;
}

export interface LearningSignal {
  id: string;
  skill: SkillArea;
  description: string;
  evidenceIds: string[];
  confidence: number;
  observedAt: string;
}

export interface ReviewPriority {
  id: string;
  skill: SkillArea;
  target: string;
  reason: string;
  dueAt: string;
}

export interface LearningGoal {
  id: string;
  skill: SkillArea;
  purpose: string;
  createdAt: string;
}

export interface LearningContext {
  mode: LearningMode;
  isOffline: boolean;
  speechAvailable: boolean;
  availableMinutes: number;
}

export interface LessonPlan {
  id: string;
  studentModelVersion: number;
  goal: LearningGoal;
  teachingIntent: string;
  targetSkills: SkillArea[];
  learningMode: LearningMode;
  difficulty: 'supportive' | 'steady' | 'challenge';
  reviewPriorityIds: string[];
  createdAt: string;
}

export interface GeneratedLesson {
  id: string;
  planId: string;
  studentModelVersion: number;
  title: string;
  purpose: string;
  targetSkills: SkillArea[];
  estimatedMinutes: number;
  exercises: Exercise[];
  localEvaluation: LocalEvaluationRule[];
  recovery: LessonRecovery;
  createdAt: string;
}

export interface LessonSummary {
  id: string;
  title: string;
  level: EnglishLevel;
  estimatedMinutes: number;
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  prompt: string;
  targetSkill: SkillArea;
  expectedResponse?: string;
  options?: string[];
  audioText?: string;
}

export interface LocalEvaluationRule {
  exerciseId: string;
  acceptedResponses: string[];
}

export interface LessonRecovery {
  fallbackMode: LearningMode;
  message: string;
}

export interface LearningEvent {
  id: string;
  studentId: string;
  sessionId: string;
  lessonId?: string;
  exerciseId?: string;
  type: LearningEventType;
  occurredAt: string;
  data?: Record<string, string | number | boolean>;
}

export interface ExerciseResult {
  id: string;
  studentId: string;
  sessionId: string;
  lessonId: string;
  exerciseId: string;
  exerciseType: ExerciseType;
  targetSkill: SkillArea;
  response?: string;
  correct: boolean;
  attempts: number;
  responseTimeMs: number;
  completionState: CompletionState;
  evidenceEventIds: string[];
  completedAt: string;
}

export interface SpeechResult {
  id: string;
  studentId: string;
  sessionId: string;
  exerciseId: string;
  speechAvailable: boolean;
  speechDetected: boolean;
  responseStartDelayMs?: number;
  completedAt: string;
}

export interface StatisticsSnapshot {
  id: string;
  studentId: string;
  sessionId: string;
  lessonId: string;
  accuracy: number;
  averageResponseTimeMs: number;
  attempts: number;
  completedExercises: number;
  audioReplays: number;
  speechAttempts: number;
  fatigueSignal: SignalScore;
  createdAt: string;
}

export interface StatisticSummary {
  userId: string;
  lessonsCompleted: number;
  minutesPracticed: number;
  currentStreakDays: number;
}

export interface Observation {
  id: string;
  studentId: string;
  description: string;
  skill: SkillArea;
  evidenceIds: string[];
  confidence: number;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  studentId: string;
  summary: string;
  reason: string;
  lessonPlanId?: string;
  createdAt: string;
}

export interface TeacherJournalEntry {
  id: string;
  studentId: string;
  summary: string;
  evidenceIds: string[];
  lessonPlanId?: string;
  createdAt: string;
}

export interface TeacherMemory {
  id: string;
  studentId: string;
  version: number;
  fact: string;
  evidenceIds: string[];
  confidence: number;
  updatedAt: string;
}

export interface SynchronizationState {
  id: string;
  studentId: string;
  protocolVersion: number;
  pendingEventIds: string[];
  lastAcknowledgedAt?: string;
}

export interface SynchronizationAcknowledgement {
  eventId: string;
  status: SyncStatus;
  reason?: string;
}

export interface ApiResponse<T> {
  data: T;
}

export const demoStudent: Student = {
  id: 'demo-student',
  displayName: 'Student',
  targetLanguage: 'en',
  level: 'beginner',
  preferences: {
    preferredLearningMode: 'home',
    speechEnabled: true,
    targetLessonMinutes: 6,
  },
};

export const initialStudentModel: StudentModel = {
  id: 'demo-student-model',
  studentId: demoStudent.id,
  version: 1,
  level: 'beginner',
  vocabulary: createSkillState(0.35),
  grammar: createSkillState(0.3),
  listening: createSkillState(0.3),
  speaking: createSkillState(0.25),
  knownWeaknesses: [],
  knownStrengths: [],
  reviewPriorities: [
    {
      id: 'review-greetings',
      skill: 'vocabulary',
      target: 'basic greetings',
      reason: 'Initial review material keeps the first lesson supportive.',
      dueAt: '2026-06-28T00:00:00.000Z',
    },
  ],
  activeLearningGoals: [
    {
      id: 'goal-basic-greetings',
      skill: 'vocabulary',
      purpose: 'Recall and use basic English greetings with confidence.',
      createdAt: '2026-06-28T00:00:00.000Z',
    },
  ],
  confidence: { value: 0.35, confidence: 0.3 },
  fatigue: { value: 0, confidence: 0 },
  updatedAt: '2026-06-28T00:00:00.000Z',
};

export function clampSignal(value: number): SignalScore {
  return {
    value: clamp(value),
    confidence: value === 0 ? 0 : 1,
  };
}

export function createEvidenceId(event: Pick<LearningEvent, 'studentId' | 'sessionId' | 'id'>): string {
  return `${event.studentId}:${event.sessionId}:${event.id}`;
}

export function isLessonDeliverable(lesson: GeneratedLesson): boolean {
  return (
    lesson.purpose.trim().length > 0 &&
    lesson.targetSkills.length > 0 &&
    lesson.estimatedMinutes > 0 &&
    lesson.exercises.length > 0 &&
    lesson.exercises.every((exercise) => exercise.prompt.trim().length > 0)
  );
}

export function scoreExercise(exercise: Exercise, response: string): boolean {
  const expected = exercise.expectedResponse?.trim().toLowerCase();

  if (!expected) {
    return response.trim().length > 0;
  }

  return response.trim().toLowerCase() === expected;
}

export function summarizeResults(results: ExerciseResult[]): Pick<
  StatisticsSnapshot,
  'accuracy' | 'averageResponseTimeMs' | 'attempts' | 'completedExercises' | 'fatigueSignal'
> {
  const completed = results.filter((result) => result.completionState === 'completed');
  const correct = completed.filter((result) => result.correct).length;
  const totalResponseTime = completed.reduce((sum, result) => sum + result.responseTimeMs, 0);
  const attempts = completed.reduce((sum, result) => sum + result.attempts, 0);
  const slowResponses = completed.filter((result) => result.responseTimeMs > 12000).length;

  return {
    accuracy: completed.length === 0 ? 0 : correct / completed.length,
    averageResponseTimeMs: completed.length === 0 ? 0 : Math.round(totalResponseTime / completed.length),
    attempts,
    completedExercises: completed.length,
    fatigueSignal: {
      value: completed.length === 0 ? 0 : slowResponses / completed.length,
      confidence: completed.length < 3 ? 0.3 : 0.7,
    },
  };
}

export function nextModelVersion(model: Pick<StudentModel, 'version'>): number {
  return model.version + 1;
}

export function createLessonPlan(model: StudentModel, context: LearningContext, createdAt: string): LessonPlan {
  const weakestSkill = getWeakestSkill(model);
  const reviewPriority = model.reviewPriorities.find((priority) => priority.skill === weakestSkill);
  const goal = model.activeLearningGoals.find((activeGoal) => activeGoal.skill === weakestSkill) ?? {
    id: `goal-${weakestSkill}-${model.version}`,
    skill: weakestSkill,
    purpose: createGoalPurpose(weakestSkill),
    createdAt,
  };

  return {
    id: `plan-${model.studentId}-${model.version}-${weakestSkill}`,
    studentModelVersion: model.version,
    goal,
    teachingIntent: createTeachingIntent(weakestSkill, context),
    targetSkills: Array.from(new Set([weakestSkill, 'review'])),
    learningMode: context.mode,
    difficulty: chooseDifficulty(model, context),
    reviewPriorityIds: reviewPriority ? [reviewPriority.id] : [],
    createdAt,
  };
}

export function generateLessonFromPlan(plan: LessonPlan, createdAt: string): GeneratedLesson {
  const reviewTarget = plan.goal.skill === 'grammar' ? 'Where are you?' : 'Good afternoon';

  const exercises: Exercise[] = [
    {
      id: `${plan.id}-warmup`,
      type: 'review',
      prompt: `Review: say or type "${reviewTarget}".`,
      targetSkill: 'review',
      expectedResponse: reviewTarget.toLowerCase().replace('?', ''),
    },
    {
      id: `${plan.id}-vocabulary`,
      type: 'vocabulary-recall',
      prompt: 'Translate: dobrý deň',
      targetSkill: 'vocabulary',
      expectedResponse: 'good afternoon',
    },
    {
      id: `${plan.id}-word-order`,
      type: 'word-order',
      prompt: 'Order the words: you / are / where',
      targetSkill: 'grammar',
      expectedResponse: 'where are you',
    },
    {
      id: `${plan.id}-listening`,
      type: 'listening-comprehension',
      prompt: 'Listen and choose the meaning.',
      targetSkill: 'listening',
      expectedResponse: 'where are you',
      options: ['where are you', 'how old are you', 'what is this'],
      audioText: 'Where are you?',
    },
    {
      id: `${plan.id}-speaking`,
      type: 'repeat-speaking',
      prompt: 'Repeat: Where are you?',
      targetSkill: 'speaking',
      expectedResponse: 'where are you',
      audioText: 'Where are you?',
    },
  ];

  return {
    id: `lesson-${plan.id}`,
    planId: plan.id,
    studentModelVersion: plan.studentModelVersion,
    title: createLessonTitle(plan.goal.skill),
    purpose: plan.goal.purpose,
    targetSkills: plan.targetSkills,
    estimatedMinutes: plan.learningMode === 'bus' ? 4 : 6,
    exercises,
    localEvaluation: exercises
      .filter((exercise) => exercise.expectedResponse)
      .map((exercise) => ({
        exerciseId: exercise.id,
        acceptedResponses: [exercise.expectedResponse as string],
      })),
    recovery: {
      fallbackMode: 'review',
      message: 'Return to a shorter review if the lesson becomes too demanding.',
    },
    createdAt,
  };
}

export function updateStudentModelFromResults(
  model: StudentModel,
  results: ExerciseResult[],
  updatedAt: string,
): StudentModel {
  const summary = summarizeResults(results);
  const changedSkills = getChangedSkills(results);
  const nextModel: StudentModel = {
    ...model,
    version: nextModelVersion(model),
    vocabulary: updateSkillState(model.vocabulary, results, 'vocabulary', updatedAt),
    grammar: updateSkillState(model.grammar, results, 'grammar', updatedAt),
    listening: updateSkillState(model.listening, results, 'listening', updatedAt),
    speaking: updateSkillState(model.speaking, results, 'speaking', updatedAt),
    confidence: {
      value: clamp(model.confidence.value + (summary.accuracy >= 0.8 ? 0.05 : -0.03)),
      confidence: clamp(model.confidence.confidence + 0.1),
    },
    fatigue: summary.fatigueSignal,
    updatedAt,
  };

  return {
    ...nextModel,
    knownWeaknesses: mergeLearningSignals(model.knownWeaknesses, createWeaknessSignals(nextModel, results, updatedAt)),
    knownStrengths: mergeLearningSignals(model.knownStrengths, createStrengthSignals(nextModel, results, updatedAt)),
    reviewPriorities: refreshReviewPriorities(model.reviewPriorities, changedSkills, results, updatedAt),
    activeLearningGoals: refreshLearningGoals(model.activeLearningGoals, getWeakestSkill(nextModel), updatedAt),
  };
}

export function createRecommendationFromModel(model: StudentModel, createdAt: string): Recommendation {
  const skill = getWeakestSkill(model);

  return {
    id: `recommendation-${model.studentId}-${model.version}`,
    studentId: model.studentId,
    summary: createLessonTitle(skill),
    reason: createGoalPurpose(skill),
    createdAt,
  };
}

export function createObservationFromResults(
  studentId: string,
  results: ExerciseResult[],
  createdAt: string,
): Observation | undefined {
  const completed = results.filter((result) => result.completionState === 'completed');
  const incorrect = completed.find((result) => !result.correct);

  if (!incorrect) {
    return undefined;
  }

  return {
    id: `observation-${studentId}-${incorrect.exerciseId}-${createdAt}`,
    studentId,
    description: `${labelSkill(incorrect.targetSkill)} needs review based on the latest lesson evidence.`,
    skill: incorrect.targetSkill,
    evidenceIds: incorrect.evidenceEventIds,
    confidence: completed.length < 3 ? 0.4 : 0.6,
    createdAt,
  };
}

function createSkillState(value: number): SkillState {
  return {
    score: { value, confidence: 0.3 },
    confidence: { value, confidence: 0.3 },
    evidenceCount: 0,
  };
}

function getWeakestSkill(model: StudentModel): SkillArea {
  const entries: Array<[SkillArea, SkillState]> = [
    ['vocabulary', model.vocabulary],
    ['grammar', model.grammar],
    ['listening', model.listening],
    ['speaking', model.speaking],
  ];

  return entries.reduce((weakest, current) => (current[1].score.value < weakest[1].score.value ? current : weakest))[0];
}

function chooseDifficulty(model: StudentModel, context: LearningContext): LessonPlan['difficulty'] {
  if (context.mode === 'recovery' || model.fatigue.value > 0.5) {
    return 'supportive';
  }

  if (model.confidence.value > 0.7 && getSkillState(model, getWeakestSkill(model)).score.value > 0.65) {
    return 'challenge';
  }

  return 'steady';
}

function createTeachingIntent(skill: SkillArea, context: LearningContext): string {
  return `Practice ${labelSkill(skill)} through a ${context.mode} lesson while preserving evidence for the Student Model.`;
}

function createGoalPurpose(skill: SkillArea): string {
  switch (skill) {
    case 'grammar':
      return 'Stabilize simple English question word order.';
    case 'listening':
      return 'Strengthen comprehension of short spoken English questions.';
    case 'speaking':
      return 'Build confidence repeating and producing a short English question.';
    case 'review':
      return 'Protect recent learning with a short review.';
    case 'vocabulary':
      return 'Recall and use basic English greetings with confidence.';
  }
}

function createLessonTitle(skill: SkillArea): string {
  switch (skill) {
    case 'grammar':
      return 'Question word order practice';
    case 'listening':
      return 'Short question listening';
    case 'speaking':
      return 'Speaking confidence practice';
    case 'review':
      return 'Focused review';
    case 'vocabulary':
      return 'Greeting recall practice';
  }
}

function updateSkillState(
  current: SkillState,
  results: ExerciseResult[],
  skill: SkillArea,
  updatedAt: string,
): SkillState {
  const skillResults = results.filter((result) => result.targetSkill === skill && result.completionState === 'completed');

  if (skillResults.length === 0) {
    return current;
  }

  const correct = skillResults.filter((result) => result.correct).length / skillResults.length;
  const averageResponseTime =
    skillResults.reduce((sum, result) => sum + result.responseTimeMs, 0) / skillResults.length;
  const speedAdjustment = averageResponseTime > 10000 ? -0.04 : 0.03;
  const scoreAdjustment = correct >= 0.8 ? 0.07 : -0.05;

  return {
    score: {
      value: clamp(current.score.value + scoreAdjustment + speedAdjustment),
      confidence: clamp(current.score.confidence + 0.12),
    },
    confidence: {
      value: clamp(current.confidence.value + (correct >= 0.8 ? 0.04 : -0.03)),
      confidence: clamp(current.confidence.confidence + 0.1),
    },
    evidenceCount: current.evidenceCount + skillResults.length,
    lastPracticedAt: updatedAt,
  };
}

function createWeaknessSignals(model: StudentModel, results: ExerciseResult[], observedAt: string): LearningSignal[] {
  return getChangedSkills(results)
    .filter((skill) => getSkillState(model, skill).score.value < 0.45)
    .map((skill) => ({
      id: `weakness-${model.studentId}-${skill}`,
      skill,
      description: `${labelSkill(skill)} is currently fragile and should guide review.`,
      evidenceIds: results.filter((result) => result.targetSkill === skill).flatMap((result) => result.evidenceEventIds),
      confidence: getSkillState(model, skill).score.confidence,
      observedAt,
    }));
}

function createStrengthSignals(model: StudentModel, results: ExerciseResult[], observedAt: string): LearningSignal[] {
  return getChangedSkills(results)
    .filter((skill) => getSkillState(model, skill).score.value > 0.7)
    .map((skill) => ({
      id: `strength-${model.studentId}-${skill}`,
      skill,
      description: `${labelSkill(skill)} is becoming reliable in recent practice.`,
      evidenceIds: results.filter((result) => result.targetSkill === skill).flatMap((result) => result.evidenceEventIds),
      confidence: getSkillState(model, skill).score.confidence,
      observedAt,
    }));
}

function mergeLearningSignals(existing: LearningSignal[], incoming: LearningSignal[]): LearningSignal[] {
  const signals = new Map(existing.map((signal) => [signal.id, signal]));

  for (const signal of incoming) {
    signals.set(signal.id, signal);
  }

  return Array.from(signals.values());
}

function refreshReviewPriorities(
  existing: ReviewPriority[],
  changedSkills: SkillArea[],
  results: ExerciseResult[],
  dueAt: string,
): ReviewPriority[] {
  const priorities = new Map(existing.map((priority) => [priority.id, priority]));

  for (const skill of changedSkills) {
    const hasIncorrectResult = results.some((result) => result.targetSkill === skill && !result.correct);

    if (hasIncorrectResult) {
      priorities.set(`review-${skill}`, {
        id: `review-${skill}`,
        skill,
        target: labelSkill(skill),
        reason: `${labelSkill(skill)} produced imperfect evidence in the latest lesson.`,
        dueAt,
      });
    }
  }

  return Array.from(priorities.values());
}

function refreshLearningGoals(existing: LearningGoal[], weakestSkill: SkillArea, createdAt: string): LearningGoal[] {
  const activeGoal = existing.find((goal) => goal.skill === weakestSkill);

  if (activeGoal) {
    return existing;
  }

  return [
    ...existing,
    {
      id: `goal-${weakestSkill}`,
      skill: weakestSkill,
      purpose: createGoalPurpose(weakestSkill),
      createdAt,
    },
  ];
}

function getChangedSkills(results: ExerciseResult[]): SkillArea[] {
  return Array.from(new Set(results.map((result) => result.targetSkill)));
}

function getSkillState(model: StudentModel, skill: SkillArea): SkillState {
  switch (skill) {
    case 'grammar':
      return model.grammar;
    case 'listening':
      return model.listening;
    case 'speaking':
      return model.speaking;
    case 'review':
    case 'vocabulary':
      return model.vocabulary;
  }
}

function labelSkill(skill: SkillArea): string {
  switch (skill) {
    case 'grammar':
      return 'Grammar';
    case 'listening':
      return 'Listening';
    case 'speaking':
      return 'Speaking';
    case 'review':
      return 'Review';
    case 'vocabulary':
      return 'Vocabulary';
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
