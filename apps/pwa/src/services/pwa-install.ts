export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallHelp = 'ios-safari' | 'ios-browser' | 'browser-menu';

export function isStandalonePwa(windowValue: Window = window, navigatorValue: Navigator = navigator) {
  return windowValue.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigatorValue as Navigator & { standalone?: boolean }).standalone);
}

export function getInstallHelp(navigatorValue: Navigator = navigator): InstallHelp {
  const userAgent = navigatorValue.userAgent;
  const isAppleTouchDevice = /iPad|iPhone|iPod/.test(userAgent)
    || (navigatorValue.platform === 'MacIntel' && navigatorValue.maxTouchPoints > 1);

  if (!isAppleTouchDevice) {
    return 'browser-menu';
  }

  const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isSafari ? 'ios-safari' : 'ios-browser';
}
