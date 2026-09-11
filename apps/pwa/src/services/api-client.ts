import type {
  ApiResponse,
  ApplicationTelemetryEvent,
  ContentProgress,
  ContentEngagementEvent,
  ExerciseResult,
  GeneratedLesson,
  LearningContext,
  LearningActivityEvent,
  LearningActivityTotals,
  LearningActivitySyncResult,
  LearningSessionHandoff,
  LearningEvent,
  PersonalReadingBookArchive,
  Recommendation,
  ReaderTextLookup,
  ReaderVocabularyItem,
  ReadingTranscriptChunk,
  ReadingDeviceSession,
  ReadingResumeSnapshot,
  SpeechResult,
  StatisticsSnapshot,
  Student,
  StudentModel,
  SynchronizationAcknowledgement,
  TranslationUsage,
} from '@mentor-ai/shared';
import { getAuthToken } from './auth.js';

interface StudentStateResponse {
  student: Student;
  studentModel: StudentModel;
  recommendation: Recommendation;
  statisticsSnapshots?: StatisticsSnapshot[];
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
const translationUsageStorageKey = 'mentor-ai:translation-usage:v1';
const translationMonthlyLimit = 450_000;
const translationUsageSyncIntervalMs = 24 * 60 * 60 * 1_000;

interface LocalTranslationUsageState {
  period: string;
  deviceId: string;
  usedCharacters: number;
  synchronizedDeviceCharacters: number;
  serverUsedCharacters: number;
  lastSyncAttemptAt: string | null;
}

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
  const characterCount = Array.from(text).length;
  const usage = readLocalTranslationUsage();
  if (usage.usedCharacters + characterCount > translationMonthlyLimit) {
    throw new Error('The local Google translation limit has been reached. Translation will be available again next month.');
  }
  const response = await fetch(`${apiBaseUrl}/api/reader/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    if (response.status === 429 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('translation-usage-updated'));
    }
    const body = await response.json().catch(() => null) as { data?: { message?: string }; error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? body?.data?.message ?? 'Translation is unavailable right now.');
  }
  const result = ((await response.json()) as ApiResponse<ReaderTextLookup>).data;
  writeLocalTranslationUsage({ ...usage, usedCharacters: usage.usedCharacters + characterCount });
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('translation-usage-updated'));
  return result;
}

export async function fetchTranslationUsage(): Promise<TranslationUsage> {
  let local = readLocalTranslationUsage();
  const lastAttempt = local.lastSyncAttemptAt ? Date.parse(local.lastSyncAttemptAt) : 0;
  if (Date.now() - lastAttempt >= translationUsageSyncIntervalMs) {
    local = { ...local, lastSyncAttemptAt: new Date().toISOString() };
    writeLocalTranslationUsage(local);
    try {
      const response = await fetch(`${apiBaseUrl}/api/reader/usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ period: local.period, deviceId: local.deviceId, usedCharacters: local.usedCharacters }),
      });
      if (response.ok) {
        const server = ((await response.json()) as ApiResponse<TranslationUsage>).data;
        local = {
          ...local,
          synchronizedDeviceCharacters: local.usedCharacters,
          serverUsedCharacters: server.usedCharacters,
        };
        writeLocalTranslationUsage(local);
      }
    } catch {
      // Keep translation available and retry the accounting snapshot tomorrow.
    }
  }
  const usedCharacters = Math.max(
    local.usedCharacters,
    local.serverUsedCharacters + Math.max(0, local.usedCharacters - local.synchronizedDeviceCharacters),
  );
  return createLocalTranslationUsage(local.period, usedCharacters);
}

export function readLocalTranslationUsage(now = new Date()): LocalTranslationUsageState {
  const period = now.toISOString().slice(0, 7);
  const fallback = (): LocalTranslationUsageState => ({
    period,
    deviceId: getOrCreateTranslationDeviceId(),
    usedCharacters: 0,
    synchronizedDeviceCharacters: 0,
    serverUsedCharacters: 0,
    lastSyncAttemptAt: null,
  });
  if (typeof localStorage === 'undefined') return fallback();
  try {
    const stored = JSON.parse(localStorage.getItem(translationUsageStorageKey) ?? 'null') as Partial<LocalTranslationUsageState> | null;
    if (!stored || stored.period !== period || typeof stored.deviceId !== 'string') return fallback();
    return {
      period,
      deviceId: stored.deviceId,
      usedCharacters: Math.max(0, Math.floor(stored.usedCharacters ?? 0)),
      synchronizedDeviceCharacters: Math.max(0, Math.floor(stored.synchronizedDeviceCharacters ?? 0)),
      serverUsedCharacters: Math.max(0, Math.floor(stored.serverUsedCharacters ?? 0)),
      lastSyncAttemptAt: typeof stored.lastSyncAttemptAt === 'string' ? stored.lastSyncAttemptAt : null,
    };
  } catch {
    return fallback();
  }
}

