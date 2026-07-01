import type {
  ApiResponse,
  ExerciseResult,
  GeneratedLesson,
  LearningContext,
  LearningSessionHandoff,
  LearningEvent,
  Recommendation,
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

export async function fetchCurrentLesson(context: LearningContext): Promise<GeneratedLesson> {
  const response = await fetch(`${apiBaseUrl}/api/lessons/current`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ context }),
  });

  if (!response.ok) {
    throw new Error('Current lesson request failed.');
  }

  const body = (await response.json()) as ApiResponse<GeneratedLesson>;
  return body.data;
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
