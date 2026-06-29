import type { WorkShift } from '@mentor-ai/shared';

export type ThemePreference = 'dark' | 'light';

const cookieMaxAgeSeconds = 60 * 60 * 24 * 365;
const preferredWorkShiftKey = 'mentor_ai_preferred_work_shift';
const speechVoiceKey = 'mentor_ai_speech_voice';
const themeKey = 'mentor_ai_theme';
const lastRouteKey = 'mentor_ai_last_route';
const validWorkShifts = new Set<WorkShift>(['unknown', 'first', 'second', 'third', 'off']);
const validThemes = new Set<ThemePreference>(['dark', 'light']);
const restorableRouteDenyList = new Set(['/settings']);

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

export function saveLastRoutePreference(routePath: string) {
  if (!isRestorableRoutePath(routePath)) {
    return;
  }

  writeCookie(lastRouteKey, routePath);
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
