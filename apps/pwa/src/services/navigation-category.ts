import type { LearningMode } from '@mentor-ai/shared';

export type DashboardTrainingCategory = 'listening' | 'speaking';

type DashboardHomeNavigationActions = {
  leaveActiveLesson: () => Promise<void>;
  showHome: () => Promise<void>;
};

type ReplaceDashboardTraining = (training: DashboardTrainingCategory) => Promise<void>;

export function resolveDashboardTrainingCategory(
  routeTraining: unknown,
  sessionMode?: LearningMode,
): DashboardTrainingCategory | undefined {
  if (routeTraining === 'listening' || routeTraining === 'speaking') return routeTraining;
  if (sessionMode === 'listening' || sessionMode === 'speaking') return sessionMode;
  return undefined;
}

export async function openDashboardHome(
  hasActiveLesson: boolean,
  actions: DashboardHomeNavigationActions,
) {
  if (hasActiveLesson) {
    await actions.leaveActiveLesson();
  }

  await actions.showHome();
}

export async function synchronizeDashboardLessonRoute(
  sessionMode: LearningMode | undefined,
  routeTraining: unknown,
  replaceTraining: ReplaceDashboardTraining,
) {
  const training = sessionMode === 'listening' || sessionMode === 'speaking'
    ? sessionMode
    : undefined;

  if (!training) return undefined;
  if (routeTraining !== training) await replaceTraining(training);
  return training;
}
