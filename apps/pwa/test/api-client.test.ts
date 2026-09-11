import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { fetchLearningActivityTotals, fetchReaderTextLookup, fetchReadingResumeSnapshot, fetchTranslationUsage, saveReadingTranscripts, synchronizeContentProgress, synchronizeLearningActivity, synchronizeLearningEvidence, synchronizeStatisticsSnapshots, upsertSessionHandoff } from '../src/services/api-client.js';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('PWA API client', () => {
  beforeEach(() => {
    globalThis.localStorage = new MemoryStorage();
    globalThis.fetch = async () => {
      throw new Error('Unexpected fetch call.');
    };
  });

  it('counts translations locally and synchronizes one absolute snapshot per day', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/api/reader/lookup')) {
        return jsonResponse({ text: 'hello', translation: 'привет', sourceLanguage: 'en', targetLanguage: 'ru' });
      }
      return jsonResponse({
        period: new Date().toISOString().slice(0, 7), usedCharacters: 5, limitCharacters: 450_000,
        remainingCharacters: 449_995, percentUsed: 0, configured: true, exhausted: false,
      });
    };

    await fetchReaderTextLookup('hello');
    const firstUsage = await fetchTranslationUsage();
    const secondUsage = await fetchTranslationUsage();

    assert.equal(firstUsage.usedCharacters, 5);
    assert.equal(secondUsage.usedCharacters, 5);
    assert.equal(calls.filter((call) => call.url.endsWith('/api/reader/usage')).length, 1);
    const snapshot = calls.find((call) => call.url.endsWith('/api/reader/usage'))!;
    assert.equal(snapshot.init?.method, 'POST');
    assert.equal(JSON.parse(String(snapshot.init?.body)).usedCharacters, 5);
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

  it('synchronizes active-time chunks and receives account totals', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse({ acknowledgedIds: ['activity-1'], totals: { listeningSeconds: 60, readingSeconds: 0, speakingSeconds: 0, totalSeconds: 60, updatedAt: '2026-09-04T08:01:00.000Z' } });
    };
    const result = await synchronizeLearningActivity([{
      id: 'activity-1', studentId: 'demo-student', kind: 'listening', contentId: 'audio-1', activeSeconds: 60,
      sourceDeviceId: 'phone', startedAt: '2026-09-04T08:00:00.000Z', endedAt: '2026-09-04T08:01:00.000Z',
    }]);
    assert.equal(calls[0]?.url, 'http://localhost:4000/api/synchronization');
    assert.equal(result.totals.listeningSeconds, 60);
  });

  it('refreshes account activity totals without posting an empty synchronization batch', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse({ listeningSeconds: 60, readingSeconds: 120, speakingSeconds: 30, totalSeconds: 210, updatedAt: '2026-09-11T08:01:00.000Z' });
    };

    const result = await fetchLearningActivityTotals();

    assert.equal(calls[0]?.url, 'http://localhost:4000/api/learning-activity-totals');
    assert.equal(calls[0]?.init?.method, undefined);
    assert.equal(result.totalSeconds, 210);
  });

  it('uploads local statistics so an existing device can seed shared storage', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse([]);
    };
    await synchronizeStatisticsSnapshots([]);
    assert.equal(calls[0]?.url, 'http://localhost:4000/api/synchronization');
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { statisticsSnapshots: [] });
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
      return jsonResponse([chunk]);
    };

    await saveReadingTranscripts([chunk]);

    assert.equal(calls[0]?.url, 'http://localhost:4000/api/reader/reading-transcripts');
    assert.equal(calls[0]?.init?.method, 'POST');
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { chunks: [chunk] });
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
    assert.equal(calls[0]?.init?.keepalive, true);
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { progress: [] });
    assert.equal(result[0]?.furthestPosition, 120);
  });

  it('throws on failed synchronization responses', async () => {
    globalThis.fetch = async () => new Response('', { status: 500 });

    await assert.rejects(() => synchronizeLearningEvidence([], [], []), /Synchronization failed/);
  });

  it('loads the reading resume snapshot as JSON', async () => {
    globalThis.fetch = async () => jsonResponse({ devices: [], serverTime: '2026-09-10T12:00:00.000Z' });
    const snapshot = await fetchReadingResumeSnapshot('book-1');
    assert.equal(snapshot.serverTime, '2026-09-10T12:00:00.000Z');
  });

  it('reports an unavailable reader sync endpoint instead of exposing an HTML parse error', async () => {
    globalThis.fetch = async () => new Response('<!doctype html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    await assert.rejects(() => fetchReadingResumeSnapshot('book-1'), /temporarily unavailable/);
  });
});

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
