export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthSession {
  id?: string;
  user: AuthUser;
  sessionToken: string;
}

interface AuthConfiguration {
  googleClientId: string | null;
  googleSignInRequired: boolean;
}

const sessionStorageKey = 'mentor-ai-auth-session';
const configurationStorageKey = 'mentor-ai:auth-configuration:v1';
const configurationCacheMs = 24 * 60 * 60 * 1_000;
const apiBaseUrl =
  process.env.API_BASE_URL ??
  (process.env.DEV || typeof window === 'undefined' ? 'http://localhost:4000' : '');

export function readAuthSession(): AuthSession | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const rawSession = localStorage.getItem(sessionStorageKey);

  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession) as AuthSession;
    return isAuthSession(session) ? session : null;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const storedSession = { ...session, id: 'current' };
  localStorage.setItem(sessionStorageKey, JSON.stringify(storedSession));
  void import('./indexed-db.js').then(({ mentorDb }) => mentorDb.then((db) => db.put('auth-sessions', storedSession)));
}

export function clearAuthSession() {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(sessionStorageKey);
  void import('./indexed-db.js').then(({ mentorDb }) => mentorDb.then((db) => db.delete('auth-sessions', 'current')));
}

export function getAuthToken(): string | null {
  return readAuthSession()?.sessionToken ?? null;
}

export async function fetchAuthConfiguration(): Promise<AuthConfiguration> {
  const cached = readAuthConfigurationCache();
  if (cached && Date.now() - cached.cachedAt < configurationCacheMs) return cached.configuration;
  const response = await fetch(`${apiBaseUrl}/api/auth/configuration`);

  if (!response.ok) {
    throw new Error('Auth configuration request failed.');
  }

  const body = (await response.json()) as { data: AuthConfiguration };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(configurationStorageKey, JSON.stringify({ configuration: body.data, cachedAt: Date.now() }));
  }
  return body.data;
}

function readAuthConfigurationCache(): { configuration: AuthConfiguration; cachedAt: number } | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const value = JSON.parse(localStorage.getItem(configurationStorageKey) ?? 'null') as {
      configuration?: AuthConfiguration;
      cachedAt?: number;
    } | null;
    if (!value?.configuration || !Number.isFinite(value.cachedAt)) return null;
    return { configuration: value.configuration, cachedAt: value.cachedAt! };
  } catch {
    return null;
  }
}

export async function signInWithGoogleCredential(credential: string): Promise<AuthSession> {
  const response = await fetch(`${apiBaseUrl}/api/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential }),
  });

  if (!response.ok) {
    throw new Error('Google sign-in failed.');
  }

  const body = (await response.json()) as { data: AuthSession };
  saveAuthSession(body.data);
  return body.data;
}

function isAuthSession(value: AuthSession): value is AuthSession {
  return (
    Boolean(value) &&
    typeof value.sessionToken === 'string' &&
    Boolean(value.user) &&
    typeof value.user.id === 'string' &&
    typeof value.user.email === 'string'
  );
}
