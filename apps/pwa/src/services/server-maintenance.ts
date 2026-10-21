export const serverMaintenanceIntervalMs = 24 * 60 * 60 * 1_000;

const storageKey = 'mentor-ai:server-maintenance:v1';
const activeMaintenance = new Map<string, Promise<boolean>>();

interface MaintenanceState {
  completedAt: string | null;
  attemptedAt?: string;
}

export function isServerMaintenanceDue(now = Date.now(), scope = ''): boolean {
  const state = readState(scope);
  const completedAt = state.attemptedAt ?? state.completedAt;
  if (!completedAt) return true;
  const completedTime = Date.parse(completedAt);
  return !Number.isFinite(completedTime) || now - completedTime >= serverMaintenanceIntervalMs;
}

export function runServerMaintenance(
  work: () => Promise<void>,
  options: { force?: boolean; now?: () => Date; scope?: string } = {},
): Promise<boolean> {
  const scope = options.scope ?? '';
  const active = activeMaintenance.get(scope);
  if (active) return active;
  const now = options.now ?? (() => new Date());
  if (!options.force && !isServerMaintenanceDue(now().getTime(), scope)) return Promise.resolve(false);

  const attemptedAt = now().toISOString();
  writeState({ ...readState(scope), attemptedAt }, scope);
  const operation = Promise.resolve().then(work)
    .then(() => {
      writeState({ completedAt: now().toISOString(), attemptedAt }, scope);
      return true;
    })
    .finally(() => { activeMaintenance.delete(scope); });
  activeMaintenance.set(scope, operation);
  return operation;
}

function readState(scope = ''): MaintenanceState {
  if (typeof localStorage === 'undefined') return { completedAt: null };
  try {
    const value = JSON.parse(localStorage.getItem(storageKey + scope) ?? 'null') as Partial<MaintenanceState> | null;
    return { attemptedAt: typeof value?.attemptedAt === 'string' ? value.attemptedAt : undefined, completedAt: typeof value?.completedAt === 'string' ? value.completedAt : null };
  } catch {
    return { completedAt: null };
  }
}

function writeState(state: MaintenanceState, scope = '') {
  if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey + scope, JSON.stringify(state));
}