function writeLocalTranslationUsage(state: LocalTranslationUsageState) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(translationUsageStorageKey, JSON.stringify(state));
}

function getOrCreateTranslationDeviceId() {
  if (typeof localStorage === 'undefined') return 'server-test-device';
  const existing = localStorage.getItem('mentor-ai-device-id');
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem('mentor-ai-device-id', id);
  return id;
}

function createLocalTranslationUsage(period: string, usedCharacters: number): TranslationUsage {
  const safeUsed = Math.min(translationMonthlyLimit, Math.max(0, Math.floor(usedCharacters)));
  return {
    period,
    usedCharacters: safeUsed,
    limitCharacters: translationMonthlyLimit,
    remainingCharacters: translationMonthlyLimit - safeUsed,
    percentUsed: Number(((safeUsed / translationMonthlyLimit) * 100).toFixed(2)),
    configured: true,
    exhausted: safeUsed >= translationMonthlyLimit,
  };
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
    keepalive: true,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ progress }),
  });
  if (!response.ok) throw new Error('Content progress synchronization failed.');
  return ((await response.json()) as ApiResponse<ContentProgress[]>).data;
}

export async function fetchReadingResumeSnapshot(bookId: string): Promise<ReadingResumeSnapshot> {
  const response = await fetch(`${apiBaseUrl}/api/reading-resume?bookId=${encodeURIComponent(bookId)}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Reading device synchronization is temporarily unavailable.');
  }
  return ((await response.json()) as ApiResponse<ReadingResumeSnapshot>).data;
}

export async function updateReadingDeviceSession(session: ReadingDeviceSession): Promise<ReadingResumeSnapshot> {
  const response = await fetch(`${apiBaseUrl}/api/reading-resume`, {
    method: 'PUT',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(session),
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Reading device synchronization update failed.');
  }
  return ((await response.json()) as ApiResponse<ReadingResumeSnapshot>).data;
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

export async function synchronizeLearningActivity(
  activityEvents: LearningActivityEvent[],
): Promise<LearningActivitySyncResult> {
  const response = await fetch(`${apiBaseUrl}/api/synchronization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ activityEvents }),
  });
  if (!response.ok) throw new Error('Learning activity synchronization failed.');
  return ((await response.json()) as ApiResponse<LearningActivitySyncResult>).data;
}

export async function fetchLearningActivityTotals(): Promise<LearningActivityTotals> {
  const response = await fetch(`${apiBaseUrl}/api/learning-activity-totals`, { headers: authHeaders() });
  if (!response.ok) throw new Error('Learning activity totals request failed.');
  return ((await response.json()) as ApiResponse<LearningActivityTotals>).data;
}

export async function synchronizeStatisticsSnapshots(statisticsSnapshots: StatisticsSnapshot[]): Promise<StatisticsSnapshot[]> {
  const response = await fetch(`${apiBaseUrl}/api/synchronization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ statisticsSnapshots }),
  });
  if (!response.ok) throw new Error('Statistics synchronization failed.');
  return ((await response.json()) as ApiResponse<StatisticsSnapshot[]>).data;
}

export async function synchronizeApplicationTelemetry(
  telemetryEvents: ApplicationTelemetryEvent[],
): Promise<ApplicationTelemetryEvent[]> {
  const response = await fetch(`${apiBaseUrl}/api/application-telemetry-synchronize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ telemetryEvents }),
  });
  if (!response.ok) throw new Error('Application telemetry synchronization failed.');
  return ((await response.json()) as ApiResponse<ApplicationTelemetryEvent[]>).data;
}

export async function saveReadingTranscript(chunk: ReadingTranscriptChunk): Promise<ReadingTranscriptChunk> {
  const response = await fetch(`${apiBaseUrl}/api/reader/reading-transcripts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(chunk),
  });
  if (!response.ok) throw new Error('Reading transcript could not be saved.');
  return ((await response.json()) as ApiResponse<ReadingTranscriptChunk>).data;
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
