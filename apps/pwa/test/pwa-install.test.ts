import assert from 'node:assert/strict';
import test from 'node:test';
import { getInstallHelp, isStandalonePwa } from '../src/services/pwa-install.js';

function navigatorWith(userAgent: string, platform = 'iPhone', maxTouchPoints = 5) {
  return { userAgent, platform, maxTouchPoints } as Navigator;
}

test('uses Add to Home Screen guidance for iPhone Safari', () => {
  const help = getInstallHelp(navigatorWith(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
  ));
  assert.equal(help, 'ios-safari');
});

test('asks iPhone Chrome users to open the site in Safari', () => {
  const help = getInstallHelp(navigatorWith(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/126.0 Mobile/15E148 Safari/604.1',
  ));
  assert.equal(help, 'ios-browser');
});

test('uses browser installation guidance on other devices', () => {
  assert.equal(getInstallHelp(navigatorWith('Mozilla/5.0 (Linux; Android 14) Chrome/126.0', 'Linux armv8l')), 'browser-menu');
});

test('detects browser and iOS standalone modes', () => {
  const standaloneWindow = { matchMedia: () => ({ matches: true }) } as unknown as Window;
  const browserWindow = { matchMedia: () => ({ matches: false }) } as unknown as Window;
  assert.equal(isStandalonePwa(standaloneWindow, navigatorWith('test')), true);
  assert.equal(isStandalonePwa(browserWindow, { ...navigatorWith('test'), standalone: true } as Navigator), true);
  assert.equal(isStandalonePwa(browserWindow, navigatorWith('test')), false);
});
