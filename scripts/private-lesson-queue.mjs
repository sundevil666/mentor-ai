import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const syncIntervalMs = 24 * 60 * 60 * 1_000;
export const warningAgeMs = 30 * 24 * 60 * 60 * 1_000;
export const criticalAgeMs = 60 * 24 * 60 * 60 * 1_000;

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultLibraryPath = resolve(repositoryRoot, '.ai/private/lessons/lesson-library.json');
const defaultStatePath = resolve(repositoryRoot, '.ai/private/lessons/lesson-sync-state.json');
const defaultTokenPath = resolve(repositoryRoot, '.ai/private/lesson-import-token');
const defaultApiUrl = 'https://mentor-ai-blush.vercel.app/api/lessons/private/import';

export function fingerprintLesson(lesson) {
  return createHash('sha256').update(stableJson(lesson)).digest('hex');
}

export function collectPendingLessons(library, state, now = new Date()) {
  const activeIds = new Set(library.lessons.map((lesson) => lesson.id));
  const pendingSince = Object.fromEntries(
    Object.entries(state.pendingSince ?? {}).filter(([id]) => activeIds.has(id)),
  );
  const pending = [];

  for (const lesson of library.lessons) {
    const fingerprint = fingerprintLesson(lesson);
    if (state.syncedFingerprints?.[lesson.id] === fingerprint) continue;
    pendingSince[lesson.id] ??= now.toISOString();
    pending.push({ lesson, fingerprint, pendingSince: pendingSince[lesson.id] });
  }

  return { pending, pendingSince };
}

export function describeQueue(library, state, now = new Date()) {
  const { pending, pendingSince } = collectPendingLessons(library, state, now);
  const pendingDates = pending.map((item) => Date.parse(item.pendingSince)).filter(Number.isFinite);
  const oldestPendingAt = pendingDates.length ? new Date(Math.min(...pendingDates)).toISOString() : null;
  const pendingAgeMs = oldestPendingAt ? Math.max(0, now.getTime() - Date.parse(oldestPendingAt)) : 0;
  const severity = pending.length === 0 ? 'ok' : pendingAgeMs >= criticalAgeMs ? 'critical' : pendingAgeMs >= warningAgeMs ? 'warning' : 'pending';

  return {
    severity,
    lessonCount: library.lessons.length,
    pendingCount: pending.length,
    oldestPendingAt,
    pendingAgeDays: Math.floor(pendingAgeMs / 86_400_000),
    lastAttemptAt: state.lastAttemptAt ?? null,
    lastSuccessfulSyncAt: state.lastSuccessfulSyncAt ?? null,
    lastError: state.lastError ?? null,
    pendingSince,
  };
}

