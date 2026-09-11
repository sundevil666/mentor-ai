export const serverMaintenanceIntervalMs = 24 * 60 * 60 * 1_000;

const storageKey = 'mentor-ai:server-maintenance:v1';
let activeMaintenance: Promise<boolean> | null = null;

interface MaintenanceState {
  completedAt: string | null;
}

export function isServerMaintenanceDue(now = Date.now()): boolean {
  const completedAt = readState().completedAt;
  if (!completedAt) return true;
  const completedTime = Date.parse(completedAt);
  return !Number.isFinite(completedTime) || now - completedTime >= serverMaintenanceIntervalMs;
}

export function runServerMaintenance(
  work: () => Promise<void>,
  options: { force?: boolean; now?: () => Date } = {},
): Promise<boolean> {
  if (activeMaintenance) return activeMaintenance;
  const now = options.now ?? (() => new Date());
  if (!options.force && !isServerMaintenanceDue(now().getTime())) return Promise.resolve(false);

  activeMaintenance = work()
    .then(() => {
      writeState({ completedAt: now().toISOString() });
      return true;
    })
    .finally(() => { activeMaintenance = null; });
  return activeMaintenance;
}

function readState(): MaintenanceState {
  if (typeof localStorage === 'undefined') return { completedAt: null };
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as Partial<MaintenanceState> | null;
    return { completedAt: typeof value?.completedAt === 'string' ? value.completedAt : null };
  } catch {
    return { completedAt: null };
  }
}

function writeState(state: MaintenanceState) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(state));
}
