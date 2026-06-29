import type { UpdateNotification } from 'src/stores/app-store';

export interface AppUpdateManifest {
  version: string;
  releasedAt?: string;
  updateUrl?: string;
  notes?: string[];
}

export interface AppUpdateCheckResult {
  manifest: AppUpdateManifest;
  notification: UpdateNotification | null;
}

const manifestUrl = process.env.APP_UPDATE_MANIFEST_URL ?? '/app-update.json';
const currentVersion = process.env.APP_VERSION ?? '0.1.0';
const checkIntervalMs = Number(process.env.APP_UPDATE_CHECK_INTERVAL_MS ?? 15 * 60 * 1000);

let intervalId: number | undefined;
let inFlightCheck: Promise<AppUpdateCheckResult | null> | null = null;
const notifiedVersions = new Set<string>();

export function startAppUpdatePolling(onUpdate: (result: AppUpdateCheckResult) => void | Promise<void>) {
  void checkForAppUpdate().then((result) => {
    if (result?.notification) {
      void onUpdate(result);
    }
  });

  intervalId = window.setInterval(() => {
    void checkForAppUpdate().then((result) => {
      if (result?.notification) {
        void onUpdate(result);
      }
    });
  }, checkIntervalMs);

  const checkWhenActive = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      void checkForAppUpdate().then((result) => {
        if (result?.notification) {
          void onUpdate(result);
        }
      });
    }
  };

  document.addEventListener('visibilitychange', checkWhenActive);
  window.addEventListener('online', checkWhenActive);

  return () => {
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = undefined;
    }

    document.removeEventListener('visibilitychange', checkWhenActive);
    window.removeEventListener('online', checkWhenActive);
  };
}

export async function checkForAppUpdate(): Promise<AppUpdateCheckResult | null> {
  if (inFlightCheck) {
    return inFlightCheck;
  }

  inFlightCheck = fetchAppUpdateManifest()
    .then(async (manifest) => {
      if (!manifest || !isNewVersion(manifest.version)) {
        return null;
      }

      if (notifiedVersions.has(manifest.version)) {
        return { manifest, notification: null };
      }

      notifiedVersions.add(manifest.version);
      await navigator.serviceWorker?.getRegistration().then((registration) => registration?.update());

      return {
        manifest,
        notification: {
          id: `update-${manifest.version}`,
          version: manifest.version,
          title: 'App update available',
          message: createUpdateAvailableMessage(manifest),
          createdAt: new Date().toISOString(),
          viewedAt: null,
          readAt: null,
        },
      };
    })
    .catch(() => null)
    .finally(() => {
      inFlightCheck = null;
    });

  return inFlightCheck;
}

export async function activatePendingServiceWorkerUpdate(timeoutMs = 8000): Promise<'controllerchange' | 'timeout' | 'unsupported'> {
  if (!('serviceWorker' in navigator)) {
    return 'unsupported';
  }

  const registration = await navigator.serviceWorker.getRegistration();

  if (!registration) {
    return 'unsupported';
  }

  await registration.update();

  if (!navigator.serviceWorker.controller) {
    return 'unsupported';
  }

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      resolve('timeout');
    }, timeoutMs);

    const handleControllerChange = () => {
      window.clearTimeout(timeoutId);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      resolve('controllerchange');
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, { once: true });
  });
}

export async function showSystemUpdateNotification(notification: UpdateNotification) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const registration = await navigator.serviceWorker?.getRegistration();

  if (registration) {
    await registration.showNotification(notification.title, {
      body: notification.message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: notification.id,
    });
    return;
  }

  new Notification(notification.title, {
    body: notification.message,
    icon: '/icons/icon-192x192.png',
    tag: notification.id,
  });
}

async function fetchAppUpdateManifest(): Promise<AppUpdateManifest | null> {
  const response = await fetch(`${manifestUrl}?t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const manifest = (await response.json()) as Partial<AppUpdateManifest>;

  if (typeof manifest.version !== 'string' || manifest.version.trim().length === 0) {
    return null;
  }

  return {
    version: manifest.version.trim(),
    releasedAt: manifest.releasedAt,
    updateUrl: manifest.updateUrl,
    notes: Array.isArray(manifest.notes) ? manifest.notes.filter((note): note is string => typeof note === 'string') : [],
  };
}

function isNewVersion(version: string): boolean {
  return version !== currentVersion;
}

function createUpdateAvailableMessage(manifest: AppUpdateManifest): string {
  const releasedAt = manifest.releasedAt ? ` Released ${formatDate(manifest.releasedAt)}.` : '';
  const firstNote = manifest.notes?.[0] ? ` ${manifest.notes[0]}` : '';

  return `Mentor AI ${manifest.version} is ready to install.${releasedAt}${firstNote}`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