export async function synchronizeLessonQueue(options = {}) {
  const now = options.now?.() ?? new Date();
  const libraryPath = options.libraryPath ?? defaultLibraryPath;
  const statePath = options.statePath ?? defaultStatePath;
  const tokenPath = options.tokenPath ?? defaultTokenPath;
  const apiUrl = options.apiUrl ?? process.env.MENTOR_AI_LESSON_IMPORT_URL ?? defaultApiUrl;
  const fetchImpl = options.fetchImpl ?? fetch;
  const library = await readLibrary(libraryPath);
  const state = await readState(statePath);
  const before = describeQueue(library, state, now);

  if (before.pendingCount === 0) {
    state.pendingSince = before.pendingSince;
    await writeJsonAtomic(statePath, state);
    return { attempted: false, reason: 'empty', ...before };
  }

  const lastAttemptTime = Date.parse(state.lastAttemptAt ?? '');
  if (!options.force && Number.isFinite(lastAttemptTime) && now.getTime() - lastAttemptTime < syncIntervalMs) {
    state.pendingSince = before.pendingSince;
    await writeJsonAtomic(statePath, state);
    return { attempted: false, reason: 'not-due', ...before };
  }

  state.lastAttemptAt = now.toISOString();
  state.pendingSince = before.pendingSince;
  await writeJsonAtomic(statePath, state);

  try {
    const token = (process.env.LESSON_IMPORT_TOKEN ?? await readFile(tokenPath, 'utf8')).trim();
    if (!token) throw new Error('LESSON_IMPORT_TOKEN is empty.');
    const { pending } = collectPendingLessons(library, state, now);
    const response = await fetchImpl(apiUrl, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ lessons: pending.map((item) => item.lesson) }),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Lesson import failed with HTTP ${response.status}${safeServerMessage(body)}`);

    state.syncedFingerprints ??= {};
    for (const item of pending) {
      state.syncedFingerprints[item.lesson.id] = item.fingerprint;
      delete state.pendingSince[item.lesson.id];
    }
    state.lastSuccessfulSyncAt = now.toISOString();
    state.lastError = null;
    await writeJsonAtomic(statePath, state);
    return { attempted: true, reason: 'synchronized', importedCount: pending.length, ...describeQueue(library, state, now) };
  } catch (error) {
    state.lastError = error instanceof Error ? error.message : String(error);
    await writeJsonAtomic(statePath, state);
    return { attempted: true, reason: 'failed', ...describeQueue(library, state, now) };
  }
}

export async function readLibrary(path = defaultLibraryPath) {
  const value = await readJson(path, { version: 1, updatedAt: null, lessons: [] });
  if (value?.version !== 1 || !Array.isArray(value.lessons)) throw new Error(`Invalid lesson library: ${path}`);
  const ids = new Set();
  for (const lesson of value.lessons) {
    if (!lesson || typeof lesson.id !== 'string' || !lesson.id || !Array.isArray(lesson.exercises)) {
      throw new Error(`Every queued lesson must have an id and exercises array: ${path}`);
    }
    if (ids.has(lesson.id)) throw new Error(`Duplicate lesson id: ${lesson.id}`);
    ids.add(lesson.id);
  }
  return value;
}

export async function readState(path = defaultStatePath) {
  const value = await readJson(path, {});
  return {
    version: 1,
    lastAttemptAt: typeof value.lastAttemptAt === 'string' ? value.lastAttemptAt : null,
    lastSuccessfulSyncAt: typeof value.lastSuccessfulSyncAt === 'string' ? value.lastSuccessfulSyncAt : null,
    lastError: typeof value.lastError === 'string' ? value.lastError : null,
    pendingSince: isRecord(value.pendingSince) ? value.pendingSince : {},
    syncedFingerprints: isRecord(value.syncedFingerprints) ? value.syncedFingerprints : {},
  };
}

async function runCli() {
  const command = process.argv[2] ?? 'status';
  if (!['status', 'sync'].includes(command)) throw new Error('Usage: private-lesson-queue.mjs [status|sync] [--force] [--json]');
  const library = await readLibrary();
  const state = await readState();
  const result = command === 'sync'
    ? await synchronizeLessonQueue({ force: process.argv.includes('--force') })
    : describeQueue(library, state);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result));
  } else {
    printStatus(result);
  }
  if (result.severity === 'critical') process.exitCode = 2;
  else if (result.severity === 'warning') process.exitCode = 1;
}

function printStatus(result) {
  console.log(`Lesson queue: ${result.pendingCount} pending of ${result.lessonCount}; status=${result.severity}.`);
  if (result.reason === 'synchronized') console.log(`Synchronized ${result.importedCount} lesson(s).`);
  if (result.reason === 'failed') console.log(`Database synchronization failed; lessons remain queued. ${result.lastError}`);
  if (result.reason === 'not-due') console.log('Daily synchronization is not due yet.');
  if (result.oldestPendingAt) console.log(`Oldest pending lesson: ${result.oldestPendingAt} (${result.pendingAgeDays} day(s)).`);
  if (result.lastSuccessfulSyncAt) console.log(`Last successful synchronization: ${result.lastSuccessfulSyncAt}.`);
  if (result.severity === 'warning') console.log('WARNING: lessons have been waiting for at least 30 days. Check database access and quota.');
  if (result.severity === 'critical') console.log('CRITICAL: lessons have been waiting for at least 60 days. Intervention is required.');
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, path);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function safeServerMessage(body) {
  try {
    const parsed = JSON.parse(body);
    const message = parsed?.data?.message ?? parsed?.message;
    return typeof message === 'string' ? `: ${message}` : '';
  } catch {
    return '';
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
