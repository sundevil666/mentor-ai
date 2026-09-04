import type { LearningMode } from '@mentor-ai/shared';

export type DashboardTrainingCategory = 'listening' | 'speaking';

type DashboardHomeNavigationActions = {
  leaveActiveLesson: () => Promise<void>;
  showHome: () => Promise<void>;
};

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
