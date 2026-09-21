import type { Exercise, LocalEvaluationRule } from '@mentor-ai/shared';

function normalizeAnswer(value: string): string {
  return (value.toLocaleLowerCase('en').match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)?/gu) ?? []).join(' ');
}

export function requiresExactLessonAnswer(exercise: Exercise, rules: LocalEvaluationRule[]): boolean {
  return Boolean(exercise.expectedResponse?.trim()
    || rules.some((rule) => rule.exerciseId === exercise.id && rule.acceptedResponses.some((response) => response.trim())));
}

export function isLessonAnswerReady(exercise: Exercise, answer: string, rules: LocalEvaluationRule[]): boolean {
  const normalized = normalizeAnswer(answer);
  if (!normalized) return false;
  const accepted = [
    exercise.expectedResponse,
    ...rules.filter((rule) => rule.exerciseId === exercise.id).flatMap((rule) => rule.acceptedResponses),
  ].filter((response): response is string => Boolean(response?.trim()));
  if (!accepted.length) return true;
  return accepted.some((response) => normalizeAnswer(response) === normalized);
}
