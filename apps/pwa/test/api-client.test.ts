import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { saveReadingTranscript, synchronizeContentProgress, synchronizeLearningEvidence, upsertSessionHandoff } from '../src/services/api-client.js';

describe('PWA API client', () => {
  beforeEach(() => {
    globalThis.fetch = async () => {
      throw new Error('Unexpected fetch call.');
    };
  });

  it('sends learning evidence envelopes to synchronization', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse({
        acknowledgements: [{ eventId: 'event-1', status: 'accepted' }],
        acceptedCount: 1,
        pendingAnalysis: false,
        student: { id: 'demo-student' },
        studentModel: { id: 'model-1', studentId: 'demo-student', version: 2 },
        studentModelVersion: 2,
        recommendation: { id: 'recommendation-1', studentId: 'demo-student' },
        recommendations: [],
        statisticsSnapshots: [],
      });
    };

    const result = await synchronizeLearningEvidence(
      [{ id: 'event-1', studentId: 'demo-student', sessionId: 'session-1', type: 'lesson-finished', occurredAt: '2026-06-28T08:00:00.000Z' }],
      [],
      [],
    );

    assert.equal(calls[0]?.url, 'http://localhost:4000/api/synchronization');
    assert.equal(calls[0]?.init?.method, 'POST');
    assert.equal(JSON.parse(String(calls[0]?.init?.body)).events[0].id, 'event-1');
    assert.equal(result.acceptedCount, 1);
  });

  it('uses PUT when publishing a session handoff', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const handoff = {
      id: 'handoff-demo-student-mobile',
      studentId: 'demo-student',
      sourceDevice: 'mobile',
      lesson: { id: 'lesson-1', exercises: [] },
      context: { mode: 'home', isOffline: false, speechAvailable: true, availableMinutes: 6 },
      currentExerciseIndex: 0,
      startedAt: '2026-06-28T08:00:00.000Z',
      exerciseStartedAt: '2026-06-28T08:00:00.000Z',
      events: [],
      results: [],
      speechResults: [],
      updatedAt: '2026-06-28T08:00:00.000Z',
    };

    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse(handoff);
    };

    const saved = await upsertSessionHandoff(handoff as never);

    assert.equal(calls[0]?.url, 'http://localhost:4000/api/session-handoffs');
    assert.equal(calls[0]?.init?.method, 'PUT');
    assert.equal(JSON.parse(String(calls[0]?.init?.body)).id, handoff.id);
    assert.equal(saved.id, handoff.id);
  });

  it('uploads recognized text without microphone audio', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const chunk = {
      id: 'reading-transcript-1', studentId: 'demo-student', bookId: 'book-1', pageIndex: 2,
      text: 'I am reading aloud.', capturedAt: '2026-08-29T12:00:00.000Z', recognitionEngine: 'device-whisper' as const,
    };
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse(chunk);
    };

    await saveReadingTranscript(chunk);

    assert.equal(calls[0]?.url, 'http://localhost:4000/api/reader/reading-transcripts');
    assert.equal(calls[0]?.init?.method, 'POST');
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), chunk);
    assert.equal(String(calls[0]?.init?.body).includes('audio'), false);
  });

  it('requests remote reading progress even when this device has no local progress', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const remoteProgress = {
      id: 'reading:book-1', studentId: 'demo-student', category: 'reading', contentId: 'book-1',
      position: 120, furthestPosition: 120, duration: 500, completed: false,
      sourceDeviceId: 'tablet', updatedAt: '2026-08-30T12:00:00.000Z',
    };
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse([remoteProgress]);
    };

    const result = await synchronizeContentProgress([]);

    assert.equal(calls[0]?.url, 'http://localhost:4000/api/synchronization');
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { progress: [] });
    assert.equal(result[0]?.furthestPosition, 120);
  });

  it('throws on failed synchronization responses', async () => {
    globalThis.fetch = async () => new Response('', { status: 500 });

    await assert.rejects(() => synchronizeLearningEvidence([], [], []), /Synchronization failed/);
  });
});

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
