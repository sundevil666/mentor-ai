export type StorageMode = 'demo' | 'personal';

export type EnglishLevel = 'beginner' | 'intermediate' | 'advanced';

export type LearningConcept = 'learning' | 'reading' | 'vocabulary';

export type ConceptLevel = 'foundation' | 'developing' | 'confident';

export type ReadingLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2' | 'unknown';

export type ReadingImportSourceType = 'manual' | 'public-domain' | 'licensed-provider';

export type PronunciationIssueType = 'missing' | 'substitution' | 'stress' | 'unclear' | 'extra';

export type SkillArea = 'vocabulary' | 'grammar' | 'listening' | 'speaking' | 'review';

export type LearningActivityType =
  | 'guided-lesson'
  | 'reading-comprehension'
  | 'vocabulary-recognition'
  | 'vocabulary-recall'
  | 'recovery-check'
  | 'review';

export type LearningMode = 'bus' | 'walking' | 'home' | 'listening' | 'speaking' | 'review' | 'recovery';

export type WorkShift = 'first' | 'second' | 'third' | 'off' | 'unknown';

export type ActivityPace = 'passive' | 'steady' | 'active' | 'deep';

export type DeviceSurface = 'mobile' | 'desktop';

export interface WorkShiftSchedule {
  shift: WorkShift;
  startsAtMinutes: number;
  endsAtMinutes: number;
  leaveHomeMinutesBeforeStart: number;
  busLeavesMinutesBeforeStart: number;
  busArrivesMinutesBeforeStart: number;
  headphonesOffMinutesBeforeStart: number;
}

export interface WorkShiftTiming {
  shift: WorkShift;
  startsAt: string;
  endsAt: string;
  leaveHomeAt: string;
  busLeavesAt: string;
  busArrivesAt: string;
  headphonesOffAt: string;
}

export type ExerciseType =
  | 'vocabulary-recall'
  | 'word-order'
  | 'listening-text'
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

export type SyncStatus = 'pending' | 'accepted' | 'duplicate' | 'rejected';

export type TeacherLevelDecision = 'increase' | 'decrease' | 'hold';

export type RetentionRisk = 'low' | 'medium' | 'high';

export type ReviewUrgency = 'none' | 'soon' | 'now';

export type AvoidancePattern = 'none' | 'stale' | 'repeated-skip' | 'easy-only';

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
  conceptLevels: Record<LearningConcept, ConceptState>;
  conceptHistory: ConceptPracticeRecord[];
  teacherDecision: TeacherDecision;
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

export interface ConceptState {
  concept: LearningConcept;
  level: ConceptLevel;
  score: SignalScore;
  confidence: SignalScore;
  evidenceCount: number;
  lastPracticedAt?: string;
  daysSincePractice: number;
  avoidancePattern: AvoidancePattern;
  retentionRisk: RetentionRisk;
  reviewUrgency: ReviewUrgency;
  recommendedActivity: LearningActivityType;
  skillLevels?: Partial<Record<SkillArea, ConceptLevel>>;
}

export interface ConceptPracticeRecord {
  concept: LearningConcept;
  activityType: LearningActivityType;
  practicedAt: string;
  accuracy: number;
  averageResponseTimeMs: number;
  completionRate: number;
  hintCount: number;
  skippedCount: number;
  abandonedCount: number;
  teacherDecision: TeacherLevelDecision;
}

export interface TeacherDecision {
  concept: LearningConcept;
  activityType: LearningActivityType;
  levelDecision: TeacherLevelDecision;
  reason: string;
  nextRecommendedConcept: LearningConcept;
  nextRecommendedActivity: LearningActivityType;
  createdAt: string;
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
  selectedConcept?: LearningConcept;
  manualConceptChoice?: boolean;
  isOffline: boolean;
  speechAvailable: boolean;
  availableMinutes: number;
  workShift?: WorkShift;
  dayType?: 'weekday' | 'weekend';
  activityPace?: ActivityPace;
  startedHour?: number;
  activityReason?: string;
  shiftTiming?: WorkShiftTiming;
}

