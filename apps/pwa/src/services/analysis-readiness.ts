import type { ApplicationTelemetryEvent, ContentEngagementEvent } from '@mentor-ai/shared';

export interface AnalysisReadiness {
  ready: boolean;
  reason: 'not-enough-data' | 'volume' | 'monthly' | 'repeated-errors';
  learningEventCount: number;
  technicalEventCount: number;
  errorCount: number;
  daysCovered: number;
  progress: number;
}

export interface AnalysisFinding {
  area: 'learning' | 'application' | 'data-quality';
  title: string;
  detail: string;
}

const minimumLearningEvents = 20;
const minimumDays = 7;
const monthlyDays = 30;
const repeatedErrorThreshold = 3;

export function calculateAnalysisReadiness(
  learningEvents: ContentEngagementEvent[],
  technicalEvents: ApplicationTelemetryEvent[],
  now = new Date(),
): AnalysisReadiness {
  const timestamps = [
    ...learningEvents.map((event) => event.createdAt),
    ...technicalEvents.map((event) => event.occurredAt),
  ].map(Date.parse).filter(Number.isFinite);
  const firstTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : now.getTime();
  const daysCovered = Math.max(0, Math.floor((now.getTime() - firstTimestamp) / 86_400_000));
  const errors = technicalEvents.filter((event) => event.severity === 'error' || event.severity === 'critical');
  const repeatedErrors = new Map<string, number>();
  for (const event of errors) {
    const key = `${event.type}:${event.errorCode ?? 'unknown'}`;
    repeatedErrors.set(key, (repeatedErrors.get(key) ?? 0) + 1);
  }

  let reason: AnalysisReadiness['reason'] = 'not-enough-data';
  if ([...repeatedErrors.values()].some((count) => count >= repeatedErrorThreshold)) reason = 'repeated-errors';
  else if (daysCovered >= monthlyDays && learningEvents.length > 0) reason = 'monthly';
  else if (learningEvents.length >= minimumLearningEvents && daysCovered >= minimumDays) reason = 'volume';

  return {
    ready: reason !== 'not-enough-data',
    reason,
    learningEventCount: learningEvents.length,
    technicalEventCount: technicalEvents.length,
    errorCount: errors.length,
    daysCovered,
    progress: Math.min(1, Math.min(learningEvents.length / minimumLearningEvents, daysCovered / minimumDays)),
  };
}

export function buildAnalysisFindings(
  learningEvents: ContentEngagementEvent[],
  technicalEvents: ApplicationTelemetryEvent[],
): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];
  const starts = learningEvents.filter((event) => event.type === 'started').length;
  const finishes = learningEvents.filter((event) => event.type === 'finished').length;
  const errors = technicalEvents.filter((event) => event.severity === 'error' || event.severity === 'critical');
  const errorGroups = new Map<string, number>();
  for (const event of errors) {
    const key = event.errorCode ?? event.type;
    errorGroups.set(key, (errorGroups.get(key) ?? 0) + 1);
  }
  const repeatedError = [...errorGroups.entries()].sort((left, right) => right[1] - left[1])[0];

  if (starts >= 5 && finishes / starts < 0.6) {
    findings.push({
      area: 'learning',
      title: 'Many activities are not reaching completion',
      detail: 'Review activity length, instructions, recovery, and difficulty before treating this as a learner weakness.',
    });
  }
  if (repeatedError && repeatedError[1] >= repeatedErrorThreshold) {
    findings.push({
      area: 'application',
      title: 'A technical failure is repeating',
      detail: `${repeatedError[0]} was recorded ${repeatedError[1]} times. Investigate it before using affected sessions for learning decisions.`,
    });
  }
  if (learningEvents.length < minimumLearningEvents) {
    findings.push({
      area: 'data-quality',
      title: 'More learning evidence is needed',
      detail: `Collect ${minimumLearningEvents - learningEvents.length} more learning events before making broad optimizations.`,
    });
  }
  if (findings.length === 0) {
    findings.push({
      area: 'data-quality',
      title: 'No stable weakness detected yet',
      detail: 'Keep collecting evidence. The system will flag repeated failures or a meaningful completion drop.',
    });
  }
  return findings;
}
