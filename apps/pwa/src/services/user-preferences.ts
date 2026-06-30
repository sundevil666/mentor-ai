import type { WorkShift } from '@mentor-ai/shared';

export type ThemePreference = 'dark' | 'light';

const cookieMaxAgeSeconds = 60 * 60 * 24 * 365;
const maxListeningProgressEntries = 100;
const preferredWorkShiftKey = 'mentor_ai_preferred_work_shift';
const speechVoiceKey = 'mentor_ai_speech_voice';
const themeKey = 'mentor_ai_theme';
const lastRouteKey = 'mentor_ai_last_route';
const listeningProgressKey = 'mentor_ai_listening_progress';
const validWorkShifts = new Set<WorkShift>(['unknown', 'first', 'second', 'third', 'off']);
const validThemes = new Set<ThemePreference>(['dark', 'light']);
const restorableRouteDenyList = new Set(['/settings']);

export interface ListeningProgressPreference {
  wordIndex: number;
  updatedAt: string;
}

export function readPreferredWorkShift(): WorkShift | null {
  const value = readCookie(preferredWorkShiftKey);
  return isWorkShift(value) ? value : null;
}

export function savePreferredWorkShift(workShift: WorkShift) {
  writeCookie(preferredWorkShiftKey, workShift);
}

export function readSpeechVoicePreference(): string | null {
  const value = readCookie(speechVoiceKey);
  return value && value.trim().length > 0 ? value : null;
}

export function saveSpeechVoicePreference(voiceURI: string) {
  writeCookie(speechVoiceKey, voiceURI);
}

export function readThemePreference(): ThemePreference | null {
  const value = readCookie(themeKey);
  return isThemePreference(value) ? value : null;
}

export function saveThemePreference(theme: ThemePreference) {
  writeCookie(themeKey, theme);
}

export function readLastRoutePreference(): string | null {
  const value = readCookie(lastRouteKey);
  return isRestorableRoutePath(value) ? value : null;
}

export function clearLastRoutePreference() {
  clearCookie(lastRouteKey);
}

export function saveLastRoutePreference(routePath: string) {
  if (!isRestorableRoutePath(routePath)) {
    return;
  }

  writeCookie(lastRouteKey, routePath);
}

export function readListeningProgressPreference(progressKey: string): ListeningProgressPreference | null {
  if (!isSafeProgressKey(progressKey)) {
    return null;
  }

  return readListeningProgressMap()[progressKey] ?? null;
}

export function saveListeningProgressPreference(progressKey: string, wordIndex: number) {
  if (!isSafeProgressKey(progressKey) || !Number.isInteger(wordIndex) || wordIndex < 0) {
    return;
  }

  const progress = readListeningProgressMap();
  delete progress[progressKey];
  progress[progressKey] = {
    wordIndex,
    updatedAt: new Date().toISOString(),
  };

  writeCookie(listeningProgressKey, JSON.stringify(pruneListeningProgressMap(progress)));
}

function isWorkShift(value: string | null): value is WorkShift {
  return value !== null && validWorkShifts.has(value as WorkShift);
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value !== null && validThemes.has(value as ThemePreference);
}

function isSafeRoutePath(value: string | null): value is string {
  return value !== null && value.startsWith('/') && !value.startsWith('//') && !value.includes('://');
}

function isRestorableRoutePath(value: string | null): value is string {
  return isSafeRoutePath(value) && !restorableRouteDenyList.has(value);
}

function isSafeProgressKey(value: string): boolean {
  return value.trim().length > 0 && value.length <= 160 && /^[A-Za-z0-9_.:-]+$/.test(value);
}

function readListeningProgressMap(): Record<string, ListeningProgressPreference> {
  const value = readCookie(listeningProgressKey);

  if (!value) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, ListeningProgressPreference] =>
          isSafeProgressKey(entry[0]) && isListeningProgressPreference(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

function isListeningProgressPreference(value: unknown): value is ListeningProgressPreference {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    Number.isInteger((value as ListeningProgressPreference).wordIndex) &&
    (value as ListeningProgressPreference).wordIndex >= 0 &&
    typeof (value as ListeningProgressPreference).updatedAt === 'string'
  );
}

function pruneListeningProgressMap(
  progress: Record<string, ListeningProgressPreference>,
): Record<string, ListeningProgressPreference> {
  return Object.fromEntries(
    Object.entries(progress)
      .slice(-maxListeningProgressEntries),
  );
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    'path=/',
    `max-age=${cookieMaxAgeSeconds}`,
    'SameSite=Lax',
  ].join('; ');
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = [
    `${encodeURIComponent(name)}=`,
    'path=/',
    'max-age=0',
    'SameSite=Lax',
  ].join('; ');
}