export interface LessonPlan {
  id: string;
  studentModelVersion: number;
  concept: LearningConcept;
  conceptLevel: ConceptLevel;
  activityType: LearningActivityType;
  teacherDecision: TeacherDecision;
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
  concept: LearningConcept;
  conceptLevel: ConceptLevel;
  activityType: LearningActivityType;
  teacherDecision: TeacherDecision;
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
  microLesson: string;
  successTip: string;
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

export interface ReadingImportSource {
  id: string;
  type: ReadingImportSourceType;
  provider: string;
  sourceUrl?: string;
  importedAt: string;
  licenseNote?: string;
}

export interface ReadingBook {
  id: string;
  title: string;
  author?: string;
  level: ReadingLevel;
  language: 'en';
  sourceId: string;
  pageCount: number;
  chapterCount: number;
  wordCount: number;
  importedAt: string;
  updatedAt: string;
}

export interface ReadingChapter {
  id: string;
  bookId: string;
  title: string;
  order: number;
  pageIds: string[];
}

export interface ReadingPage {
  id: string;
  bookId: string;
  chapterId?: string;
  pageNumber: number;
  text: string;
  wordCount: number;
}

export interface ReadingAttempt {
  id: string;
  studentId: string;
  bookId: string;
  pageId: string;
  startedAt: string;
  completedAt?: string;
  transcript?: string;
  expectedText: string;
  pronunciationIssues: PronunciationIssue[];
  unknownWords: string[];
}

export interface PronunciationIssue {
  id: string;
  word: string;
  issueType: PronunciationIssueType;
  expected?: string;
  heard?: string;
  sentence?: string;
  confidence: number;
}

export interface VocabularyPracticeItem {
  id: string;
  studentId: string;
  word: string;
  sourceBookId?: string;
  sourcePageId?: string;
  sentence?: string;
  pronunciationIssueIds: string[];
  nextReviewAt: string;
  createdAt: string;
}

export interface LearningEvent {
  id: string;
  studentId: string;
  sessionId: string;
  lessonId?: string;
  exerciseId?: string;
  type: LearningEventType;
  occurredAt: string;
  concept?: LearningConcept;
  activityType?: LearningActivityType;
  teacherDecision?: TeacherLevelDecision;
  retentionRisk?: RetentionRisk;
  reviewUrgency?: ReviewUrgency;
  avoidancePattern?: AvoidancePattern;
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
  concept: LearningConcept;
  activityType: LearningActivityType;
  conceptLevel: ConceptLevel;
  correct: boolean;
  attempts: number;
  responseTimeMs: number;
  hintCount: number;
  skipped: boolean;
  abandoned: boolean;
  repeatedMistake: boolean;
  readingComprehensionScore?: number;
  unknownWords?: string[];
  vocabularyRecallStatus?: 'recognized' | 'recalled' | 'forgotten' | 'fragile';
  teacherDecision: TeacherLevelDecision;
  reasonForLevelDecision: string;
  lastPracticedAt?: string;
  daysSincePractice?: number;
  avoidancePattern?: AvoidancePattern;
  retentionRisk?: RetentionRisk;
  reviewUrgency?: ReviewUrgency;
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
  expectedText?: string;
  heardText?: string;
  pronunciationIssues: PronunciationIssue[];
  responseStartDelayMs?: number;
  completedAt: string;
}

export interface LearningSessionHandoff {
  id: string;
  studentId: string;
  sourceDevice: DeviceSurface;
  lesson: GeneratedLesson;
  context: LearningContext;
  currentExerciseIndex: number;
  startedAt: string;
  exerciseStartedAt: string;
  events: LearningEvent[];
  results: ExerciseResult[];
  speechResults: SpeechResult[];
  updatedAt: string;
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
  pronunciationIssueCount: number;
  pronunciationFocus: string[];
  fatigueSignal: SignalScore;
  learningMode?: LearningMode;
  workShift?: WorkShift;
  shiftTiming?: WorkShiftTiming;
  dayType?: 'weekday' | 'weekend';
  activityPace?: ActivityPace;
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

export interface ActivitySnapshot {
  id: string;
  studentId: string;
  sessionId?: string;
  observedAt: string;
  localHour: number;
  weekday: number;
  dayType: 'weekday' | 'weekend';
  workShift: WorkShift;
  shiftTiming?: WorkShiftTiming;
  activityPace: ActivityPace;
  suggestedMode: LearningMode;
  availableMinutes: number;
  reason: string;
  lessonCompleted?: boolean;
  completedExercises?: number;
  accuracy?: number;
  averageResponseTimeMs?: number;
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
  conceptLevels: {
    learning: createConceptState('learning', 0.32, 'guided-lesson'),
    reading: createConceptState('reading', 0.24, 'reading-comprehension'),
    vocabulary: createConceptState('vocabulary', 0.35, 'vocabulary-recall'),
  },
  conceptHistory: [],
  teacherDecision: {
    concept: 'learning',
    activityType: 'guided-lesson',
    levelDecision: 'hold',
    reason: 'Start with a guided lesson so the teacher can observe grammar, listening, speaking, and vocabulary together.',
    nextRecommendedConcept: 'learning',
    nextRecommendedActivity: 'guided-lesson',
    createdAt: '2026-06-28T00:00:00.000Z',
  },
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

export const workShiftSchedules: Record<Exclude<WorkShift, 'off' | 'unknown'>, WorkShiftSchedule> = {
  first: createWorkShiftSchedule('first', 6 * 60, 14 * 60),
  second: createWorkShiftSchedule('second', 14 * 60, 22 * 60),
  third: createWorkShiftSchedule('third', 22 * 60, 6 * 60),
};

export function getWorkShiftTiming(workShift: WorkShift): WorkShiftTiming | undefined {
  if (workShift === 'off' || workShift === 'unknown') {
    return undefined;
  }

  const schedule = workShiftSchedules[workShift];

  return {
    shift: workShift,
    startsAt: formatClockMinutes(schedule.startsAtMinutes),
    endsAt: formatClockMinutes(schedule.endsAtMinutes),
    leaveHomeAt: formatClockMinutes(schedule.startsAtMinutes - schedule.leaveHomeMinutesBeforeStart),
    busLeavesAt: formatClockMinutes(schedule.startsAtMinutes - schedule.busLeavesMinutesBeforeStart),
    busArrivesAt: formatClockMinutes(schedule.startsAtMinutes - schedule.busArrivesMinutesBeforeStart),
    headphonesOffAt: formatClockMinutes(schedule.startsAtMinutes - schedule.headphonesOffMinutesBeforeStart),
  };
}

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
  if (exercise.type === 'listening-text') {
    return response.trim().length > 0;
  }

