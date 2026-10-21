import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GeneratedLesson } from '@mentor-ai/shared';
import { getAudioContentVersion } from '../src/services/audio-library.js';
import { getStoryContentVersion } from '../src/services/story-library.js';
import {
  getRecentOfflineLessonSince,
  fetchNewLessonCatalog,
  prioritizeNewLessons,
  selectPendingAudioDownloads,
  selectPendingBulkLessonDownloads,
  selectPendingStoryDownloads,
} from '../src/services/offline-lesson-updates.js';

function lesson(id: string, priority: number, doFirst = false, createdAt = '2026-09-12T10:00:00.000Z') {
  return { id, priority, doFirst, createdAt } as GeneratedLesson;
}

describe('new lesson catalog priority', () => {
  it('keeps the do-first lesson above higher numeric priorities', () => {
    const sorted = prioritizeNewLessons([
      lesson('medium', 50),
      lesson('highest-number', 999),
      lesson('required', 1, true),
    ]);
    assert.deepEqual(sorted.map(({ id }) => id), ['required', 'highest-number', 'medium']);
  });

  it('orders remaining lessons by priority and then recency', () => {
    const sorted = prioritizeNewLessons([
      lesson('older', 80, false, '2026-09-10T10:00:00.000Z'),
      lesson('lower', 70, false, '2026-09-12T10:00:00.000Z'),
      lesson('newer', 80, false, '2026-09-11T10:00:00.000Z'),
    ]);
    assert.deepEqual(sorted.map(({ id }) => id), ['newer', 'older', 'lower']);
  });

  it('selects only unfinished lessons that are not already available offline', () => {
    const lessons = [
      { ...lesson('fresh', 90), lessonTemplateKey: 'fresh-template' },
      { ...lesson('downloaded', 80), lessonTemplateKey: 'downloaded-template' },
      { ...lesson('completed-id', 70), lessonTemplateKey: 'completed-id-template' },
      { ...lesson('completed-template', 60), lessonTemplateKey: 'completed-template-key' },
    ];

    const pending = selectPendingBulkLessonDownloads(
      lessons,
      new Set(['downloaded']),
      new Set(['completed-id', 'completed-template-key']),
    );

    assert.deepEqual(pending.map(({ id }) => id), ['fresh']);
  });

  it('keeps the update window at 30 days without limiting the full bulk-download catalog', () => {
    assert.equal(
      getRecentOfflineLessonSince(Date.parse('2026-10-09T12:00:00.000Z')),
      '2026-09-09T12:00:00.000Z',
    );
  });

  it('includes a new audio story until its current version is cached and registered', () => {
    const story = {
      id: 'new-story', sourceUrl: '/new-story.mp3', durationSeconds: 60, sizeBytes: 1_000, reader: 'Reader',
    } as Parameters<typeof selectPendingStoryDownloads>[0][number];
    const version = new Map<string, string | undefined>([[story.id, undefined]]);
    assert.deepEqual(selectPendingStoryDownloads([story], new Set(), version, 'https://app.test').map(({ id }) => id), ['new-story']);
    version.set(story.id, getStoryContentVersion(story));
    assert.deepEqual(selectPendingStoryDownloads([story], new Set(['https://app.test/new-story.mp3']), version, 'https://app.test'), []);
  });

  it('includes a new audio program until its current version is cached and registered', () => {
    const audio = {
      id: 'new-audio', sourceUrl: 'https://audio.test/new.mp3', durationSeconds: 60, sizeBytes: 1_000, publishedAt: '2026-10-09',
    } as Parameters<typeof selectPendingAudioDownloads>[0][number];
    const version = new Map<string, string | undefined>([[audio.id, undefined]]);
    assert.deepEqual(selectPendingAudioDownloads([audio], new Set(), version).map(({ id }) => id), ['new-audio']);
    version.set(audio.id, getAudioContentVersion(audio));
    assert.deepEqual(selectPendingAudioDownloads([audio], new Set([audio.sourceUrl]), version), []);
  });

  it('never offers completed audio for bulk download again', () => {
    const audio = {
      id: 'completed-audio', sourceUrl: 'https://audio.test/completed.mp3', durationSeconds: 60, sizeBytes: 1_000, publishedAt: '2026-10-09',
    } as Parameters<typeof selectPendingAudioDownloads>[0][number];
    assert.deepEqual(selectPendingAudioDownloads([audio], new Set(), new Map(), new Set([audio.id])), []);
  });
});

it('keeps locally imported lessons eligible for bulk download while the cloud is unavailable', async () => {
  const imported = { ...lesson('local-import', 90), lessonTemplateKey: 'local-import-template' };
  const catalog = await fetchNewLessonCatalog(async () => { throw new Error('quota'); }, async () => [imported]);
  assert.deepEqual(selectPendingBulkLessonDownloads(catalog, new Set(), new Set()).map((item) => item.id), ['local-import']);
  assert.deepEqual(selectPendingBulkLessonDownloads(catalog, new Set(['local-import']), new Set()), []);
  assert.deepEqual(selectPendingBulkLessonDownloads(catalog, new Set(), new Set(['local-import-template'])), []);
});
it('merges cloud and local catalogs without duplicating IDs, preferring the fresh cloud copy', async () => {
  const local = lesson('same-id', 1);
  const remote = lesson('same-id', 90);
  const catalog = await fetchNewLessonCatalog(async () => [remote], async () => [local, lesson('local-only', 2)]);
  assert.equal(catalog.length, 2);
  assert.equal(catalog.find((item) => item.id === 'same-id')?.priority, 90);
});
