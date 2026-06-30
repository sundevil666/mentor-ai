import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  clearLastRoutePreference,
  readListeningProgressPreference,
  readLastRoutePreference,
  readPreferredWorkShift,
  readSpeechVoicePreference,
  readThemePreference,
  saveListeningProgressPreference,
  saveLastRoutePreference,
  savePreferredWorkShift,
  saveSpeechVoicePreference,
  saveThemePreference,
} from '../src/services/user-preferences.js';

describe('PWA user preferences', () => {
  beforeEach(() => {
    installCookieJar();
  });

  it('persists the preferred work shift in cookies', () => {
    savePreferredWorkShift('third');

    assert.equal(readPreferredWorkShift(), 'third');
    assert.match(document.cookie, /mentor_ai_preferred_work_shift=third/);
  });

  it('ignores invalid preferred work shift cookies', () => {
    document.cookie = 'mentor_ai_preferred_work_shift=night; path=/';

    assert.equal(readPreferredWorkShift(), null);
  });

  it('persists the theme preference in cookies', () => {
    saveThemePreference('dark');

    assert.equal(readThemePreference(), 'dark');
    assert.match(document.cookie, /mentor_ai_theme=dark/);
  });

  it('persists the speech voice preference in cookies', () => {
    saveSpeechVoicePreference('com.apple.voice.compact.en-US.Samantha');

    assert.equal(readSpeechVoicePreference(), 'com.apple.voice.compact.en-US.Samantha');
    assert.match(document.cookie, /mentor_ai_speech_voice=com.apple.voice.compact.en-US.Samantha/);
  });

  it('persists the last opened restorable route in cookies', () => {
    saveLastRoutePreference('/lesson');

    assert.equal(readLastRoutePreference(), '/lesson');
    assert.match(document.cookie, /mentor_ai_last_route=%2Flesson/);
  });

  it('does not restore settings as the last opened route', () => {
    saveLastRoutePreference('/settings');

    assert.equal(readLastRoutePreference(), null);
    assert.doesNotMatch(document.cookie, /mentor_ai_last_route=%2Fsettings/);

    document.cookie = 'mentor_ai_last_route=%2Fsettings; path=/';

    assert.equal(readLastRoutePreference(), null);
  });

  it('clears the last opened route preference', () => {
    saveLastRoutePreference('/lesson');

    clearLastRoutePreference();

    assert.equal(readLastRoutePreference(), null);
    assert.doesNotMatch(document.cookie, /mentor_ai_last_route=%2Flesson/);
  });

  it('ignores unsafe last opened route cookies', () => {
    document.cookie = 'mentor_ai_last_route=https%3A%2F%2Fevil.example; path=/';

    assert.equal(readLastRoutePreference(), null);
  });

  it('persists listening progress per lesson exercise', () => {
    saveListeningProgressPreference('lesson-1:exercise-1', 42);
    saveListeningProgressPreference('lesson-2:exercise-1', 7);

    assert.equal(readListeningProgressPreference('lesson-1:exercise-1')?.wordIndex, 42);
    assert.equal(readListeningProgressPreference('lesson-2:exercise-1')?.wordIndex, 7);
    assert.match(document.cookie, /mentor_ai_listening_progress=/);
  });

  it('ignores invalid listening progress cookies and keys', () => {
    document.cookie = 'mentor_ai_listening_progress=%7Bbad-json; path=/';

    assert.equal(readListeningProgressPreference('lesson-1:exercise-1'), null);

    saveListeningProgressPreference('../lesson', 10);
    saveListeningProgressPreference('lesson-1:exercise-1', -1);

    assert.equal(readListeningProgressPreference('../lesson'), null);
    assert.equal(readListeningProgressPreference('lesson-1:exercise-1'), null);
  });

  it('keeps the newest listening progress entries', () => {
    for (let index = 0; index < 105; index += 1) {
      saveListeningProgressPreference(`lesson-${index}:exercise-1`, index);
    }

    assert.equal(readListeningProgressPreference('lesson-0:exercise-1'), null);
    assert.equal(readListeningProgressPreference('lesson-104:exercise-1')?.wordIndex, 104);
  });
});

function installCookieJar() {
  const values = new Map<string, string>();

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      get cookie() {
        return Array.from(values.entries())
          .map(([key, value]) => `${key}=${value}`)
          .join('; ');
      },
      set cookie(cookie: string) {
        const [pair] = cookie.split(';');
        const separatorIndex = pair.indexOf('=');

        if (separatorIndex === -1) {
          return;
        }

        values.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1));
      },
    },
  });
}