  const expected = exercise.expectedResponse?.trim().toLowerCase();

  if (!expected) {
    return response.trim().length > 0;
  }

  return response.trim().toLowerCase() === expected;
}

export function analyzePronunciationAttempt(
  expectedText: string,
  heardText: string,
  createdAt: string,
): PronunciationIssue[] {
  const expectedWords = normalizeWords(expectedText);
  const heardWords = normalizeWords(heardText);
  const issues: PronunciationIssue[] = [];

  for (const [index, word] of expectedWords.entries()) {
    const heard = heardWords[index];

    if (!heard) {
      issues.push(createPronunciationIssue(word, 'missing', createdAt, index));
      continue;
    }

    if (heard !== word) {
      issues.push({
        ...createPronunciationIssue(word, wordsLookClose(word, heard) ? 'unclear' : 'substitution', createdAt, index),
        heard,
      });
    }
  }

  if (heardWords.length > expectedWords.length) {
    for (const [extraIndex, word] of heardWords.slice(expectedWords.length).entries()) {
      issues.push(createPronunciationIssue(word, 'extra', createdAt, expectedWords.length + extraIndex));
    }
  }

  return issues.slice(0, 4);
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
  const teacherDecision = decideNextTeacherAction(model, context, [], createdAt);
  const concept = context.manualConceptChoice && context.selectedConcept ? context.selectedConcept : teacherDecision.nextRecommendedConcept;
  const conceptState = refreshConceptTimeSignals(getConceptState(model, concept), model.conceptHistory, createdAt);
  const weakestSkill = getWeakestSkillForConcept(model, concept);
  const reviewPriority = model.reviewPriorities.find((priority) => priority.skill === weakestSkill);
  const goal = model.activeLearningGoals.find((activeGoal) => activeGoal.skill === weakestSkill) ?? {
    id: `goal-${weakestSkill}-${model.version}`,
    skill: weakestSkill,
    purpose: createGoalPurpose(weakestSkill),
    createdAt,
  };

  return {
    id: `plan-${model.studentId}-${model.version}-${concept}-${weakestSkill}`,
    studentModelVersion: model.version,
    concept,
    conceptLevel: conceptState.level,
    activityType: chooseActivityForConcept(concept, conceptState),
    teacherDecision: {
      ...teacherDecision,
      concept,
      activityType: chooseActivityForConcept(concept, conceptState),
      nextRecommendedConcept: concept,
      nextRecommendedActivity: chooseActivityForConcept(concept, conceptState),
    },
    goal,
    teachingIntent: createTeachingIntent(weakestSkill, context, conceptState),
    targetSkills: Array.from(new Set([weakestSkill, 'review'])),
    learningMode: context.mode,
    difficulty: chooseDifficulty(model, context, conceptState, teacherDecision),
    reviewPriorityIds: reviewPriority ? [reviewPriority.id] : [],
    createdAt,
  };
}

export function generateLessonFromPlan(plan: LessonPlan, createdAt: string): GeneratedLesson {
  const reviewTarget = plan.goal.skill === 'grammar' ? 'Where are you?' : 'Good afternoon';
  const exercises = createConceptExercises(plan, reviewTarget);

  return {
    id: `lesson-${plan.id}`,
    planId: plan.id,
    studentModelVersion: plan.studentModelVersion,
    concept: plan.concept,
    conceptLevel: plan.conceptLevel,
    activityType: plan.activityType,
    teacherDecision: plan.teacherDecision,
    title: createConceptLessonTitle(plan),
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
  const teacherDecision = decideNextTeacherAction(model, createContextFromResults(results), results, updatedAt);
  const nextModel: StudentModel = {
    ...model,
    version: nextModelVersion(model),
    conceptLevels: updateConceptStates(model, results, teacherDecision, updatedAt),
    conceptHistory: [...model.conceptHistory, ...createConceptPracticeRecords(results, updatedAt)].slice(-24),
    teacherDecision,
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
  const decision = decideNextTeacherAction(model, { mode: 'home', isOffline: false, speechAvailable: true, availableMinutes: 6 }, [], createdAt);

  return {
    id: `recommendation-${model.studentId}-${model.version}`,
    studentId: model.studentId,
    summary: createConceptRecommendationSummary(decision),
    reason: decision.reason,
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

function createConceptState(
  concept: LearningConcept,
  value: number,
  recommendedActivity: LearningActivityType,
): ConceptState {
  return {
    concept,
    level: scoreToConceptLevel(value),
    score: { value, confidence: 0.3 },
    confidence: { value, confidence: 0.3 },
    evidenceCount: 0,
    daysSincePractice: 0,
    avoidancePattern: 'none',
    retentionRisk: 'low',
    reviewUrgency: 'none',
    recommendedActivity,
    skillLevels: {},
  };
}

export function decideNextTeacherAction(
  model: StudentModel,
  context: LearningContext,
  results: ExerciseResult[],
  createdAt: string,
): TeacherDecision {
  const concept = context.selectedConcept ?? getRecommendedConcept(model, createdAt);
  const conceptState = getConceptState(model, concept);
  const summary = summarizeConceptEvidence(results, concept);
  const levelDecision = decideLevelChange(conceptState, summary);
  const nextRecommendedConcept =
    context.manualConceptChoice && context.selectedConcept ? context.selectedConcept : getRecommendedConcept(model, createdAt);
  const nextState = getConceptState(model, nextRecommendedConcept);
  const nextRecommendedActivity = chooseActivityForConcept(nextRecommendedConcept, nextState);

  return {
    concept,
    activityType: chooseActivityForConcept(concept, conceptState),
    levelDecision,
    reason: createDecisionReason(concept, conceptState, summary, levelDecision, createdAt),
    nextRecommendedConcept,
    nextRecommendedActivity,
    createdAt,
  };
}

function summarizeConceptEvidence(results: ExerciseResult[], concept: LearningConcept) {
  const conceptResults = results.filter((result) => result.concept === concept);
  const completed = conceptResults.filter((result) => result.completionState === 'completed');
  const correct = completed.filter((result) => result.correct).length;
  const totalResponseTime = completed.reduce((sum, result) => sum + result.responseTimeMs, 0);
  const skippedCount = conceptResults.filter((result) => result.completionState === 'skipped' || result.skipped).length;
  const abandonedCount = conceptResults.filter((result) => result.completionState === 'abandoned' || result.abandoned).length;
  const hintCount = conceptResults.reduce((sum, result) => sum + result.hintCount, 0);

  return {
    resultCount: conceptResults.length,
    accuracy: completed.length === 0 ? 0 : correct / completed.length,
    averageResponseTimeMs: completed.length === 0 ? 0 : Math.round(totalResponseTime / completed.length),
    completionRate: conceptResults.length === 0 ? 1 : completed.length / conceptResults.length,
    hintCount,
    skippedCount,
    abandonedCount,
    repeatedMistakes: conceptResults.filter((result) => result.repeatedMistake || !result.correct).length,
  };
}

function decideLevelChange(
  conceptState: ConceptState,
  summary: ReturnType<typeof summarizeConceptEvidence>,
): TeacherLevelDecision {
  if (
    summary.resultCount > 0 &&
    (summary.accuracy < 0.55 ||
      summary.completionRate < 0.75 ||
      summary.hintCount >= 3 ||
      summary.abandonedCount > 0 ||
      summary.repeatedMistakes >= 2 ||
      conceptState.retentionRisk === 'high')
  ) {
    return 'decrease';
  }

  if (
    summary.resultCount >= 3 &&
    summary.accuracy >= 0.8 &&
    summary.averageResponseTimeMs > 0 &&
    summary.averageResponseTimeMs <= 9000 &&
    summary.hintCount === 0 &&
    summary.completionRate >= 0.9 &&
    conceptState.retentionRisk !== 'high'
  ) {
    return 'increase';
  }

  return 'hold';
}

function updateConceptStates(
  model: StudentModel,
  results: ExerciseResult[],
  teacherDecision: TeacherDecision,
  updatedAt: string,
): Record<LearningConcept, ConceptState> {
  const states = { ...model.conceptLevels };
  const concepts: LearningConcept[] = ['learning', 'reading', 'vocabulary'];

  for (const concept of concepts) {
    const current = refreshConceptTimeSignals(states[concept], model.conceptHistory, updatedAt);
    const summary = summarizeConceptEvidence(results, concept);

    if (summary.resultCount === 0) {
      states[concept] = current;
      continue;
    }

    const levelDecision = concept === teacherDecision.concept ? teacherDecision.levelDecision : decideLevelChange(current, summary);
    const scoreAdjustment = levelDecision === 'increase' ? 0.08 : levelDecision === 'decrease' ? -0.07 : summary.accuracy >= 0.7 ? 0.02 : -0.02;
    const nextScore = clamp(current.score.value + scoreAdjustment);

    states[concept] = {
      ...current,
      level: scoreToConceptLevel(nextScore),
      score: {
        value: nextScore,
        confidence: clamp(current.score.confidence + 0.12),
      },
      confidence: {
        value: clamp(current.confidence.value + (summary.completionRate >= 0.9 && summary.hintCount === 0 ? 0.04 : -0.03)),
        confidence: clamp(current.confidence.confidence + 0.1),
      },
      evidenceCount: current.evidenceCount + summary.resultCount,
      lastPracticedAt: updatedAt,
      daysSincePractice: 0,
      avoidancePattern: summary.skippedCount + summary.abandonedCount > 0 ? 'repeated-skip' : 'none',
      retentionRisk: 'low',
      reviewUrgency: 'none',
      recommendedActivity: chooseActivityForConcept(concept, current),
    };
  }

  return states;
}

function createConceptPracticeRecords(results: ExerciseResult[], practicedAt: string): ConceptPracticeRecord[] {
  const records: ConceptPracticeRecord[] = [];

  for (const concept of ['learning', 'reading', 'vocabulary'] as LearningConcept[]) {
    const summary = summarizeConceptEvidence(results, concept);

    if (summary.resultCount === 0) {
      continue;
    }

    const firstResult = results.find((result) => result.concept === concept);

    records.push({
      concept,
      activityType: firstResult?.activityType ?? chooseActivityForConcept(concept, createConceptState(concept, 0.3, 'review')),
      practicedAt,
      accuracy: summary.accuracy,
      averageResponseTimeMs: summary.averageResponseTimeMs,
      completionRate: summary.completionRate,
      hintCount: summary.hintCount,
      skippedCount: summary.skippedCount,
      abandonedCount: summary.abandonedCount,
      teacherDecision: firstResult?.teacherDecision ?? 'hold',
    });
  }

  return records;
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

function getWeakestSkillForConcept(model: StudentModel, concept: LearningConcept): SkillArea {
  if (concept === 'reading') {
    return model.listening.score.value < model.vocabulary.score.value ? 'listening' : 'vocabulary';
  }

  if (concept === 'vocabulary') {
    return 'vocabulary';
  }

  return getWeakestSkill(model);
}

function chooseDifficulty(
  model: StudentModel,
  context: LearningContext,
  conceptState: ConceptState,
  teacherDecision: TeacherDecision,
): LessonPlan['difficulty'] {
  if (
    context.mode === 'recovery' ||
    model.fatigue.value > 0.5 ||
    conceptState.retentionRisk === 'high' ||
    teacherDecision.levelDecision === 'decrease'
  ) {
    return 'supportive';
  }

  if (
    model.confidence.value > 0.7 &&
    getSkillState(model, getWeakestSkill(model)).score.value > 0.65 &&
    teacherDecision.levelDecision === 'increase'
  ) {
    return 'challenge';
  }

  return 'steady';
}

function createTeachingIntent(skill: SkillArea, context: LearningContext, conceptState: ConceptState): string {
  const manualChoice = context.manualConceptChoice ? 'respecting the student choice' : 'following the teacher recommendation';
  return `Practice ${labelConcept(conceptState.concept)} through ${labelSkill(skill)} at ${conceptState.level} level, ${manualChoice}, while preserving evidence for the Student Model.`;
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

function createConceptLessonTitle(plan: LessonPlan): string {
  if (plan.concept === 'reading') {
    return 'Short reading check';
  }

  if (plan.concept === 'vocabulary') {
    return 'Vocabulary growth practice';
  }

  return createLessonTitle(plan.goal.skill);
}

function createConceptExercises(plan: LessonPlan, reviewTarget: string): Exercise[] {
  if (plan.learningMode === 'listening' || plan.goal.skill === 'listening') {
    const listeningText = createTenMinuteListeningText();

    return [
      {
        id: `${plan.id}-listening-text`,
        type: 'listening-text',
        prompt: 'Listen and read',
        microLesson: 'Read the text while you listen. Replay the audio once if a word feels unclear.',
        successTip: 'Continue when you have listened and followed the whole text.',
        targetSkill: 'listening',
        expectedResponse: 'listened',
        audioText: listeningText,
      },
      {
        id: `${plan.id}-listening-check`,
        type: 'listening-comprehension',
        prompt: 'Where is the speaker?',
        microLesson: 'After listening, check the main situation first.',
        successTip: 'Choose the place you heard in the text.',
        targetSkill: 'listening',
        expectedResponse: 'on the bus',
        options: ['on the bus', 'in a cafe', 'at school'],
        audioText: listeningText,
      },
    ];
  }

  if (plan.concept === 'reading') {
    return [
      {
        id: `${plan.id}-reading-text`,
        type: 'review',
        prompt: 'Read: Tom works in a small cafe. In the afternoon, he helps a friend and drinks tea.',
        microLesson: 'Read for the simple situation first: who, where, and when.',
        successTip: 'Type read when you finish the short text.',
        targetSkill: 'review',
        expectedResponse: 'read',
      },
      {
        id: `${plan.id}-reading-main-idea`,
        type: 'listening-comprehension',
        prompt: 'What is the text mostly about?',
        microLesson: 'Main idea questions ask for the whole situation, not one isolated word.',
        successTip: 'Choose the answer that matches the person and place.',
        targetSkill: 'listening',
        expectedResponse: 'tom works in a cafe',
        options: ['tom works in a cafe', 'tom travels by train', 'tom studies math'],
      },
      {
        id: `${plan.id}-reading-word`,
        type: 'vocabulary-recall',
        prompt: 'Which word means a place where people drink tea or coffee?',
        microLesson: 'Unknown words from reading become vocabulary targets for future review.',
        successTip: 'Look back at the text and write the place word.',
        targetSkill: 'vocabulary',
        expectedResponse: 'cafe',
      },
    ];
  }

  if (plan.concept === 'vocabulary') {
    return [
      {
        id: `${plan.id}-vocabulary-recognition`,
        type: 'vocabulary-recall',
        prompt: 'Choose the meaning of "afternoon".',
        microLesson: 'Recognition is the first layer: connect the English word to the idea quickly.',
        successTip: 'Pick the time after lunch.',
        targetSkill: 'vocabulary',
        expectedResponse: 'time after lunch',
        options: ['time after lunch', 'very early morning', 'a small question'],
      },
      {
        id: `${plan.id}-vocabulary-recall`,
        type: 'vocabulary-recall',
        prompt: 'Translate: dobrý deň',
        microLesson: 'Active recall is stronger than reading the answer. Pause for one second before typing.',
        successTip: 'Use the polite greeting for later in the day.',
        targetSkill: 'vocabulary',
        expectedResponse: 'good afternoon',
      },
      {
        id: `${plan.id}-vocabulary-context`,
        type: 'word-order',
        prompt: 'Order the words: good / afternoon / teacher',
        microLesson: 'Putting a word into a phrase makes it easier to use in real speech.',
        successTip: 'Keep the greeting together: good afternoon.',
        targetSkill: 'grammar',
        expectedResponse: 'good afternoon teacher',
      },
    ];
  }

  return [
    {
      id: `${plan.id}-warmup`,
      type: 'review',
      prompt: `Review: say or type "${reviewTarget}".`,
      microLesson: 'Warmup protects earlier progress before adding new pressure.',
      successTip: 'Copy the phrase slowly and clearly.',
      targetSkill: 'review',
      expectedResponse: reviewTarget.toLowerCase().replace('?', ''),
    },
    {
      id: `${plan.id}-vocabulary`,
      type: 'vocabulary-recall',
      prompt: 'Translate: dobrý deň',
      microLesson: 'This step checks whether the greeting is ready for real use.',
      successTip: 'Think of the polite afternoon greeting.',
      targetSkill: 'vocabulary',
      expectedResponse: 'good afternoon',
    },
    {
      id: `${plan.id}-word-order`,
      type: 'word-order',
      prompt: 'Order the words: you / are / where',
      microLesson: 'English questions often use question word + helper verb + subject.',
      successTip: 'Start with where, then are, then you.',
      targetSkill: 'grammar',
      expectedResponse: 'where are you',
    },
    {
      id: `${plan.id}-listening`,
      type: 'listening-comprehension',
      prompt: 'Listen and choose the meaning.',
      microLesson: 'Listen for the sentence shape. Replaying audio is useful practice evidence.',
      successTip: 'Match the question word you hear.',
      targetSkill: 'listening',
      expectedResponse: 'where are you',
      options: ['where are you', 'how old are you', 'what is this'],
      audioText: 'Where are you?',
    },
    {
      id: `${plan.id}-speaking`,
      type: 'repeat-speaking',
      prompt: 'Repeat: Where are you?',
      microLesson: 'Pronunciation practice is pattern-finding, not a pass/fail test.',
      successTip: 'Say each word separately first, then connect the phrase.',
      targetSkill: 'speaking',
      expectedResponse: 'where are you',
      audioText: 'Where are you?',
    },
  ];
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

  return Array.from({ length: 4 }, (_, index) => `Part ${index + 1}. ${baseSentences.join(' ')}`).join('\n\n');
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function createPronunciationIssue(
  word: string,
  issueType: PronunciationIssueType,
  createdAt: string,
  index: number,
): PronunciationIssue {
  return {
    id: `pronunciation-${word}-${index}-${createdAt}`,
    word,
    issueType,
    confidence: issueType === 'missing' ? 0.7 : 0.5,
  };
}

function wordsLookClose(expected: string, heard: string): boolean {
  return expected[0] === heard[0] || expected.at(-1) === heard.at(-1);
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

function getConceptState(model: StudentModel, concept: LearningConcept): ConceptState {
  return model.conceptLevels?.[concept] ?? createConceptState(concept, 0.3, chooseActivityForConcept(concept));
}

function getRecommendedConcept(model: StudentModel, createdAt: string): LearningConcept {
  const refreshed = (['learning', 'reading', 'vocabulary'] as LearningConcept[]).map((concept) =>
    refreshConceptTimeSignals(getConceptState(model, concept), model.conceptHistory, createdAt),
  );
  const urgent = refreshed.find((state) => state.reviewUrgency === 'now' || state.avoidancePattern !== 'none');

  if (urgent) {
    return urgent.concept;
  }

  return refreshed.reduce((weakest, current) => (current.score.value < weakest.score.value ? current : weakest)).concept;
}

function refreshConceptTimeSignals(
  state: ConceptState,
  history: ConceptPracticeRecord[],
  createdAt: string,
): ConceptState {
  const lastPractice = state.lastPracticedAt ?? findLastPracticeForConcept(history, state.concept)?.practicedAt;
  const daysSincePractice = lastPractice ? daysBetween(lastPractice, createdAt) : 0;
  const recent = history.slice(-6);
  const practicedRecently = recent.some((record) => record.concept === state.concept);
  const skippedRecently = recent.filter((record) => record.concept === state.concept && record.skippedCount + record.abandonedCount > 0).length;
  const avoidancePattern: AvoidancePattern =
    skippedRecently >= 2 ? 'repeated-skip' : history.length >= 4 && !practicedRecently ? 'stale' : state.avoidancePattern;
  const retentionRisk: RetentionRisk = daysSincePractice >= 10 ? 'high' : daysSincePractice >= 5 ? 'medium' : 'low';
  const reviewUrgency: ReviewUrgency = retentionRisk === 'high' || avoidancePattern !== 'none' ? 'now' : retentionRisk === 'medium' ? 'soon' : 'none';

  return {
    ...state,
    lastPracticedAt: lastPractice,
    daysSincePractice,
    avoidancePattern,
    retentionRisk,
    reviewUrgency,
  };
}

function findLastPracticeForConcept(
  history: ConceptPracticeRecord[],
  concept: LearningConcept,
): ConceptPracticeRecord | undefined {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].concept === concept) {
      return history[index];
    }
  }

  return undefined;
}

function chooseActivityForConcept(
  concept: LearningConcept,
  state: Partial<ConceptState> = {},
): LearningActivityType {
  if (state.reviewUrgency === 'now' || state.retentionRisk === 'high') {
    return 'recovery-check';
  }

  switch (concept) {
    case 'reading':
      return 'reading-comprehension';
    case 'vocabulary':
      return 'vocabulary-recall';
    case 'learning':
      return 'guided-lesson';
  }
}

function createDecisionReason(
  concept: LearningConcept,
  state: ConceptState,
  summary: ReturnType<typeof summarizeConceptEvidence>,
  decision: TeacherLevelDecision,
  createdAt: string,
): string {
  const refreshedState = refreshConceptTimeSignals(state, [], createdAt);

  if (refreshedState.reviewUrgency === 'now') {
    return `${labelConcept(concept)} has not been practiced recently, so the teacher will use a short, low-pressure check before moving forward.`;
  }

  if (decision === 'increase') {
    return `${labelConcept(concept)} looks stable: answers are mostly correct, response time is comfortable, and little support is needed.`;
  }

  if (decision === 'decrease') {
    return `${labelConcept(concept)} looks overloaded or fragile, so the next activity should be easier and more supportive.`;
  }

  if (summary.resultCount > 0) {
    return `${labelConcept(concept)} has mixed evidence, so the teacher will hold the level and reinforce it once more.`;
  }

  if (contextualReasonApplies(state, concept)) {
    return `${labelConcept(concept)} fits the current activity window, so the teacher will keep this session practical and low-friction.`;
  }

  return `${labelConcept(concept)} is the best next teaching mode based on the current Student Model and recent practice history.`;
}

function contextualReasonApplies(state: ConceptState, concept: LearningConcept): boolean {
  return state.concept === concept && state.reviewUrgency === 'none';
}

function createConceptRecommendationSummary(decision: TeacherDecision): string {
  switch (decision.nextRecommendedConcept) {
    case 'reading':
      return 'Short reading check';
    case 'vocabulary':
      return 'Reinforce vocabulary before adding more';
    case 'learning':
      return 'Guided learning path';
  }
}

function createContextFromResults(results: ExerciseResult[]): LearningContext {
  return {
    mode: 'home',
    selectedConcept: results[0]?.concept,
    isOffline: false,
    speechAvailable: true,
    availableMinutes: 6,
  };
}

function scoreToConceptLevel(value: number): ConceptLevel {
  if (value >= 0.7) {
    return 'confident';
  }

  if (value >= 0.45) {
    return 'developing';
  }

  return 'foundation';
}

function daysBetween(from: string, to: string): number {
  const delta = Date.parse(to) - Date.parse(from);
  return Number.isNaN(delta) ? 0 : Math.max(0, Math.floor(delta / 86400000));
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

function labelConcept(concept: LearningConcept): string {
  switch (concept) {
    case 'learning':
      return 'Learning';
    case 'reading':
      return 'Reading';
    case 'vocabulary':
      return 'Vocabulary Growth';
  }
}

function createWorkShiftSchedule(
  shift: Exclude<WorkShift, 'off' | 'unknown'>,
  startsAtMinutes: number,
  endsAtMinutes: number,
): WorkShiftSchedule {
  return {
    shift,
    startsAtMinutes,
    endsAtMinutes,
    leaveHomeMinutesBeforeStart: 65,
    busLeavesMinutesBeforeStart: 50,
    busArrivesMinutesBeforeStart: 30,
    headphonesOffMinutesBeforeStart: 20,
  };
}

function formatClockMinutes(minutes: number): string {
  const normalizedMinutes = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
