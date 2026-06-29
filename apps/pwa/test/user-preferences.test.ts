import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  readPreferredWorkShift,
  readThemePreference,
  savePreferredWorkShift,
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
