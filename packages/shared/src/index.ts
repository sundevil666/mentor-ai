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

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
