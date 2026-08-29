import type {
  ApiResponse,
  ContentProgress,
  ContentEngagementEvent,
  ExerciseResult,
  GeneratedLesson,
  LearningContext,
  LearningSessionHandoff,
  LearningEvent,
  PersonalReadingBookArchive,
  Recommendation,
  ReaderTextLookup,
  ReaderVocabularyItem,
  SpeechResult,
  StatisticsSnapshot,
  Student,
  StudentModel,
  SynchronizationAcknowledgement,
} from '@mentor-ai/shared';
import { getAuthToken } from './auth.js';

interface StudentStateResponse {
  student: Student;
  studentModel: StudentModel;
  recommendation: Recommendation;
}

interface SynchronizationResponse {
  acknowledgements: SynchronizationAcknowledgement[];
  acceptedCount: number;
  pendingAnalysis: boolean;
  student: Student;
  studentModel: StudentModel;
  studentModelVersion: number;
  recommendation: Recommendation;
  recommendations: Recommendation[];
  statisticsSnapshots: StatisticsSnapshot[];
}

export interface AppConfiguration {
  lessonLibrary: {
    version: string;
    updatedAt: string | null;
    lessonCount: number;
  };
}

const apiBaseUrl =
  process.env.API_BASE_URL ??
  (process.env.DEV || typeof window === 'undefined' ? 'http://localhost:4000' : '');

export async function fetchStudentState(): Promise<StudentStateResponse> {
  const response = await fetch(`${apiBaseUrl}/api/student-state`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Student state request failed.');
  }

  const body = (await response.json()) as ApiResponse<StudentStateResponse>;
  return body.data;
}

export async function fetchAppConfiguration(): Promise<AppConfiguration> {
  const response = await fetch(`${apiBaseUrl}/api/configuration?t=${Date.now()}`, {
    cache: 'no-store',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('App configuration request failed.');
  }

  const body = (await response.json()) as ApiResponse<AppConfiguration>;
  return body.data;
}

export async function fetchReaderTextLookup(text: string): Promise<ReaderTextLookup> {
  const response = await fetch(`${apiBaseUrl}/api/reader/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { data?: { message?: string }; error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? body?.data?.message ?? 'Translation is unavailable right now.');
  }
  return ((await response.json()) as ApiResponse<ReaderTextLookup>).data;
}

export async function fetchReaderPhonetic(text: string): Promise<string | undefined> {
  const response = await fetch(`${apiBaseUrl}/api/reader/phonetic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) return undefined;
  const body = (await response.json()) as ApiResponse<{ text: string; phonetic?: string }>;
  return body.data.phonetic;
}

export async function synchronizeReaderVocabulary(items: ReaderVocabularyItem[]): Promise<ReaderVocabularyItem[]> {
  const response = await fetch(`${apiBaseUrl}/api/reader/vocabulary-synchronize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error('Reader vocabulary synchronization failed.');
  return ((await response.json()) as ApiResponse<ReaderVocabularyItem[]>).data;
}

export async function synchronizePersonalReadingBooks(books: PersonalReadingBookArchive[]): Promise<PersonalReadingBookArchive[]> {
  const response = await fetch(`${apiBaseUrl}/api/reader/books-synchronize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ books }),
  });
  if (!response.ok) throw new Error('Book synchronization failed.');
  return ((await response.json()) as ApiResponse<PersonalReadingBookArchive[]>).data;
}

export async function fetchCurrentLesson(context: LearningContext, forceRefresh = false): Promise<GeneratedLesson> {
  const response = await fetch(`${apiBaseUrl}/api/lessons/current`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ context, forceRefresh }),
  });

  if (!response.ok) {
    throw new Error('Current lesson request failed.');
  }

  const body = (await response.json()) as ApiResponse<GeneratedLesson>;
  return body.data;
}

export async function fetchOfflineLessons(since: string): Promise<GeneratedLesson[]> {
  const response = await fetch(`${apiBaseUrl}/api/lessons?offline=1&since=${encodeURIComponent(since)}&t=${Date.now()}`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Offline lesson update request failed.');
  return ((await response.json()) as ApiResponse<GeneratedLesson[]>).data;
}

export async function fetchSessionHandoffs(): Promise<LearningSessionHandoff[]> {
  const response = await fetch(`${apiBaseUrl}/api/session-handoffs`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Session handoffs request failed.');
  }

  const body = (await response.json()) as ApiResponse<LearningSessionHandoff[]>;
  return body.data;
}

export async function upsertSessionHandoff(handoff: LearningSessionHandoff): Promise<LearningSessionHandoff> {
  const response = await fetch(`${apiBaseUrl}/api/session-handoffs`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(handoff),
  });

  if (!response.ok) {
    throw new Error('Session handoff update failed.');
  }

  const body = (await response.json()) as ApiResponse<LearningSessionHandoff>;
  return body.data;
}

export async function synchronizeContentProgress(progress: ContentProgress[]): Promise<ContentProgress[]> {
  const response = await fetch(`${apiBaseUrl}/api/synchronization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ progress }),
  });
  if (!response.ok) throw new Error('Content progress synchronization failed.');
  return ((await response.json()) as ApiResponse<ContentProgress[]>).data;
}

export async function synchronizeContentEngagement(
  engagementEvents: ContentEngagementEvent[],
): Promise<ContentEngagementEvent[]> {
  const response = await fetch(`${apiBaseUrl}/api/synchronization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ engagementEvents }),
  });
  if (!response.ok) throw new Error('Content engagement synchronization failed.');
  return ((await response.json()) as ApiResponse<ContentEngagementEvent[]>).data;
}

export async function synchronizeLearningEvidence(
  events: LearningEvent[],
  exerciseResults: ExerciseResult[],
  speechResults: SpeechResult[],
): Promise<SynchronizationResponse> {
  const response = await fetch(`${apiBaseUrl}/api/synchronization`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ events, exerciseResults, speechResults }),
  });

  if (!response.ok) {
    throw new Error('Synchronization failed.');
  }

  const body = (await response.json()) as ApiResponse<SynchronizationResponse>;
  return body.data;
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}
