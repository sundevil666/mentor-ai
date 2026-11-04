import assert from 'node:assert/strict';
import test from 'node:test';
import type { LearningActivityEvent, StatisticsSnapshot } from '@mentor-ai/shared';
import { buildHomeMentorAdvice } from '../src/services/home-mentor-advice.js';

const now = new Date('2026-11-04T12:00:00Z');
const empty = { statistics: [], activity: [], engagement: [], movies: [] };
function snapshot(overrides: Partial<StatisticsSnapshot> = {}): StatisticsSnapshot {
  return { id: 's', studentId: 'u', sessionId: 's', lessonId: 'l', accuracy: .9, averageResponseTimeMs: 1000, attempts: 12, completedExercises: 10, audioReplays: 0, speechAttempts: 0, pronunciationIssueCount: 0, pronunciationFocus: [], fatigueSignal: { value: 0, confidence: 1 }, createdAt: now.toISOString(), ...overrides };
}
function activity(kind: LearningActivityEvent['kind'], activeSeconds: number): LearningActivityEvent {
  return { id: kind, studentId: 'u', kind, activeSeconds, contentId: 'daily-category-total', sourceDeviceId: 'd', startedAt: now.toISOString(), endedAt: now.toISOString() };
}
test('no invented observations when there is no recent evidence', () => {
  assert.deepEqual(buildHomeMentorAdvice(empty, now), []);
  assert.deepEqual(buildHomeMentorAdvice({ ...empty, statistics: [snapshot({ createdAt: '2026-09-01', pronunciationFocus: ['old'] })] }, now), []);
});
test('pronunciation uses recorded focus and aggregates words across lessons', () => {
  const advice = buildHomeMentorAdvice({ ...empty, statistics: [snapshot({ pronunciationFocus: ['Schedule', 'schedule'] }), snapshot({ id: 's2', pronunciationFocus: ['schedule', 'work'] })] }, now);
  assert.match(advice[0]!.text, /schedule, work/);
  assert.equal(advice.filter(item => item.id.startsWith('pronunciation')).length, 1);
});
test('weights accuracy by exercises rather than giving a tiny lesson equal influence', () => {
  const advice = buildHomeMentorAdvice({ ...empty, statistics: [snapshot({ completedExercises: 100, accuracy: .9 }), snapshot({ completedExercises: 1, accuracy: 0 })] }, now);
  assert.ok(advice.some(item => item.id === 'accuracy:strong'));
});
test('reading and listening suggest speech without claiming comprehension', () => {
  const advice = buildHomeMentorAdvice({ ...empty, activity: [activity('reading', 1200), activity('audio', 900)] }, now);
  assert.ok(advice.some(item => item.id === 'reading:habit'));
  assert.ok(advice.some(item => item.id === 'listening:habit'));
  assert.ok(advice.some(item => item.id === 'balance:speaking'));
  assert.ok(!advice.some(item => item.id.startsWith('pronunciation')));
  const balanced = buildHomeMentorAdvice({ ...empty, activity: [activity('reading', 1200), activity('speaking', 600)] }, now);
  assert.ok(!balanced.some(item => item.id === 'balance:speaking'));
});
test('advice stays bounded even with many signals', () => {
  const advice = buildHomeMentorAdvice({ ...empty, statistics: [snapshot({ pronunciationFocus: ['word'] })], activity: [activity('reading', 1200), activity('audio', 1200)], movies: [{ id: 'm', studentId: 'u', movieTitle: 'Film', watchedAt: now.toISOString(), report: '', sourceDeviceId: 'd', createdAt: now.toISOString(), updatedAt: now.toISOString() }] }, now);
  assert.ok(advice.length <= 6);
  assert.ok(advice.some(item => item.tone === 'positive'));
  assert.ok(advice.some(item => item.tone === 'focus'));
});
test('repeated book lookups become vocabulary advice rather than a pronunciation diagnosis', () => {
  const advice = buildHomeMentorAdvice({ ...empty, books: [{ version: 1, bookId: 'b', deviceId: 'd', revision: 1, startedAt: now.toISOString(), updatedAt: now.toISOString(), readWords: 100, wordLookups: 4, passageLookups: 0, pronunciationRequests: 0, speechPageWords: 0, speechMatchedWords: 0, words: [{ text: 'journey', translations: 4, pronunciations: 0 }], passages: [], unmatchedSpeechWords: [], examplesTruncated: false }] }, now);
  assert.match(advice.find(item => item.id.startsWith('vocabulary:'))!.text, /journey/);
  assert.ok(!advice.some(item => item.id.startsWith('pronunciation')));
});
test('a later clear rating replaces an earlier difficult rating for the same content', () => {
  const event = { studentId: 'u', category: 'lesson' as const, type: 'feedback-selected' as const, sourceDeviceId: 'd', createdAt: '2026-11-03T12:00:00Z' };
  const advice = buildHomeMentorAdvice({ ...empty, engagement: [{ ...event, id: '1', contentId: 'a', feedback: 'too-difficult' }, { ...event, id: '2', contentId: 'b', feedback: 'too-difficult' }, { ...event, id: '3', contentId: 'a', feedback: 'clear', createdAt: now.toISOString() }] }, now);
  assert.ok(!advice.some(item => item.id === 'difficulty:lighter'));
});
