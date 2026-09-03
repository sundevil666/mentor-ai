import type { LearningMode } from '@mentor-ai/shared';

export type DashboardTrainingCategory = 'listening' | 'speaking';

export function resolveDashboardTrainingCategory(
  routeTraining: unknown,
  sessionMode?: LearningMode,
): DashboardTrainingCategory | undefined {
  if (routeTraining === 'listening' || routeTraining === 'speaking') return routeTraining;
  if (sessionMode === 'listening' || sessionMode === 'speaking') return sessionMode;
  return undefined;
}
