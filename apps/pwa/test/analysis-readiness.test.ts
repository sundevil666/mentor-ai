import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ApplicationTelemetryEvent, ContentEngagementEvent } from '@mentor-ai/shared';
import { buildAnalysisFindings, calculateAnalysisReadiness } from '../src/services/analysis-readiness.js';

const now = new Date('2026-08-30T12:00:00.000Z');

function learningEvent(index: number, type: ContentEngagementEvent['type'] = 'started'): ContentEngagementEvent {
  return {
    id: `learning-${index}`,
    studentId: 'student-1',
    category: 'lesson',
    contentId: `lesson-${index}`,
    type,
    sourceDeviceId: 'device-1',
    createdAt: '2026-08-20T12:00:00.000Z',
  };
}

function errorEvent(index: number): ApplicationTelemetryEvent {
  return {
    id: `error-${index}`,
    studentId: 'student-1',
    sessionId: 'session-1',
    sourceDeviceId: 'device-1',
    type: 'runtime-error',
    severity: 'error',
    errorCode: 'MediaError',
    appVersion: 'test',
    occurredAt: '2026-08-30T10:00:00.000Z',
  };
}

describe('analysis readiness', () => {
  it('waits for enough learning evidence and time coverage', () => {
    const result = calculateAnalysisReadiness([learningEvent(1)], [], now);
    assert.equal(result.ready, false);
    assert.equal(result.reason, 'not-enough-data');
  });

  it('becomes ready after enough evidence across seven days', () => {
    const events = Array.from({ length: 20 }, (_, index) => learningEvent(index));
    const result = calculateAnalysisReadiness(events, [], now);
    assert.equal(result.ready, true);
    assert.equal(result.reason, 'volume');
  });

  it('raises repeated application errors without blaming learning', () => {
    const errors = [errorEvent(1), errorEvent(2), errorEvent(3)];
    const result = calculateAnalysisReadiness([], errors, now);
    const findings = buildAnalysisFindings([], errors);
    assert.equal(result.reason, 'repeated-errors');
    assert.equal(findings.some((finding) => finding.area === 'application'), true);
    assert.equal(findings.some((finding) => finding.area === 'data-quality'), true);
  });

  it('flags low completion as a product question', () => {
    const events = Array.from({ length: 6 }, (_, index) => learningEvent(index));
    events.push(learningEvent(10, 'finished'));
    const findings = buildAnalysisFindings(events, []);
    assert.equal(findings.some((finding) => finding.area === 'learning'), true);
  });
});
