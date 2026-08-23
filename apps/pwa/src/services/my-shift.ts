const myShiftOrigin = 'https://my-shift-iota.vercel.app';
const sessionKey = 'mentor-ai-my-shift-session';
const oauthKey = 'mentor-ai-my-shift-oauth';
export const myShiftSyncIntervalMs = 24 * 60 * 60 * 1000;

export type MyShiftLessonAvailability =
  | 'recommended'
  | 'available'
  | 'short_lesson'
  | 'not_recommended'
  | 'unavailable'
  | 'unknown';

export interface MyShiftTimelineItem {
  type: 'sleep' | 'awake' | 'work' | 'work_break' | 'commute' | 'day_off' | 'vacation' | 'sick_leave' | 'unknown';
  startsAt: string;
  endsAt: string;
  lessonAvailability: MyShiftLessonAvailability;
}

export interface MyShiftLearningWindow {
  startsAt: string;
  endsAt: string;
  recommendedDurationMinutes: number;
  priority: number;
  reason: string;
}

export interface MyShiftDay {
  date: string;
  dayType: 'workday' | 'day_off' | 'vacation' | 'sick_leave' | string;
  shift: {
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
    isNightShift: boolean;
    status: string;
  } | null;
  timeline: MyShiftTimelineItem[];
  recommendedLearningWindows: MyShiftLearningWindow[];
}

export interface MyShiftActivity {
  schemaVersion: string;
  generatedAt: string;
  dataVersion: string;
  user: { id: string; timezone: string; locale: string };
  range: { from: string; to: string };
  days: MyShiftDay[];
}

interface StoredSession {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  scope: string;
}

interface OAuthAttempt {
  state: string;
  verifier: string;
  redirectUri: string;
}

export function isMyShiftConfigured(): boolean {
  return Boolean(process.env.MY_SHIFT_CLIENT_ID);
}

export function isMyShiftConnected(): boolean {
  return readSession() !== null;
}

export async function beginMyShiftConnection(): Promise<void> {
  const clientId = process.env.MY_SHIFT_CLIENT_ID;

  if (!clientId) {
    throw new Error('My Shift client ID is not configured.');
  }

  const verifier = randomBase64Url(64);
  const state = randomBase64Url(32);
  const redirectUri = `${window.location.origin}/settings`;
  const challengeBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = bytesToBase64Url(new Uint8Array(challengeBytes));
  const attempt: OAuthAttempt = { state, verifier, redirectUri };
  sessionStorage.setItem(oauthKey, JSON.stringify(attempt));

  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'activity:read',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  window.location.assign(`${myShiftOrigin}/#/connect?${query.toString()}`);
}

export async function completeMyShiftConnection(code: string, state: string): Promise<void> {
  const clientId = process.env.MY_SHIFT_CLIENT_ID;
  const attempt = readOAuthAttempt();

  if (!clientId || !attempt || attempt.state !== state) {
    throw new Error('My Shift authorization state is invalid or expired.');
  }

  const response = await fetch(`${myShiftOrigin}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: attempt.redirectUri,
      code,
      code_verifier: attempt.verifier,
    }),
  });

  if (!response.ok) {
    throw new Error('My Shift authorization failed.');
  }

  saveTokenResponse(await response.json());
  sessionStorage.removeItem(oauthKey);
}

export function disconnectMyShift(): void {
  localStorage.removeItem(sessionKey);
  sessionStorage.removeItem(oauthKey);
}

export async function fetchMyShiftActivity(from: string, to: string): Promise<MyShiftActivity> {
  let session = readSession();

  if (!session) {
    throw new Error('My Shift is not connected.');
  }

  if (session.accessTokenExpiresAt <= Date.now() + 30_000) {
    session = await refreshAccessToken(session.refreshToken);
  }

  const query = new URLSearchParams({ from, to });
  const response = await fetch(`${myShiftOrigin}/api/v1/activity?${query.toString()}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (response.status === 401) {
    disconnectMyShift();
    throw new Error('My Shift connection expired. Please connect it again.');
  }

  if (!response.ok) {
    throw new Error(response.status === 404 ? 'My Shift schedule is not synchronized yet.' : 'My Shift schedule request failed.');
  }

  return (await response.json()) as MyShiftActivity;
}

export function isMyShiftSyncDue(synchronizedAt: string | null, date = new Date()): boolean {
  if (!synchronizedAt) return true;
  const lastSync = new Date(synchronizedAt).getTime();
  return !Number.isFinite(lastSync) || date.getTime() - lastSync >= myShiftSyncIntervalMs;
}

export function findCurrentMyShiftDay(activity: MyShiftActivity | null, date = new Date()): MyShiftDay | null {
  if (!activity) return null;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: activity.user.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return activity.days.find((day) => day.date === formatter.format(date)) ?? null;
}

async function refreshAccessToken(refreshToken: string): Promise<StoredSession> {
  const response = await fetch(`${myShiftOrigin}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'refresh_token', client_id: process.env.MY_SHIFT_CLIENT_ID, refresh_token: refreshToken }),
  });

  if (!response.ok) {
    disconnectMyShift();
    throw new Error('My Shift connection expired. Please connect it again.');
  }

  return saveTokenResponse(await response.json());
}

function saveTokenResponse(value: unknown): StoredSession {
  const token = value as { access_token: string; expires_in: number; refresh_token: string; scope: string };
  const session: StoredSession = {
    accessToken: token.access_token,
    accessTokenExpiresAt: Date.now() + token.expires_in * 1000,
    refreshToken: token.refresh_token,
    scope: token.scope,
  };
  localStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
}

function readSession(): StoredSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(sessionKey) ?? 'null') as StoredSession | null;
    return value?.accessToken && value.refreshToken ? value : null;
  } catch {
    return null;
  }
}

function readOAuthAttempt(): OAuthAttempt | null {
  try {
    return JSON.parse(sessionStorage.getItem(oauthKey) ?? 'null') as OAuthAttempt | null;
  } catch {
    return null;
  }
}

function randomBase64Url(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
